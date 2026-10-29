#!/usr/bin/env bash
# =============================================================================
# SIGFEC — publica o sistema no servidor (rodar no SEU PC, pelo Git Bash, na raiz do projeto)
#   bash deploy/publicar.sh ubuntu@IP_DO_SERVIDOR             atualiza front + backend
#   bash deploy/publicar.sh ubuntu@IP_DO_SERVIDOR --com-dados  idem + copia o banco local (substitui o do servidor!)
# Chave SSH: por padrão ~/.ssh/sigfec-oracle.key (mude com SSH_KEY=caminho).
# =============================================================================
set -euo pipefail

DESTINO="${1:?Informe o destino, ex.: ubuntu@152.67.10.20}"
COM_DADOS="${2:-}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/sigfec-oracle.key}"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new"
SCP="scp -i $SSH_KEY -o StrictHostKeyChecking=accept-new"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$RAIZ/deploy/.pacote"
PG_BIN="${PG_BIN:-/c/Program Files/PostgreSQL/17/bin}"

rm -rf "$TMP" && mkdir -p "$TMP"

echo ">> 1/4 Front (build de produção com PWA)"
( cd "$RAIZ/sigfec-front" && npm run build >/dev/null )
tar -C "$RAIZ/sigfec-front/dist" -czf "$TMP/web.tgz" .

echo ">> 2/4 Backend (jar)"
( cd "$RAIZ/SIGFEC-backend" && ./mvnw -o -q -DskipTests -Dmaven.compiler.release=17 package )
cp "$RAIZ"/SIGFEC-backend/target/sigfec-*.jar "$TMP/sigfec.jar"

if [ "$COM_DADOS" = "--com-dados" ]; then
  echo ">> 3/4 Banco local → arquivo SQL"
  PGPASSWORD="${PGPASSWORD:-root}" "$PG_BIN/pg_dump.exe" -U postgres -h localhost --no-owner --no-privileges \
    --format=plain -f "$TMP/banco.sql" sigfec_db
fi

echo ">> 4/4 Enviando e reiniciando no servidor"
$SCP "$TMP"/* "$DESTINO:/tmp/"
$SSH "$DESTINO" "COM_DADOS='$COM_DADOS' bash -s" <<'REMOTO'
set -e
sudo systemctl stop sigfec || true
sudo install -o sigfec -g sigfec -m 644 /tmp/sigfec.jar /opt/sigfec/app/sigfec.jar
sudo rm -rf /opt/sigfec/web/* && sudo tar -xzf /tmp/web.tgz -C /opt/sigfec/web && sudo chown -R sigfec:sigfec /opt/sigfec/web
if [ "$COM_DADOS" = "--com-dados" ]; then
  echo "   restaurando banco (substitui os dados do servidor)"
  sudo -u postgres psql -q -c "DROP DATABASE IF EXISTS sigfec_db;" -c "CREATE DATABASE sigfec_db OWNER sigfec;"
  # dump do PG 17 em servidor PG 16: linhas exclusivas do 17 (ex.: transaction_timeout) só geram aviso
  # restaura como o usuário sigfec (dono das tabelas), com a senha do /etc/sigfec/sigfec.env
  DB_SENHA="$(sudo grep ^DB_PASSWORD= /etc/sigfec/sigfec.env | cut -d= -f2-)"
  PGPASSWORD="$DB_SENHA" psql -q -h localhost -U sigfec -d sigfec_db -f /tmp/banco.sql >/dev/null 2>/tmp/restauracao.log || true
  echo "   avisos da restauração: $(grep -ciE "erro|error" /tmp/restauracao.log || true) (ver /tmp/restauracao.log)"
fi
sudo systemctl start sigfec
rm -f /tmp/sigfec.jar /tmp/web.tgz /tmp/banco.sql
echo "   aguardando o backend subir..."
for i in $(seq 1 60); do curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/estados | grep -q 200 && break; sleep 2; done
systemctl is-active sigfec
REMOTO
rm -rf "$TMP"
echo ">> Publicado."
