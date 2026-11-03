#!/usr/bin/env bash
# =============================================================================
# SIGFEC — copia o banco LOCAL para o PostgreSQL na nuvem (Neon). Rodar no Git Bash, na raiz do projeto:
#   bash deploy/copiar-banco-nuvem.sh
# Pede a "connection string" do Neon (postgresql://usuario:senha@host/banco?sslmode=require).
# ATENÇÃO: apaga as tabelas que já existirem no banco da nuvem antes de copiar.
# =============================================================================
set -euo pipefail

PG_BIN="${PG_BIN:-/c/Program Files/PostgreSQL/17/bin}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

read -r -s -p "Cole a connection string do Neon e tecle Enter: " DESTINO; echo
[ -n "$DESTINO" ] || { echo "Connection string vazia."; exit 1; }

echo ">> 1/2 Exportando o banco local (sigfec_db)"
PGPASSWORD="${PGPASSWORD:-root}" "$PG_BIN/pg_dump.exe" -U postgres -h localhost \
  --no-owner --no-privileges --clean --if-exists --format=plain -f "$TMP/banco.sql" sigfec_db

echo ">> 2/2 Enviando para a nuvem"
"$PG_BIN/psql.exe" "$DESTINO" -q -v ON_ERROR_STOP=0 -f "$TMP/banco.sql" >/dev/null 2>"$TMP/erros.log" || true
grep -iE "error|erro" "$TMP/erros.log" | grep -viE "does not exist|não existe|transaction_timeout" | head -10 || true
echo ">> Pronto. Contagem de usuários na nuvem:"
"$PG_BIN/psql.exe" "$DESTINO" -t -c "select count(*) from usuario;" 2>/dev/null || "$PG_BIN/psql.exe" "$DESTINO" -t -c "\dt"
