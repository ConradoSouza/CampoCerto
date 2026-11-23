-- Campo Certo: cadastros e mapa (entrega 1).
-- Hierarquia: grupo → empresa → fazenda → talhão × safra = ocupação.
-- Toda tabela abaixo do grupo guarda grupo_id (e fazenda_id quando faz sentido),
-- preenchidos por gatilho a partir do pai. São as chaves de permissão e de sincronização.

-- ---------------------------------------------------------------------------
-- Validação de CPF e CNPJ (inclusive CNPJ alfanumérico). Espelha packages/regras.
-- ---------------------------------------------------------------------------
create or replace function app.cpf_valido(doc text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  soma int;
  dv int;
  tamanho int;
begin
  if doc !~ '^\d{11}$' or doc ~ '^(\d)\1{10}$' then
    return false;
  end if;
  foreach tamanho in array array[9, 10] loop
    soma := 0;
    for i in 1..tamanho loop
      soma := soma + substr(doc, i, 1)::int * (tamanho + 2 - i);
    end loop;
    dv := ((soma * 10) % 11) % 10;
    if dv <> substr(doc, tamanho + 1, 1)::int then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function app.cnpj_valido(doc text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  pesos int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  base text;
  soma int;
  resto int;
  dv int;
begin
  if doc !~ '^[0-9A-Z]{12}\d{2}$' or doc ~ '^(.)\1{13}$' then
    return false;
  end if;
  base := substr(doc, 1, 12);
  for passo in 1..2 loop
    soma := 0;
    for i in 1..length(base) loop
      soma := soma + (ascii(substr(base, i, 1)) - 48) * pesos[13 - length(base) + i];
    end loop;
    resto := soma % 11;
    dv := case when resto < 2 then 0 else 11 - resto end;
    base := base || dv::text;
  end loop;
  return base = doc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Usuário: perfil público de auth.users.
-- ---------------------------------------------------------------------------
create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text,
  celular text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz
);

create or replace function app.criar_usuario_de_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuario (id, nome, email, celular, criado_por)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(coalesce(new.email, ''), '@', 1), 'Usuário'),
    new.email,
    new.phone,
    new.id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger criar_usuario_de_auth
  after insert on auth.users
  for each row execute function app.criar_usuario_de_auth();

-- ---------------------------------------------------------------------------
-- Grupo, empresa, fazenda.
-- ---------------------------------------------------------------------------
create table public.grupo (
  id uuid primary key default public.uuid_v7(),
  nome text not null check (length(trim(nome)) > 0),
  config jsonb not null default '{"limite_area_excedente_pct": 10, "limite_dose_pct": 10}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz
);

create table public.empresa (
  id uuid primary key default public.uuid_v7(),
  grupo_id uuid not null references public.grupo (id),
  tipo public.tipo_empresa not null,
  cpf_cnpj text not null,
  razao_social text not null check (length(trim(razao_social)) > 0),
  nome_fantasia text,
  inscricoes_estaduais text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz,
  constraint empresa_documento_valido check (
    case tipo when 'PF' then app.cpf_valido(cpf_cnpj) else app.cnpj_valido(cpf_cnpj) end
  )
);
create unique index empresa_documento_unico on public.empresa (grupo_id, cpf_cnpj) where excluido_em is null;

create table public.fazenda (
  id uuid primary key default public.uuid_v7(),
  grupo_id uuid not null references public.grupo (id),
  empresa_id uuid not null references public.empresa (id),
  nome text not null check (length(trim(nome)) > 0),
  sigla text not null check (sigla ~ '^[A-Z0-9]{2,5}$'),
  municipio text not null,
  uf char(2) not null check (uf in (
    'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
    'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO')),
  sede extensions.geometry(Point, 4326),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz
);
-- A sigla entra no número da OS (ex.: SM-2026-0142), então é única no grupo.
create unique index fazenda_sigla_unica on public.fazenda (grupo_id, sigla) where excluido_em is null;
create index fazenda_empresa on public.fazenda (empresa_id);

