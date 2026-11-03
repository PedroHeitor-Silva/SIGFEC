# SIGFEC publicado grátis, sem cartão de crédito (Render + Neon)

Endereço: **https://sigfec.onrender.com** — funciona 24 h, com HTTPS, mesmo com o PC desligado.

```
celular / navegador ──HTTPS──▶ Render (container: telas + API Spring Boot) ──▶ Neon (PostgreSQL, São Paulo)
```

- **Render** (`dashboard.render.com`, serviço `sigfec`, plano Free): roda o `Dockerfile` da raiz do repositório.
- **Neon** (`console.neon.tech`, projeto `morning-frost-19365626`, branch `production`): o banco do sistema online.
  A connection string fica em `.env.local` (fora do git), gerado por `neon env pull`.
- Plano grátis: depois de 15 min sem uso o sistema "dorme"; o primeiro acesso demora até ~1 min.
  Antes de apresentar, abra o site uma vez para acordá-lo.

## Variáveis do serviço no Render (Environment)
| Nome | Valor |
|---|---|
| `DB_URL` | `jdbc:postgresql://HOST-DO-NEON/neondb?sslmode=require` (endereço sem `-pooler`) |
| `DB_USER` | `neondb_owner` |
| `DB_PASSWORD` | senha do Neon (está no `.env.local`) |
| `SIGFEC_JWT_SECRET` | gerado pelo Render |
| `TZ` | `America/Sao_Paulo` |

Health check: `/api/estados`. O Render define a porta pela variável `PORT` (o backend já respeita).

## Atualizar depois de mudar o código
1. Commit e push para o GitHub (`main`).
2. Render → serviço `sigfec` → **Manual Deploy → Deploy latest commit** (o serviço usa o repositório
   público, então não atualiza sozinho). Leva ~4 min. Os dados ficam no Neon e não se perdem.

## Copiar de novo o banco do PC para a nuvem (substitui os dados online!)
```bash
bash deploy/copiar-banco-nuvem.sh
```
Cole a connection string do Neon quando pedir.

## Segurança
- Troque a senha do `admin` em Cadastros → Usuários (o sistema está na internet).
- O banco do PC e o online são independentes: o que for feito em um não aparece no outro.
