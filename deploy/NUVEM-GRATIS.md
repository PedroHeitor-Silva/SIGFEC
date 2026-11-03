# Publicar o SIGFEC grátis, sem cartão de crédito (Neon + Koyeb)

Resultado: o sistema fica no ar 24 h, com endereço fixo e HTTPS, e funciona com o seu PC desligado.
O endereço fica parecido com `https://sigfec-seunome.koyeb.app`.

```
celular / navegador ──HTTPS──▶ Koyeb (container: telas + API Spring Boot) ──▶ Neon (PostgreSQL)
```

- **Neon**: PostgreSQL grátis e permanente, sem cartão.
- **Koyeb**: roda o `Dockerfile` da raiz do repositório, plano grátis, sem cartão.
- Plano grátis: se ninguém usar o sistema por um tempo, ele "dorme". O primeiro acesso depois disso demora
  cerca de 1 minuto. Antes de apresentar, abra o sistema uma vez para acordá-lo.

---

## 1. Banco no Neon (~5 min)
1. Acesse **https://neon.com** → *Sign up* → **Continue with GitHub**.
2. Crie um projeto:
   - **Name:** `sigfec`
   - **Postgres version:** 17
   - **Region:** **AWS US East (N. Virginia)**. Fica ao lado da região grátis da Koyeb (Washington).
     Banco e sistema perto um do outro deixam as telas rápidas.
3. No painel do projeto, clique em **Connect**. Desmarque *Connection pooling* e copie a **connection string**.
   Ela tem este formato: `postgresql://USUARIO:SENHA@HOST/neondb?sslmode=require`.
   Anote também o **HOST**, o **USUARIO** e a **SENHA**, que aparecem dentro dela.

## 2. Copiar os dados do seu PC para o Neon (Git Bash, na pasta do projeto)
```bash
bash deploy/copiar-banco-nuvem.sh
```
Cole a connection string quando o script pedir. Ela não aparece na tela.

## 3. Sistema no Koyeb (~10 min)
1. Acesse **https://www.koyeb.com** → *Sign up* → **Continue with GitHub**.
2. Clique em **Create Web Service** → **GitHub** → escolha o repositório **SIGFEC**
   (autorize o acesso da Koyeb ao repositório, se ela pedir).
3. Configure:
   - **Builder:** *Dockerfile* (o arquivo fica na raiz do repositório)
   - **Instance:** **Free** · **Region:** **Washington, D.C.**
   - **Exposed port:** `8080` (HTTP)
   - **Health check:** HTTP, caminho `/api/estados`
4. Em **Environment variables**, adicione:

| Nome | Valor |
|---|---|
| `DB_URL` | `jdbc:postgresql://HOST/neondb?sslmode=require` |
| `DB_USER` | o USUARIO do Neon |
| `DB_PASSWORD` | a SENHA do Neon |
| `SIGFEC_JWT_SECRET` | um texto aleatório com 40 caracteres ou mais |

   Em `DB_URL`, use só o HOST. Usuário e senha ficam nas outras duas variáveis.
5. Clique em **Deploy**. O primeiro build demora de 5 a 10 minutos. Quando aparecer **Healthy**, abra o endereço `*.koyeb.app`.

## 4. Depois de publicar (obrigatório)
1. Entre como `admin` e **troque a senha** em Cadastros → Usuários.
2. Se o PIX ou o boleto não funcionar, vá em **Configurações** e cole a chave do Asaas de novo.
3. Instale o app no celular **por esse endereço novo**. Antes, desinstale o app antigo.

## Atualizar depois de mudar o código
Faça o commit e o push para o GitHub. A Koyeb faz um novo deploy sozinha.
Os dados ficam no Neon e não se perdem.
