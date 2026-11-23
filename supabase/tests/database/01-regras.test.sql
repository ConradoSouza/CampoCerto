-- Regras de cadastro aplicadas pelo banco (CM1, CM2, CM3, CM6, CM7, CM8).
begin;
select plan(24);

-- Documentos
select ok(app.cpf_valido('52998224725'), 'CPF válido');
select ok(not app.cpf_valido('52998224724'), 'CPF com dígito errado');
select ok(app.cnpj_valido('11222333000181'), 'CNPJ numérico');
select ok(app.cnpj_valido('12ABC34501DE35'), 'CNPJ alfanumérico');
select ok(not app.cnpj_valido('00000000000000'), 'CNPJ repetido');

insert into grupo (id, nome) values ('10000000-0000-7000-8000-000000000001', 'G');
select throws_ok(
  $$insert into empresa (grupo_id, tipo, cpf_cnpj, razao_social) values ('10000000-0000-7000-8000-000000000001', 'PJ', '11222333000180', 'X')$$,
  '23514', null, 'empresa com CNPJ inválido é recusada');
insert into empresa (id, grupo_id, tipo, cpf_cnpj, razao_social)
values ('10000000-0000-7000-8000-000000000002', '10000000-0000-7000-8000-000000000001', 'PJ', '11.222.333/0001-81', 'Empresa');
select is((select cpf_cnpj from empresa where id = '10000000-0000-7000-8000-000000000002'), '11222333000181', 'documento é salvo sem máscara');

insert into fazenda (id, empresa_id, nome, sigla, municipio, uf)
values ('10000000-0000-7000-8000-000000000003', '10000000-0000-7000-8000-000000000002', 'Fazenda', 'fz', 'Sorriso', 'MT');
select is((select grupo_id from fazenda where id = '10000000-0000-7000-8000-000000000003'),
  '10000000-0000-7000-8000-000000000001'::uuid, 'fazenda herda o grupo da empresa');
select is((select sigla from fazenda where id = '10000000-0000-7000-8000-000000000003'), 'FZ', 'sigla em maiúsculas');

-- Talhão: área geodésica e herança
insert into talhao (id, fazenda_id, codigo, nome, contorno, area_ha)
values ('10000000-0000-7000-8000-0000000000a1', '10000000-0000-7000-8000-000000000003', 'T1', 'Um',
  st_multi(st_makeenvelope(-55.70, -12.55, -55.69, -12.54, 4326)), 0);
select ok((select area_ha between 115 and 122 from talhao where id = '10000000-0000-7000-8000-0000000000a1'),
  'área calculada do polígono (CM1)');
select throws_ok(
  $$update talhao set area_produtiva_ha = 999 where id = '10000000-0000-7000-8000-0000000000a1'$$,
  '23514', null, 'área produtiva maior que a do desenho é recusada (CM1)');
select throws_ok(
  $$insert into talhao (fazenda_id, codigo, nome, contorno, area_ha) values ('10000000-0000-7000-8000-000000000003', 'T1', 'Repetido',
    st_multi(st_makeenvelope(-55.60, -12.55, -55.59, -12.54, 4326)), 0)$$,
  '23505', null, 'código único na fazenda (CM3)');

-- Sobreposição (CM2): ~1% bloqueia, ~0,3% passa
select throws_ok(
  $$insert into talhao (fazenda_id, codigo, nome, contorno, area_ha) values ('10000000-0000-7000-8000-000000000003', 'T2', 'Dois',
    st_multi(st_makeenvelope(-55.6901, -12.55, -55.6801, -12.54, 4326)), 0)$$,
  '23514', null, 'sobreposição acima de 0,5% é bloqueada (CM2)');
select lives_ok(
  $$insert into talhao (id, fazenda_id, codigo, nome, contorno, area_ha) values ('10000000-0000-7000-8000-0000000000a2', '10000000-0000-7000-8000-000000000003', 'T2', 'Dois',
    st_multi(st_makeenvelope(-55.69003, -12.55, -55.68003, -12.54, 4326)), 0)$$,
  'sobreposição abaixo de 0,5% é aceita');
