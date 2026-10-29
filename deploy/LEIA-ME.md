# Publicar o SIGFEC na Oracle Cloud (Always Free)

Resultado: o sistema completo (PostgreSQL + backend + telas/PWA) rodando 24 h numa VM grátis,
com endereço fixo e HTTPS automático, ex.: `https://152-67-10-20.sslip.io`.

```
celular / navegador ──HTTPS──▶ Caddy (443) ──┬── /        → telas (PWA)  /opt/sigfec/web
                                             └── /api/*   → Spring Boot 127.0.0.1:8080 ──▶ PostgreSQL (local)
```

---

## Parte 1 — Oracle Cloud (você faz, ~20 min)

### 1. Criar a conta
1. Acesse **https://www.oracle.com/br/cloud/free/** → *Comece gratuitamente*.
2. **Região inicial (home region): `Brazil East (São Paulo)`** — não dá para trocar depois.
3. A Oracle pede um cartão só para verificar identidade. Os recursos *Always Free* não geram cobrança.

### 2. Criar a máquina virtual
Menu ☰ → **Compute → Instances → Create instance**
- **Name:** `sigfec`
- **Image:** *Change image* → **Canonical Ubuntu 24.04**
- **Shape:** *Change shape* →
  - preferível: **Ampere → VM.Standard.A1.Flex** com **2 OCPU e 12 GB** (grátis até 4 OCPU / 24 GB);
  - se aparecer *"Out of capacity"*: **Specialty and previous generation → VM.Standard.E2.1.Micro** (AMD, 1 GB — o script de instalação já se adapta a pouca memória). Também dá para tentar o Ampere de novo mais tarde.
- **Networking:** deixe criar a VCN nova e marque **Assign a public IPv4 address**.
- **Add SSH keys:** *Generate a key pair for me* → **Save private key**.
  Salve o arquivo como **`C:\Users\pedro\.ssh\sigfec-oracle.key`**.
- **Create**. Quando ficar *Running*, copie o **Public IP address**.

### 3. Liberar HTTP/HTTPS na rede da Oracle
Na página da instância → **Subnet** (link) → **Security Lists** → *Default Security List* → **Add Ingress Rules**:

| Source CIDR | IP Protocol | Destination Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(A porta 22/SSH já vem liberada.)

---

## Parte 2 — Instalar e publicar (Git Bash, na pasta do projeto)

Troque `IP` pelo IP público da VM.

```bash
# 0) permissão da chave (só uma vez)
chmod 600 ~/.ssh/sigfec-oracle.key

# 1) instalar o servidor (só uma vez, ~5 min)
scp -i ~/.ssh/sigfec-oracle.key deploy/instalar-servidor.sh ubuntu@IP:/tmp/
ssh -i ~/.ssh/sigfec-oracle.key ubuntu@IP "sudo bash /tmp/instalar-servidor.sh"

# 2) publicar o sistema COM os dados do seu banco local (substitui o banco do servidor)
bash deploy/publicar.sh ubuntu@IP --com-dados
```

Pronto: abra **`https://IP-COM-TRACOS.sslip.io`** (o script de instalação mostra o endereço exato).

### Atualizar depois de mudar o código
```bash
bash deploy/publicar.sh ubuntu@IP            # só código (mantém os dados do servidor)
```

---

## Depois de publicar — obrigatório
1. **Troque a senha do `admin`** em Cadastros → Usuários (a senha de desenvolvimento não pode ficar na internet).
2. As senhas do banco e a chave JWT do servidor ficam em `/etc/sigfec/sigfec.env` (geradas aleatoriamente, só o root lê).

## Comandos úteis no servidor (`ssh -i ~/.ssh/sigfec-oracle.key ubuntu@IP`)
| Para | Comando |
|---|---|
| Ver se o backend está rodando | `systemctl status sigfec` |
| Ver o log do backend | `sudo journalctl -u sigfec -f` |
| Reiniciar o backend | `sudo systemctl restart sigfec` |
| Log do HTTPS (Caddy) | `sudo journalctl -u caddy -f` |
| Backup do banco | `sudo -u postgres pg_dump sigfec_db > backup.sql` |

## Observações
- **Instância ociosa:** a Oracle pode desligar VMs *Always Free* com uso de CPU muito baixo por 7 dias.
  Para evitar, dá para converter a conta para *Pay As You Go* (continua grátis dentro dos limites Always Free)
  ou simplesmente usar o sistema / ligar a VM de novo pelo painel.
- **Endereço:** `sslip.io` transforma o IP em um nome com HTTPS válido (Let's Encrypt) sem comprar domínio.
  Com domínio próprio: `DOMINIO=sigfec.seudominio.com.br sudo -E bash /tmp/instalar-servidor.sh`.
- O banco do servidor é PostgreSQL 16 (Ubuntu 24.04); o `publicar.sh` envia o dump em SQL puro, compatível.
