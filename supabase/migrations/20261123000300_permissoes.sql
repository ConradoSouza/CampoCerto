-- Campo Certo: permissões por linha (RLS).
-- Uma permissão é um perfil aplicado a um escopo (grupo, empresa ou fazenda).
-- Cada pessoa só enxerga as fazendas cobertas pelos seus escopos.

-- ---------------------------------------------------------------------------
-- Funções de apoio (security definer para não recursar nas próprias políticas).
-- ---------------------------------------------------------------------------
create or replace function app.minhas_permissoes()
returns table (perfil public.perfil, escopo public.escopo, escopo_id uuid, grupo_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.perfil, p.escopo, p.escopo_id, p.grupo_id
  from public.permissao p
  join public.usuario u on u.id = p.usuario_id
  where p.usuario_id = auth.uid()
    and p.excluido_em is null
    and u.ativo
    and u.excluido_em is null;
$$;

create or replace function app.grupos_visiveis()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct grupo_id from app.minhas_permissoes();
$$;

create or replace function app.fazendas_visiveis()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct f.id
  from public.fazenda f
  join app.minhas_permissoes() p
    on (p.escopo = 'fazenda' and p.escopo_id = f.id)
    or (p.escopo = 'empresa' and p.escopo_id = f.empresa_id)
    or (p.escopo = 'grupo' and p.escopo_id = f.grupo_id)
  where f.excluido_em is null;
$$;

create or replace function app.empresas_visiveis()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.empresa e
  join app.minhas_permissoes() p
    on (p.escopo = 'grupo' and p.escopo_id = e.grupo_id)
    or (p.escopo = 'empresa' and p.escopo_id = e.id)
  union
  select f.empresa_id from public.fazenda f where f.id in (select app.fazendas_visiveis());
$$;

create or replace function app.tem_perfil_no_grupo(alvo uuid, perfis public.perfil[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app.minhas_permissoes() p
    where p.escopo = 'grupo' and p.escopo_id = alvo and p.perfil = any (perfis)
  );
$$;

create or replace function app.tem_perfil_na_fazenda(alvo uuid, perfis public.perfil[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.fazenda f
    join app.minhas_permissoes() p
      on (p.escopo = 'fazenda' and p.escopo_id = f.id)
      or (p.escopo = 'empresa' and p.escopo_id = f.empresa_id)
      or (p.escopo = 'grupo' and p.escopo_id = f.grupo_id)
    where f.id = alvo and p.perfil = any (perfis)
  );
$$;

-- ---------------------------------------------------------------------------
-- Políticas.
-- ---------------------------------------------------------------------------
alter table public.usuario enable row level security;
alter table public.grupo enable row level security;
alter table public.empresa enable row level security;
alter table public.fazenda enable row level security;
alter table public.talhao enable row level security;
alter table public.safra enable row level security;
alter table public.cultura enable row level security;
alter table public.variedade enable row level security;
alter table public.ocupacao enable row level security;
alter table public.permissao enable row level security;
alter table public.auditoria enable row level security;

-- Exclusão é sempre lógica (excluido_em) ou desativação: ninguém apaga linha pela API.
revoke delete on public.usuario, public.grupo, public.empresa, public.fazenda, public.talhao,
  public.safra, public.cultura, public.variedade, public.permissao, public.auditoria
  from anon, authenticated;
revoke insert, update on public.auditoria from anon, authenticated;
-- O próprio usuário muda nome e celular; ativar e desativar passa por definir_usuario_ativo().
revoke update on public.usuario from anon, authenticated;
grant update (nome, celular) on public.usuario to authenticated;

-- Usuário: a própria linha e as pessoas dos grupos que administra.
create policy usuario_ler on public.usuario for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.permissao p
      where p.usuario_id = usuario.id and p.excluido_em is null
        and app.tem_perfil_no_grupo(p.grupo_id, array['administrador']::public.perfil[])
    )
  );
create policy usuario_editar_proprio on public.usuario for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Grupo.
create policy grupo_ler on public.grupo for select to authenticated
  using (id in (select app.grupos_visiveis()));
create policy grupo_editar on public.grupo for update to authenticated
  using (app.tem_perfil_no_grupo(id, array['administrador']::public.perfil[]));

-- Empresa.
create policy empresa_ler on public.empresa for select to authenticated
  using (id in (select app.empresas_visiveis()));
create policy empresa_incluir on public.empresa for insert to authenticated
  with check (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));
create policy empresa_editar on public.empresa for update to authenticated
  using (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));

-- Fazenda.
create policy fazenda_ler on public.fazenda for select to authenticated
  using (id in (select app.fazendas_visiveis()));
create policy fazenda_incluir on public.fazenda for insert to authenticated
  with check (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));
create policy fazenda_editar on public.fazenda for update to authenticated
  using (app.tem_perfil_na_fazenda(id, array['administrador']::public.perfil[]));

