-- Permissões por linha: cada pessoa vê e edita só o que o perfil e o escopo permitem.
begin;
select plan(20);

-- Pessoas (o gatilho de auth.users cria a linha em usuario)
insert into auth.users (id, email, raw_user_meta_data) values
  ('20000000-0000-7000-8000-00000000000a', 'admin@g1.dev', '{"nome": "Admin G1"}'),
  ('20000000-0000-7000-8000-00000000000b', 'admin@g2.dev', '{}'),
  ('20000000-0000-7000-8000-00000000000c', 'gerente@g1.dev', '{}'),
  ('20000000-0000-7000-8000-00000000000d', 'novo@x.dev', '{}');

select is((select nome from usuario where id = '20000000-0000-7000-8000-00000000000a'), 'Admin G1', 'usuário criado a partir do login');
select is((select nome from usuario where id = '20000000-0000-7000-8000-00000000000b'), 'admin', 'nome padrão vem do e-mail');

-- Estrutura: G1 com F1 e F2; G2 com F3
insert into grupo (id, nome) values ('20000000-0000-7000-8000-000000000001', 'G1'), ('20000000-0000-7000-8000-000000000002', 'G2');
insert into empresa (id, grupo_id, tipo, cpf_cnpj, razao_social) values
  ('20000000-0000-7000-8000-0000000000e1', '20000000-0000-7000-8000-000000000001', 'PJ', '11222333000181', 'E1'),
  ('20000000-0000-7000-8000-0000000000e2', '20000000-0000-7000-8000-000000000002', 'PF', '52998224725', 'E2');
insert into fazenda (id, empresa_id, nome, sigla, municipio, uf) values
  ('20000000-0000-7000-8000-0000000000f1', '20000000-0000-7000-8000-0000000000e1', 'F1', 'FA', 'Sorriso', 'MT'),
  ('20000000-0000-7000-8000-0000000000f2', '20000000-0000-7000-8000-0000000000e1', 'F2', 'FB', 'Sorriso', 'MT'),
  ('20000000-0000-7000-8000-0000000000f3', '20000000-0000-7000-8000-0000000000e2', 'F3', 'FC', 'Rio Verde', 'GO');
insert into talhao (fazenda_id, codigo, nome, contorno, area_ha) values
  ('20000000-0000-7000-8000-0000000000f1', 'T1', 'T1', st_multi(st_makeenvelope(-55.70, -12.55, -55.69, -12.54, 4326)), 0),
  ('20000000-0000-7000-8000-0000000000f2', 'T1', 'T1', st_multi(st_makeenvelope(-55.60, -12.55, -55.59, -12.54, 4326)), 0),
  ('20000000-0000-7000-8000-0000000000f3', 'T1', 'T1', st_multi(st_makeenvelope(-50.90, -17.80, -50.89, -17.79, 4326)), 0);
insert into safra (id, grupo_id, ano_agricola, ciclo, nome, inicio, fim, status) values
  ('20000000-0000-7000-8000-0000000000c1', '20000000-0000-7000-8000-000000000001', '2025/26', 'verao', 'S', '2025-09-01', '2026-03-01', 'encerrada');
insert into permissao (usuario_id, perfil, escopo, escopo_id) values
  ('20000000-0000-7000-8000-00000000000a', 'administrador', 'grupo', '20000000-0000-7000-8000-000000000001'),
  ('20000000-0000-7000-8000-00000000000b', 'administrador', 'grupo', '20000000-0000-7000-8000-000000000002'),
  ('20000000-0000-7000-8000-00000000000c', 'gerente', 'fazenda', '20000000-0000-7000-8000-0000000000f1'),
  ('20000000-0000-7000-8000-00000000000c', 'controladoria', 'fazenda', '20000000-0000-7000-8000-0000000000f2');
select is((select grupo_id from permissao where escopo_id = '20000000-0000-7000-8000-0000000000f1'),
  '20000000-0000-7000-8000-000000000001'::uuid, 'permissão herda o grupo do escopo');