select throws_ok(
  $$update talhao set fazenda_id = gen_random_uuid() where id = '10000000-0000-7000-8000-0000000000a2'$$,
  '23514', null, 'talhão não muda de fazenda');

-- Safra e ocupação (CM6, CM7)
insert into safra (id, grupo_id, ano_agricola, ciclo, nome, inicio, fim, status)
values ('10000000-0000-7000-8000-0000000000c1', '10000000-0000-7000-8000-000000000001', '2026/27', 'verao', 'S', '2026-09-01', '2027-03-01', 'aberta');
insert into cultura (id, grupo_id, nome) values
  ('10000000-0000-7000-8000-0000000000b1', '10000000-0000-7000-8000-000000000001', 'Soja'),
  ('10000000-0000-7000-8000-0000000000b2', '10000000-0000-7000-8000-000000000001', 'Milho');
insert into variedade (id, cultura_id, nome) values ('10000000-0000-7000-8000-0000000000b3', '10000000-0000-7000-8000-0000000000b2', 'AG');
update talhao set area_produtiva_ha = 100 where id = '10000000-0000-7000-8000-0000000000a1';

select lives_ok(
  $$insert into ocupacao (safra_id, talhao_id, cultura_id, area_ha) values
    ('10000000-0000-7000-8000-0000000000c1', '10000000-0000-7000-8000-0000000000a1', '10000000-0000-7000-8000-0000000000b1', 60),
    ('10000000-0000-7000-8000-0000000000c1', '10000000-0000-7000-8000-0000000000a1', '10000000-0000-7000-8000-0000000000b1', 40)$$,
  'faixas que somam a área produtiva são aceitas');
select throws_ok(
  $$insert into ocupacao (safra_id, talhao_id, cultura_id, area_ha) values
    ('10000000-0000-7000-8000-0000000000c1', '10000000-0000-7000-8000-0000000000a1', '10000000-0000-7000-8000-0000000000b1', 0.01)$$,
  '23514', null, 'soma acima da área produtiva é recusada (CM6)');
select throws_ok(
  $$insert into ocupacao (safra_id, talhao_id, cultura_id, variedade_id, area_ha) values
    ('10000000-0000-7000-8000-0000000000c1', '10000000-0000-7000-8000-0000000000a2', '10000000-0000-7000-8000-0000000000b1', '10000000-0000-7000-8000-0000000000b3', 1)$$,
  '23514', null, 'variedade precisa ser da cultura');
select is((select fazenda_id from ocupacao where talhao_id = '10000000-0000-7000-8000-0000000000a1' limit 1),
  '10000000-0000-7000-8000-000000000003'::uuid, 'ocupação herda a fazenda do talhão');

update talhao set ativo = false where id = '10000000-0000-7000-8000-0000000000a2';
select throws_ok(
  $$insert into ocupacao (safra_id, talhao_id, cultura_id, area_ha) values
    ('10000000-0000-7000-8000-0000000000c1', '10000000-0000-7000-8000-0000000000a2', '10000000-0000-7000-8000-0000000000b1', 1)$$,
  '23514', null, 'talhão desativado não recebe ocupação');

update safra set status = 'encerrada' where id = '10000000-0000-7000-8000-0000000000c1';
select throws_ok(
  $$update safra set nome = 'Outro' where id = '10000000-0000-7000-8000-0000000000c1'$$,
  '23514', null, 'safra encerrada é somente leitura (CM7)');
select throws_ok(
  $$delete from ocupacao where safra_id = '10000000-0000-7000-8000-0000000000c1'$$,
  '23514', null, 'ocupação de safra encerrada não muda (CM7)');

-- Auditoria (CM8)
select ok(exists (
  select 1 from auditoria
  where tabela = 'talhao' and registro_id = '10000000-0000-7000-8000-0000000000a1' and acao = 'alteracao'
    and antes ->> 'area_produtiva_ha' is null and (depois ->> 'area_produtiva_ha')::numeric = 100
), 'alteração grava valor anterior e novo (CM8)');
select is((select grupo_id from auditoria where tabela = 'talhao' and registro_id = '10000000-0000-7000-8000-0000000000a1' limit 1),
  '10000000-0000-7000-8000-000000000001'::uuid, 'auditoria guarda o grupo');

select * from finish();
rollback;