-- Talhão: administrador e gerente da fazenda editam; os demais perfis leem.
create policy talhao_ler on public.talhao for select to authenticated
  using (fazenda_id in (select app.fazendas_visiveis()));
create policy talhao_incluir on public.talhao for insert to authenticated
  with check (app.tem_perfil_na_fazenda(fazenda_id, array['administrador', 'gerente']::public.perfil[]));
create policy talhao_editar on public.talhao for update to authenticated
  using (app.tem_perfil_na_fazenda(fazenda_id, array['administrador', 'gerente']::public.perfil[]));

-- Safra, cultura e variedade são do grupo: todos do grupo leem, o administrador edita.
create policy safra_ler on public.safra for select to authenticated
  using (grupo_id in (select app.grupos_visiveis()));
create policy safra_incluir on public.safra for insert to authenticated
  with check (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));
create policy safra_editar on public.safra for update to authenticated
  using (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));

create policy cultura_ler on public.cultura for select to authenticated
  using (grupo_id in (select app.grupos_visiveis()));
create policy cultura_incluir on public.cultura for insert to authenticated
  with check (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));
create policy cultura_editar on public.cultura for update to authenticated
  using (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));

create policy variedade_ler on public.variedade for select to authenticated
  using (grupo_id in (select app.grupos_visiveis()));
create policy variedade_incluir on public.variedade for insert to authenticated
  with check (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));
create policy variedade_editar on public.variedade for update to authenticated
  using (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));

-- Ocupação: administrador e gerente da fazenda editam as faixas dos seus talhões.
create policy ocupacao_ler on public.ocupacao for select to authenticated
  using (fazenda_id in (select app.fazendas_visiveis()));
create policy ocupacao_incluir on public.ocupacao for insert to authenticated
  with check (app.tem_perfil_na_fazenda(fazenda_id, array['administrador', 'gerente']::public.perfil[]));
create policy ocupacao_editar on public.ocupacao for update to authenticated
  using (app.tem_perfil_na_fazenda(fazenda_id, array['administrador', 'gerente']::public.perfil[]));
create policy ocupacao_excluir on public.ocupacao for delete to authenticated
  using (app.tem_perfil_na_fazenda(fazenda_id, array['administrador', 'gerente']::public.perfil[]));

-- Permissão: cada um vê as suas; o administrador do grupo vê e concede as do grupo.
create policy permissao_ler on public.permissao for select to authenticated
  using (usuario_id = auth.uid() or app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));
create policy permissao_incluir on public.permissao for insert to authenticated
  with check (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));
create policy permissao_editar on public.permissao for update to authenticated
  using (app.tem_perfil_no_grupo(grupo_id, array['administrador']::public.perfil[]));

-- Auditoria: administrador e controladoria do grupo.
create policy auditoria_ler on public.auditoria for select to authenticated
  using (app.tem_perfil_no_grupo(grupo_id, array['administrador', 'controladoria']::public.perfil[]));

-- ---------------------------------------------------------------------------
-- Funções chamadas pela web e pelo app (expostas pela API).
-- ---------------------------------------------------------------------------