-- Administrador do G1
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-7000-8000-00000000000a';
select results_eq($$select nome from fazenda order by nome$$, array['F1', 'F2'], 'admin do G1 vê só as fazendas do G1');
select is((select count(*)::int from talhao), 2, 'admin do G1 vê os talhões do G1');
select is((select count(*)::int from usuario), 2, 'admin vê as pessoas do seu grupo');
select ok((select count(*) > 0 from auditoria), 'admin lê a auditoria do grupo');
select lives_ok($$update safra set status = 'aberta' where id = '20000000-0000-7000-8000-0000000000c1'$$, 'admin reabre safra encerrada (CM7)');
update safra set status = 'encerrada' where id = '20000000-0000-7000-8000-0000000000c1';

-- Administrador do G2 não enxerga o G1
set local request.jwt.claim.sub = '20000000-0000-7000-8000-00000000000b';
select results_eq($$select nome from fazenda$$, array['F3'], 'admin do G2 vê só o G2');
select is((select count(*)::int from empresa where grupo_id = '20000000-0000-7000-8000-000000000001'), 0, 'empresas de outro grupo ficam ocultas');

-- Gerente na F1 e leitura na F2 (exemplo da especificação)
set local request.jwt.claim.sub = '20000000-0000-7000-8000-00000000000c';
select results_eq($$select nome from fazenda order by nome$$, array['F1', 'F2'], 'gerente vê F1 e F2');
select lives_ok(
  $$select salvar_talhoes('20000000-0000-7000-8000-0000000000f1', '[{"codigo": "T2", "nome": "Novo", "contorno": {"type": "Polygon", "coordinates": [[[-55.68, -12.55], [-55.67, -12.55], [-55.67, -12.54], [-55.68, -12.54], [-55.68, -12.55]]]}}]')$$,
  'gerente inclui talhão na própria fazenda');
select throws_ok(
  $$select salvar_talhoes('20000000-0000-7000-8000-0000000000f2', '[{"codigo": "T2", "nome": "Novo", "contorno": {"type": "Polygon", "coordinates": [[[-55.58, -12.55], [-55.57, -12.55], [-55.57, -12.54], [-55.58, -12.54], [-55.58, -12.55]]]}}]')$$,
  '42501', null, 'perfil de leitura não inclui talhão');
update talhao set nome = 'Alterado' where fazenda_id = '20000000-0000-7000-8000-0000000000f2';
select is((select nome from talhao where fazenda_id = '20000000-0000-7000-8000-0000000000f2'), 'T1', 'perfil de leitura não altera talhão');
select throws_ok(
  $$insert into empresa (grupo_id, tipo, cpf_cnpj, razao_social) values ('20000000-0000-7000-8000-000000000001', 'PJ', '11444777000161', 'X')$$,
  '42501', null, 'gerente não cria empresa');
update safra set status = 'aberta' where id = '20000000-0000-7000-8000-0000000000c1';
select is((select status::text from safra where id = '20000000-0000-7000-8000-0000000000c1'), 'encerrada', 'só o administrador reabre safra');
select is((select count(*)::int from auditoria), 0, 'gerente não lê a auditoria');
select ok((select (geojson ->> 'type') = 'MultiPolygon' from talhao t, geojson(t) where codigo = 'T2'), 'contorno em GeoJSON');

-- Primeiro acesso cria grupo e torna a pessoa administradora
set local request.jwt.claim.sub = '20000000-0000-7000-8000-00000000000d';
select ok(criar_grupo('Meu grupo') is not null, 'criar_grupo no primeiro acesso');

-- Usuário desativado perde o acesso
reset role;
update usuario set ativo = false where id = '20000000-0000-7000-8000-00000000000c';
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-7000-8000-00000000000c';
select is((select count(*)::int from fazenda), 0, 'usuário desativado não vê nada');

select * from finish();
rollback;