-- ---------------------------------------------------------------------------
-- Talhão.
-- ---------------------------------------------------------------------------
create table public.talhao (
  id uuid primary key default public.uuid_v7(),
  grupo_id uuid not null references public.grupo (id),
  fazenda_id uuid not null references public.fazenda (id),
  codigo text not null check (length(trim(codigo)) between 1 and 20),
  nome text not null check (length(trim(nome)) > 0),
  contorno extensions.geometry(MultiPolygon, 4326) not null,
  area_ha numeric(12, 2) not null,
  area_produtiva_ha numeric(12, 2),
  posse public.posse not null default 'propria',
  ativo boolean not null default true,
  -- Talhões de onde este veio, quando nasceu de divisão ou união (CM4).
  origem_ids uuid[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz,
  constraint talhao_area_produtiva check (area_produtiva_ha is null or (area_produtiva_ha >= 0 and area_produtiva_ha <= area_ha))
);
create unique index talhao_codigo_unico on public.talhao (fazenda_id, codigo) where excluido_em is null;
create index talhao_contorno on public.talhao using gist (contorno);

-- ---------------------------------------------------------------------------
-- Safra, cultura, variedade, ocupação.
-- ---------------------------------------------------------------------------
create table public.safra (
  id uuid primary key default public.uuid_v7(),
  grupo_id uuid not null references public.grupo (id),
  ano_agricola text not null check (ano_agricola ~ '^\d{4}(/\d{2})?$'),
  ciclo public.ciclo_safra not null,
  nome text not null check (length(trim(nome)) > 0),
  inicio date not null,
  fim date not null,
  status public.status_safra not null default 'planejada',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz,
  constraint safra_periodo check (fim >= inicio)
);
create unique index safra_nome_unico on public.safra (grupo_id, nome) where excluido_em is null;

create table public.cultura (
  id uuid primary key default public.uuid_v7(),
  grupo_id uuid not null references public.grupo (id),
  nome text not null check (length(trim(nome)) > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz
);
create unique index cultura_nome_unico on public.cultura (grupo_id, lower(nome)) where excluido_em is null;

create table public.variedade (
  id uuid primary key default public.uuid_v7(),
  grupo_id uuid not null references public.grupo (id),
  cultura_id uuid not null references public.cultura (id),
  nome text not null check (length(trim(nome)) > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz
);
create unique index variedade_nome_unico on public.variedade (cultura_id, lower(nome)) where excluido_em is null;

create table public.ocupacao (
  id uuid primary key default public.uuid_v7(),
  grupo_id uuid not null references public.grupo (id),
  fazenda_id uuid not null references public.fazenda (id),
  safra_id uuid not null references public.safra (id),
  talhao_id uuid not null references public.talhao (id),
  cultura_id uuid not null references public.cultura (id),
  variedade_id uuid references public.variedade (id),
  area_ha numeric(12, 2) not null check (area_ha > 0),
  plantio_previsto date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz
);
create index ocupacao_safra_talhao on public.ocupacao (safra_id, talhao_id);
create index ocupacao_fazenda on public.ocupacao (fazenda_id);

-- ---------------------------------------------------------------------------
-- Permissão: um perfil aplicado a um escopo (grupo, empresa ou fazenda).
-- ---------------------------------------------------------------------------
create table public.permissao (
  id uuid primary key default public.uuid_v7(),
  grupo_id uuid not null references public.grupo (id),
  usuario_id uuid not null references public.usuario (id),
  perfil public.perfil not null,
  escopo public.escopo not null,
  escopo_id uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  excluido_em timestamptz
);
create unique index permissao_unica on public.permissao (usuario_id, perfil, escopo, escopo_id) where excluido_em is null;
create index permissao_usuario on public.permissao (usuario_id) where excluido_em is null;

-- ---------------------------------------------------------------------------
-- Auditoria (CM8): quem, quando, valor anterior e novo.
-- ---------------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  grupo_id uuid,
  tabela text not null,
  registro_id uuid not null,
  acao text not null check (acao in ('inclusao', 'alteracao', 'exclusao')),
  antes jsonb,
  depois jsonb,
  usuario_id uuid default auth.uid(),
  quando timestamptz not null default now()
);
create index auditoria_registro on public.auditoria (tabela, registro_id);
create index auditoria_grupo_quando on public.auditoria (grupo_id, quando desc);

-- ===========================================================================
-- Gatilhos
-- ===========================================================================

-- Preenche grupo_id / fazenda_id a partir do pai e confere que tudo é do mesmo grupo.
create or replace function app.herdar_hierarquia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  case tg_table_name
    when 'fazenda' then
      select grupo_id into new.grupo_id from public.empresa where id = new.empresa_id;
    when 'talhao' then
      select grupo_id into new.grupo_id from public.fazenda where id = new.fazenda_id;
    when 'variedade' then
      select grupo_id into new.grupo_id from public.cultura where id = new.cultura_id;
    when 'ocupacao' then
      select grupo_id, fazenda_id, ativo into t from public.talhao where id = new.talhao_id;
      new.grupo_id := t.grupo_id;
      new.fazenda_id := t.fazenda_id;
      if not t.ativo then
        raise exception 'O talhão está desativado' using errcode = 'check_violation';
      end if;
      if (select grupo_id from public.safra where id = new.safra_id) is distinct from t.grupo_id
        or (select grupo_id from public.cultura where id = new.cultura_id) is distinct from t.grupo_id then
        raise exception 'Safra, cultura e talhão precisam ser do mesmo grupo' using errcode = 'check_violation';
      end if;
      if new.variedade_id is not null
        and (select cultura_id from public.variedade where id = new.variedade_id) is distinct from new.cultura_id then
        raise exception 'A variedade não é da cultura informada' using errcode = 'check_violation';
      end if;
    when 'permissao' then
      new.grupo_id := case new.escopo
        when 'grupo' then (select id from public.grupo where id = new.escopo_id)
        when 'empresa' then (select grupo_id from public.empresa where id = new.escopo_id)
        when 'fazenda' then (select grupo_id from public.fazenda where id = new.escopo_id)
      end;
  end case;
  if new.grupo_id is null then
    raise exception 'Registro pai não encontrado para %', tg_table_name using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger a_herdar before insert on public.fazenda for each row execute function app.herdar_hierarquia();
create trigger a_herdar before insert on public.talhao for each row execute function app.herdar_hierarquia();
create trigger a_herdar before insert on public.variedade for each row execute function app.herdar_hierarquia();
create trigger a_herdar before insert on public.ocupacao for each row execute function app.herdar_hierarquia();
create trigger a_herdar before insert on public.permissao for each row execute function app.herdar_hierarquia();

create trigger b_imutaveis before update on public.empresa for each row execute function app.colunas_imutaveis('grupo_id');
create trigger b_imutaveis before update on public.fazenda for each row execute function app.colunas_imutaveis('grupo_id', 'empresa_id');
create trigger b_imutaveis before update on public.talhao for each row execute function app.colunas_imutaveis('grupo_id', 'fazenda_id');
create trigger b_imutaveis before update on public.safra for each row execute function app.colunas_imutaveis('grupo_id');
create trigger b_imutaveis before update on public.cultura for each row execute function app.colunas_imutaveis('grupo_id');
create trigger b_imutaveis before update on public.variedade for each row execute function app.colunas_imutaveis('grupo_id', 'cultura_id');
create trigger b_imutaveis before update on public.ocupacao for each row execute function app.colunas_imutaveis('grupo_id', 'fazenda_id', 'safra_id', 'talhao_id');
create trigger b_imutaveis before update on public.permissao for each row execute function app.colunas_imutaveis('grupo_id', 'usuario_id', 'perfil', 'escopo', 'escopo_id');

create trigger z_atualizado_em before update on public.usuario for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.grupo for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.empresa for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.fazenda for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.talhao for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.safra for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.cultura for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.variedade for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.ocupacao for each row execute function app.tocar_atualizado_em();
create trigger z_atualizado_em before update on public.permissao for each row execute function app.tocar_atualizado_em();

-- Empresa: documento só com dígitos/letras maiúsculas.
create or replace function app.normalizar_empresa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cpf_cnpj := regexp_replace(upper(new.cpf_cnpj), '[^0-9A-Z]', '', 'g');
  return new;
end;
$$;
create trigger c_normalizar before insert or update on public.empresa for each row execute function app.normalizar_empresa();

-- Fazenda: sigla em maiúsculas.
create or replace function app.normalizar_fazenda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sigla := upper(trim(new.sigla));
  new.uf := upper(new.uf);
  return new;
end;
$$;
create trigger c_normalizar before insert or update on public.fazenda for each row execute function app.normalizar_fazenda();

-- Talhão: contorno válido, área geodésica (CM1) e sobreposição máxima de 0,5% (CM2).
create or replace function app.preparar_talhao()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  limite constant numeric := 0.005;
  outro record;
  fracao numeric;
begin
  if tg_op = 'UPDATE' and new.contorno is not distinct from old.contorno
     and new.ativo is not distinct from old.ativo
     and new.excluido_em is not distinct from old.excluido_em then
    return new;
  end if;

  new.contorno := st_multi(st_collectionextract(st_makevalid(st_force2d(new.contorno)), 3));
  if st_isempty(new.contorno) then
    raise exception 'O contorno do talhão não tem área' using errcode = 'check_violation';
  end if;
  new.area_ha := round((st_area(new.contorno::geography) / 10000)::numeric, 2);

  if new.ativo and new.excluido_em is null then
    for outro in
      select t.id, t.codigo, t.contorno
      from public.talhao t
      where t.fazenda_id = new.fazenda_id
        and t.id <> new.id
        and t.ativo
        and t.excluido_em is null
        and st_intersects(t.contorno, new.contorno)
    loop
      fracao := st_area(st_intersection(outro.contorno, new.contorno)::geography)
        / nullif(least(st_area(outro.contorno::geography), st_area(new.contorno::geography)), 0);
      if fracao > limite then
        raise exception 'O talhão se sobrepõe a % (% %% da área)', outro.codigo, round(fracao * 100, 2)
          using errcode = 'check_violation', detail = outro.id::text;
      end if;
    end loop;
  end if;
  return new;
end;
$$;
create trigger c_preparar before insert or update on public.talhao for each row execute function app.preparar_talhao();

-- Safra encerrada é somente leitura; só o administrador do grupo reabre (CM7).
create or replace function app.proteger_safra_encerrada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'encerrada' then
    if new.status = 'encerrada' then
      raise exception 'Safra encerrada é somente leitura' using errcode = 'check_violation';
    end if;
    if not app.tem_perfil_no_grupo(old.grupo_id, array['administrador']::public.perfil[]) then
      raise exception 'Só o administrador do grupo reabre uma safra encerrada' using errcode = 'insufficient_privilege';
    end if;
    if (to_jsonb(new) - 'status' - 'atualizado_em') is distinct from (to_jsonb(old) - 'status' - 'atualizado_em') then
      raise exception 'Reabra a safra antes de alterar outros campos' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
create trigger c_encerrada before update on public.safra for each row execute function app.proteger_safra_encerrada();

-- Ocupação: safra aberta e soma das faixas até a área produtiva (CM6).
create or replace function app.validar_ocupacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  registro public.ocupacao := coalesce(new, old);
  disponivel numeric;
  usada numeric;
begin
  if (select status from public.safra where id = registro.safra_id) = 'encerrada' then
    raise exception 'Safra encerrada é somente leitura' using errcode = 'check_violation';
  end if;
  if tg_op = 'DELETE' or new.excluido_em is not null then
    return coalesce(new, old);
  end if;

  -- Trava o talhão para que duas gravações simultâneas não passem juntas do limite.
  select coalesce(area_produtiva_ha, area_ha) into disponivel
  from public.talhao where id = new.talhao_id for update;

  select coalesce(sum(area_ha), 0) into usada
  from public.ocupacao
  where safra_id = new.safra_id and talhao_id = new.talhao_id and id <> new.id and excluido_em is null;

  if usada + new.area_ha > disponivel then
    raise exception 'A ocupação passa da área produtiva do talhão. Disponível: % ha', disponivel - usada
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger d_validar before insert or update or delete on public.ocupacao for each row execute function app.validar_ocupacao();

-- Auditoria genérica.
create or replace function app.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  depois jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  linha jsonb := coalesce(depois, antes);
begin
  if tg_op = 'UPDATE' and (antes - 'atualizado_em') = (depois - 'atualizado_em') then
    return null;
  end if;
  insert into public.auditoria (grupo_id, tabela, registro_id, acao, antes, depois)
  values (
    case when tg_table_name = 'grupo' then (linha ->> 'id')::uuid else (linha ->> 'grupo_id')::uuid end,
    tg_table_name,
    (linha ->> 'id')::uuid,
    case tg_op when 'INSERT' then 'inclusao' when 'UPDATE' then 'alteracao' else 'exclusao' end,
    antes,
    depois
  );
  return null;
end;
$$;

create trigger auditar after insert or update or delete on public.grupo for each row execute function app.auditar();
create trigger auditar after insert or update or delete on public.empresa for each row execute function app.auditar();
create trigger auditar after insert or update or delete on public.fazenda for each row execute function app.auditar();
create trigger auditar after insert or update or delete on public.talhao for each row execute function app.auditar();
create trigger auditar after insert or update or delete on public.safra for each row execute function app.auditar();
create trigger auditar after insert or update or delete on public.cultura for each row execute function app.auditar();
create trigger auditar after insert or update or delete on public.variedade for each row execute function app.auditar();
create trigger auditar after insert or update or delete on public.ocupacao for each row execute function app.auditar();
create trigger auditar after insert or update or delete on public.permissao for each row execute function app.auditar();
