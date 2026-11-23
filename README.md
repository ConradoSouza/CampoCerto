# Campo Certo

Plataforma de gestão do campo: a ordem de serviço sai do escritório, volta do campo e já baixa o estoque.

O MVP tem três módulos que fecham um ciclo: **cadastros e mapa** (do grupo até o talhão), **ordens de serviço com apontamento offline** e **estoque de insumos com baixa automática**. Esta base cobre a **entrega 1: base e mapa**.

## Estrutura

```
apps/
  web/        Next.js (escritório): login, estrutura do grupo, mapa de talhões, safras e ocupação, usuários
  mobile/     Expo / React Native (campo): base do app; OS e apontamento offline chegam na entrega 2
packages/
  tipos/      enums e esquemas (zod) compartilhados
  regras/     regras de negócio puras: CPF/CNPJ, área e sobreposição de talhões, ocupação, perfis
  tema/       cores e tipografia comuns à web e ao app
supabase/
  migrations/ esquema Postgres + PostGIS, gatilhos das regras, auditoria e RLS
  tests/      testes pgTAP do banco
  seed.sql    dados de demonstração (Fazenda Santa Maria)
```

TypeScript de ponta a ponta, pnpm + Turborepo, Supabase (Postgres com PostGIS, Auth e permissões por linha), MapLibre GL para mapas. A sincronização offline do app usará PowerSync sobre o mesmo Postgres.

## Rodando localmente

Requisitos: Node 22, pnpm 10 e Docker (para o Supabase local).

```bash
pnpm install
npx supabase start            # Postgres + PostGIS, Auth e API; aplica migrações e seed
cp apps/web/.env.example apps/web/.env.local   # cole a URL e a anon key de `npx supabase status`
pnpm --filter @campocerto/web dev               # http://localhost:3000
```

Login de demonstração: `demo@campocerto.dev` / `campocerto`.

App de campo: `pnpm --filter @campocerto/mobile dev` e abra no Expo Go.

## Testes

```bash
pnpm test            # regras de negócio (Vitest)
pnpm typecheck
npx supabase test db # banco (pgTAP), com o Supabase local rodando
```

Sem Docker, os testes do banco rodam num Postgres local com PostGIS e pgTAP: `pnpm db:test` (veja `supabase/tests/rodar-local.sh`).

## Regras já aplicadas (entrega 1)

As regras da especificação ficam no banco, para valerem para a web, o app e integrações, e são repetidas em `packages/regras` para avisar antes de salvar.

| Regra | Onde |
| --- | --- |
| CM1 área geodésica do contorno em ha; área produtiva até a área do desenho | gatilho `preparar_talhao`, `areaHa`, `validarAreaProdutiva` |
| CM2 sobreposição máxima de 0,5% entre talhões ativos da fazenda | gatilho `preparar_talhao`, `conflitosDeSobreposicao` |
| CM3 código do talhão único na fazenda | índice único |
| CM4 talhão com histórico é desativado, não excluído; divisão e união guardam origem | sem DELETE pela API, `origem_ids` |
| CM6 soma das faixas de ocupação até a área produtiva | gatilho `validar_ocupacao`, `validarOcupacao` |
| CM7 safra encerrada somente leitura; só o administrador reabre | gatilho `proteger_safra_encerrada` |
| CM8 trilha de auditoria (quem, quando, antes e depois) | tabela `auditoria` |
| Perfis por escopo (grupo, empresa, fazenda) | RLS em todas as tabelas, `MATRIZ` em `packages/regras` |
| CPF e CNPJ, inclusive CNPJ alfanumérico (2026) | `app.cpf_valido`, `app.cnpj_valido`, `validarCpf`, `validarCnpj` |
