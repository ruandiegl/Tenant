# Deploy e operacao

## Ambientes

O projeto suporta execucao local com Docker Compose e pode ser publicado em infraestrutura que suporte Node.js, PostgreSQL e variaveis de ambiente.

Arquivos relevantes:

```txt
docker-compose.yml
backend/Dockerfile
backend/railway.json
frontend/vercel.json
```

## Docker Compose

Servicos:

- `postgres`: PostgreSQL 16.
- `backend`: API Express.
- `waha`: gateway WhatsApp.

O backend executa:

```bash
npx prisma migrate deploy && node dist/src/server.js
```

## Backend

Build:

```bash
cd backend
npm run build
```

Start:

```bash
npm run start
```

Deploy de migrations:

```bash
npm run prisma:deploy
```

## Frontend

Build:

```bash
cd frontend
npm run build
```

Preview:

```bash
npm run preview
```

## Variaveis obrigatorias em producao

Backend:

```txt
DATABASE_URL
JWT_SECRET
CORS_ORIGIN
FRONTEND_URL
PUBLIC_BACKEND_URL
WAHA_BASE_URL
WAHA_API_KEY
WAHA_WEBHOOK_SECRET
```

Frontend:

```txt
VITE_API_BASE_URL
VITE_DEMO_TENANT_SLUG
```

## Observabilidade minima

Manter visiveis:

- logs HTTP do backend;
- falhas de Prisma;
- falhas de webhook WAHA;
- erros 401/403 anormais;
- falhas de envio WhatsApp;
- tempo de resposta em pedidos e cardapio.

## Checklist de deploy

- `npm run build` no backend.
- `npm run build` no frontend.
- Migrations revisadas.
- Env vars configuradas.
- CORS apontando para frontend correto.
- `PUBLIC_BACKEND_URL` acessivel externamente quando usado por webhook.
- WAHA acessivel pelo backend.
- Healthcheck respondendo.
- Seed executado apenas quando apropriado.

## Cuidados

- Nunca usar segredo demo em producao.
- Nunca apontar frontend de producao para backend local.
- Nao rodar `migrate dev` em producao.
- Nao apagar volume do Postgres sem backup.
- Validar webhooks antes de habilitar automacoes WhatsApp.

