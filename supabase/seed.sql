-- Dados de demonstração para desenvolvimento local (supabase db reset).
-- Login: demo@campocerto.dev / campocerto
-- Fazenda Santa Maria (SM), Sorriso-MT, com 8 talhões e a safra de verão 2026/27.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-7000-8000-00000000d001',
  'authenticated', 'authenticated', 'demo@campocerto.dev',
  extensions.crypt('campocerto', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{"nome": "Usuário Demonstração"}',
  now(), now(), '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  '00000000-0000-7000-8000-00000000d001', '00000000-0000-7000-8000-00000000d001',
  '00000000-0000-7000-8000-00000000d001',
  '{"sub": "00000000-0000-7000-8000-00000000d001", "email": "demo@campocerto.dev"}',
  'email', now(), now(), now()
) on conflict do nothing;

insert into public.grupo (id, nome) values ('00000000-0000-7000-8000-0000000a0001', 'Grupo Demonstração');

insert into public.permissao (usuario_id, perfil, escopo, escopo_id)
values ('00000000-0000-7000-8000-00000000d001', 'administrador', 'grupo', '00000000-0000-7000-8000-0000000a0001');

insert into public.empresa (id, grupo_id, tipo, cpf_cnpj, razao_social, nome_fantasia, inscricoes_estaduais) values
  ('00000000-0000-7000-8000-0000000e0001', '00000000-0000-7000-8000-0000000a0001', 'PJ', '11.222.333/0001-81', 'Agropecuária Santa Maria Ltda', 'Santa Maria', '{13.123.456-7}'),
  ('00000000-0000-7000-8000-0000000e0002', '00000000-0000-7000-8000-0000000a0001', 'PF', '529.982.247-25', 'José da Silva', null, '{}');

insert into public.fazenda (id, empresa_id, nome, sigla, municipio, uf, sede) values
  ('00000000-0000-7000-8000-0000000f0001', '00000000-0000-7000-8000-0000000e0001', 'Fazenda Santa Maria', 'SM', 'Sorriso', 'MT',
   extensions.st_setsrid(extensions.st_makepoint(-55.712, -12.548), 4326)),
  ('00000000-0000-7000-8000-0000000f0002', '00000000-0000-7000-8000-0000000e0002', 'Sítio Boa Vista', 'BV', 'Sorriso', 'MT',
   extensions.st_setsrid(extensions.st_makepoint(-55.64, -12.60), 4326));

-- Talhões em grade de 4 x 2, cada um com ~1,2 km x 1,1 km (cerca de 130 ha).
insert into public.talhao (fazenda_id, codigo, nome, contorno, area_ha, area_produtiva_ha, posse)
select
  '00000000-0000-7000-8000-0000000f0001',
  format('T%s', lpad((linha * 4 + coluna + 1)::text, 2, '0')),
  (array['Baixada', 'Sede', 'Córrego', 'Aroeira', 'Chapadão', 'Pivô', 'Divisa', 'Estrada'])[linha * 4 + coluna + 1],
  extensions.st_multi(extensions.st_makeenvelope(
    -55.73 + coluna * 0.0112, -12.56 + linha * 0.0101,
    -55.73 + coluna * 0.0112 + 0.011, -12.56 + linha * 0.0101 + 0.01, 4326)),
  0,
  null,
  case when linha = 1 and coluna = 3 then 'arrendada'::public.posse else 'propria'::public.posse end
from generate_series(0, 1) linha, generate_series(0, 3) coluna;

update public.talhao set area_produtiva_ha = round(area_ha * 0.96, 2)
where fazenda_id = '00000000-0000-7000-8000-0000000f0001';

insert into public.safra (id, grupo_id, ano_agricola, ciclo, nome, inicio, fim, status) values
  ('00000000-0000-7000-8000-0000000c0001', '00000000-0000-7000-8000-0000000a0001', '2025/26', 'verao', 'Soja 2025/26', '2025-09-15', '2026-03-31', 'encerrada'),
  ('00000000-0000-7000-8000-0000000c0002', '00000000-0000-7000-8000-0000000a0001', '2026/27', 'verao', 'Soja 2026/27', '2026-09-15', '2027-03-31', 'aberta'),
  ('00000000-0000-7000-8000-0000000c0003', '00000000-0000-7000-8000-0000000a0001', '2027', 'segunda_safra', 'Milho 2ª safra 2027', '2027-01-20', '2027-07-31', 'planejada');

insert into public.cultura (id, grupo_id, nome) values
  ('00000000-0000-7000-8000-0000000b0001', '00000000-0000-7000-8000-0000000a0001', 'Soja'),
  ('00000000-0000-7000-8000-0000000b0002', '00000000-0000-7000-8000-0000000a0001', 'Milho'),
  ('00000000-0000-7000-8000-0000000b0003', '00000000-0000-7000-8000-0000000a0001', 'Algodão');

insert into public.variedade (id, cultura_id, nome) values
  ('00000000-0000-7000-8000-0000000b1001', '00000000-0000-7000-8000-0000000b0001', 'TMG 2383 IPRO'),
  ('00000000-0000-7000-8000-0000000b1002', '00000000-0000-7000-8000-0000000b0001', 'BRS 1074 IPRO'),
  ('00000000-0000-7000-8000-0000000b2001', '00000000-0000-7000-8000-0000000b0002', 'AG 8701 PRO4');

-- Soja em todos os talhões na safra atual, duas variedades alternadas.
insert into public.ocupacao (safra_id, talhao_id, cultura_id, variedade_id, area_ha, plantio_previsto)
select '00000000-0000-7000-8000-0000000c0002', t.id, '00000000-0000-7000-8000-0000000b0001',
  case when right(t.codigo, 1)::int % 2 = 0 then '00000000-0000-7000-8000-0000000b1002' else '00000000-0000-7000-8000-0000000b1001' end::uuid,
  t.area_produtiva_ha, date '2026-10-01' + (right(t.codigo, 1)::int * 3)
from public.talhao t
where t.fazenda_id = '00000000-0000-7000-8000-0000000f0001';
