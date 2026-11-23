#!/usr/bin/env bash
# Roda as migrações e os testes pgTAP num Postgres local com PostGIS e pgTAP,
# sem Docker. Útil quando o Supabase CLI não está disponível.
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash supabase/local/rodar-testes.sh
# Com Docker, prefira: supabase start && supabase test db
set -euo pipefail
cd "$(dirname "$0")/.."

BANCO="${BANCO_TESTE:-campocerto_teste}"
export PGHOST="${PGHOST:-localhost}" PGUSER="${PGUSER:-postgres}"

dropdb --if-exists "$BANCO"
createdb "$BANCO"
sed "s/current_database_placeholder/$BANCO/" local/simulacao-supabase.sql | psql -q -v ON_ERROR_STOP=1 -d "$BANCO" >/dev/null
for m in migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$BANCO" -f "$m" >/dev/null
done
psql -q -v ON_ERROR_STOP=1 -d "$BANCO" -f seed.sql >/dev/null 2>&1 || {
  echo "seed.sql falhou:"; psql -v ON_ERROR_STOP=1 -d "$BANCO" -f seed.sql; exit 1; }
pg_prove -d "$BANCO" tests/database/*.test.sql
