#!/usr/bin/env bash
# =============================================================================
# SIGFEC — instalação do servidor (rodar UMA vez na VM Ubuntu da Oracle Cloud)
#   sudo bash instalar-servidor.sh
# Instala: Java 21, PostgreSQL, Caddy (HTTPS automático) e o serviço systemd do backend.
# Gera senhas aleatórias para o banco e para o JWT em /etc/sigfec/sigfec.env.
# =============================================================================
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Rode com sudo: sudo bash $0"; exit 1; fi

IP_PUBLICO="$(curl -s -4 https://ifconfig.me || true)"
if [ -z "$IP_PUBLICO" ]; then echo "Não consegui descobrir o IP público."; exit 1; fi
DOMINIO="${DOMINIO:-$(echo "$IP_PUBLICO" | tr '.' '-').sslip.io}"   # ex.: 152-67-10-20.sslip.io (HTTPS grátis)
echo ">> IP público: $IP_PUBLICO  |  endereço: https://$DOMINIO"

echo ">> Pacotes base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y openjdk-21-jre-headless postgresql postgresql-contrib curl gnupg debian-keyring debian-archive-keyring apt-transport-https iptables-persistent

echo ">> Caddy (servidor web com HTTPS automático)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo ">> Memória: VM pequena (AMD Micro, 1 GB) ganha swap de 2 GB e Java mais enxuto"
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 3000 ]; then
  JAVA_MEM="-Xms128m -Xmx384m -XX:+UseSerialGC"
  if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab; fi
else
  JAVA_MEM="-Xms256m -Xmx1024m"
fi
echo "   RAM: ${MEM_MB} MB → Java: $JAVA_MEM"

echo ">> Usuário e pastas do sistema"
id sigfec >/dev/null 2>&1 || useradd --system --home /opt/sigfec --shell /usr/sbin/nologin sigfec
mkdir -p /opt/sigfec/app /opt/sigfec/web /etc/sigfec
chown -R sigfec:sigfec /opt/sigfec

echo ">> Banco de dados (somente acesso local)"
if [ ! -f /etc/sigfec/sigfec.env ]; then
  DB_SENHA="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 28)"
  JWT="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sigfec') THEN
    CREATE ROLE sigfec LOGIN PASSWORD '${DB_SENHA}';
  ELSE
    ALTER ROLE sigfec PASSWORD '${DB_SENHA}';
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='sigfec_db'" | grep -q 1 \
    || sudo -u postgres createdb -O sigfec sigfec_db
  cat > /etc/sigfec/sigfec.env <<ENV
DB_URL=jdbc:postgresql://localhost:5432/sigfec_db
DB_USER=sigfec
DB_PASSWORD=${DB_SENHA}
SIGFEC_JWT_SECRET=${JWT}
SIGFEC_CORS_ORIGENS=https://${DOMINIO}
SERVER_ADDRESS=127.0.0.1
PORT=8080
# Opcional: chave do Asaas (sandbox) para cobranças PIX/Boleto
# ASAAS_API_KEY=
ENV
  chmod 600 /etc/sigfec/sigfec.env
  echo "   senhas geradas em /etc/sigfec/sigfec.env"
else
  echo "   /etc/sigfec/sigfec.env já existe — mantido"
fi

echo ">> Serviço do backend (inicia com o servidor e reinicia se cair)"
cat > /etc/systemd/system/sigfec.service <<UNIT
[Unit]
Description=SIGFEC backend (Spring Boot)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
User=sigfec
WorkingDirectory=/opt/sigfec/app
EnvironmentFile=/etc/sigfec/sigfec.env
ExecStart=/usr/bin/java ${JAVA_MEM} -jar /opt/sigfec/app/sigfec.jar
Restart=always
RestartSec=5
SuccessExitStatus=143

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable sigfec >/dev/null

echo ">> Caddy: front (PWA) + /api para o backend, HTTPS automático"
cat > /etc/caddy/Caddyfile <<CADDY
${DOMINIO} {
    encode gzip
    handle /api/* {
        reverse_proxy 127.0.0.1:8080
    }
    handle {
        root * /opt/sigfec/web
        @sw path /sw.js /manifest.webmanifest /index.html
        header @sw Cache-Control "no-cache"
        try_files {path} /index.html
        file_server
    }
}
CADDY
systemctl enable caddy >/dev/null
systemctl restart caddy

echo ">> Firewall da VM: libera 80 e 443 (a imagem Ubuntu da Oracle bloqueia por padrão)"
for P in 80 443; do
  iptables -C INPUT -p tcp --dport $P -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp --dport $P -j ACCEPT
done
netfilter-persistent save >/dev/null

echo
echo "============================================================"
echo " Servidor pronto. Endereço do sistema: https://${DOMINIO}"
echo " Agora, no seu PC, rode:  bash deploy/publicar.sh ubuntu@${IP_PUBLICO} --com-dados"
echo "============================================================"