-- Primeiro acesso: cria o grupo e torna quem criou administrador dele.
create or replace function public.criar_grupo(nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  novo uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado' using errcode = 'insufficient_privilege';
  end if;
  insert into public.grupo (nome) values (criar_grupo.nome) returning id into novo;
  insert into public.permissao (usuario_id, perfil, escopo, escopo_id)
  values (auth.uid(), 'administrador', 'grupo', novo);
  return novo;
end;
$$;
revoke execute on function public.criar_grupo(text) from anon;

-- Ativa ou desativa um usuário (o app perde os dados na próxima sincronização).
create or replace function public.definir_usuario_ativo(usuario uuid, ativo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if usuario = auth.uid() then
    raise exception 'Você não pode desativar o próprio acesso' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.permissao p
    where p.usuario_id = definir_usuario_ativo.usuario and p.excluido_em is null
      and app.tem_perfil_no_grupo(p.grupo_id, array['administrador']::public.perfil[])
  ) then
    raise exception 'Só o administrador do grupo altera este usuário' using errcode = 'insufficient_privilege';
  end if;
  update public.usuario set ativo = definir_usuario_ativo.ativo where id = definir_usuario_ativo.usuario;
end;
$$;
revoke execute on function public.definir_usuario_ativo(uuid, boolean) from anon;

-- Contorno em GeoJSON como coluna calculada: select=id,codigo,geojson
create or replace function public.geojson(t public.talhao)
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select st_asgeojson(t.contorno, 7)::jsonb;
$$;

-- Inclui ou altera talhões a partir de GeoJSON. Roda com as permissões de quem chama.
-- talhoes: [{ "id"?, "codigo", "nome", "contorno": GeoJSON, "area_produtiva_ha"?, "posse"?, "origem_ids"? }]
create or replace function public.salvar_talhoes(fazenda uuid, talhoes jsonb)
returns setof uuid
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  item jsonb;
  salvo uuid;
begin
  for item in select * from jsonb_array_elements(talhoes) loop
    if item ? 'id' and exists (select 1 from public.talhao where id = (item ->> 'id')::uuid) then
      update public.talhao set
        codigo = coalesce(item ->> 'codigo', codigo),
        nome = coalesce(item ->> 'nome', nome),
        contorno = coalesce(st_setsrid(st_geomfromgeojson(item -> 'contorno'), 4326), contorno),
        area_produtiva_ha = case when item ? 'area_produtiva_ha' then (item ->> 'area_produtiva_ha')::numeric else area_produtiva_ha end,
        posse = coalesce((item ->> 'posse')::public.posse, posse)
      where id = (item ->> 'id')::uuid and fazenda_id = fazenda
      returning id into salvo;
    else
      insert into public.talhao (id, fazenda_id, codigo, nome, contorno, area_ha, area_produtiva_ha, posse, origem_ids)
      values (
        coalesce((item ->> 'id')::uuid, public.uuid_v7()),
        fazenda,
        item ->> 'codigo',
        item ->> 'nome',
        st_setsrid(st_geomfromgeojson(item -> 'contorno'), 4326),
        0, -- recalculada pelo gatilho
        (item ->> 'area_produtiva_ha')::numeric,
        coalesce((item ->> 'posse')::public.posse, 'propria'),
        coalesce(array(select jsonb_array_elements_text(item -> 'origem_ids'))::uuid[], '{}')
      )
      returning id into salvo;
    end if;
    if salvo is null then
      raise exception 'Talhão % não encontrado nesta fazenda', item ->> 'id' using errcode = 'no_data_found';
    end if;
    return next salvo;
  end loop;
end;
$$;
revoke execute on function public.salvar_talhoes(uuid, jsonb) from anon;

-- Copia a ocupação de uma safra para outra como ponto de partida (tela Safras e ocupação).
-- Pula talhões desativados e talhões que já têm ocupação na safra de destino.
create or replace function public.copiar_ocupacao(origem uuid, destino uuid, fazenda uuid default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  copiadas integer;
begin
  insert into public.ocupacao (safra_id, talhao_id, cultura_id, variedade_id, area_ha, plantio_previsto)
  select destino, o.talhao_id, o.cultura_id, o.variedade_id, o.area_ha, null
  from public.ocupacao o
  join public.talhao t on t.id = o.talhao_id and t.ativo and t.excluido_em is null
  where o.safra_id = origem
    and o.excluido_em is null
    and (fazenda is null or o.fazenda_id = fazenda)
    and not exists (
      select 1 from public.ocupacao d
      where d.safra_id = destino and d.talhao_id = o.talhao_id and d.excluido_em is null
    );
  get diagnostics copiadas = row_count;
  return copiadas;
end;
$$;
revoke execute on function public.copiar_ocupacao(uuid, uuid, uuid) from anon;

-- Concede um perfil a uma pessoa pelo e-mail. A pessoa precisa ter login
-- (se não tiver, a web convida antes pelo Auth e chama de novo).
create or replace function public.conceder_permissao(email text, perfil public.perfil, escopo public.escopo, escopo_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pessoa uuid;
  grupo uuid;
  nova uuid;
begin
  grupo := case escopo
    when 'grupo' then (select g.id from public.grupo g where g.id = conceder_permissao.escopo_id)
    when 'empresa' then (select e.grupo_id from public.empresa e where e.id = conceder_permissao.escopo_id)
    when 'fazenda' then (select f.grupo_id from public.fazenda f where f.id = conceder_permissao.escopo_id)
  end;
  if grupo is null or not app.tem_perfil_no_grupo(grupo, array['administrador']::public.perfil[]) then
    raise exception 'Só o administrador do grupo concede acesso' using errcode = 'insufficient_privilege';
  end if;
  select u.id into pessoa from public.usuario u where lower(u.email) = lower(trim(conceder_permissao.email));
  if pessoa is null then
    raise exception 'Nenhuma pessoa com login usa o e-mail %', conceder_permissao.email using errcode = 'no_data_found';
  end if;
  select p.id into nova from public.permissao p
  where p.usuario_id = pessoa and p.perfil = conceder_permissao.perfil and p.escopo = conceder_permissao.escopo
    and p.escopo_id = conceder_permissao.escopo_id and p.excluido_em is null;
  if nova is not null then
    return nova;
  end if;
  insert into public.permissao (usuario_id, perfil, escopo, escopo_id)
  values (pessoa, conceder_permissao.perfil, conceder_permissao.escopo, conceder_permissao.escopo_id)
  returning id into nova;
  return nova;
end;
$$;
revoke execute on function public.conceder_permissao(text, public.perfil, public.escopo, uuid) from anon;
