# Ambiente de desenvolvimento

## Pre-requisitos

- Node.js compativel com o projeto.
- npm.
- Docker e Docker Compose.
- PostgreSQL local ou container.
- Acesso a WAHA quando for desenvolver WhatsApp.

## Subir com Docker

Na raiz do projeto:

```bash
docker compose up --build
```

Servicos:

- Postgres: `localhost:5433`
- Backend: `http://localhost:3333`
- WAHA: `http://localhost:3000`

Endpoints uteis:

```txt
http://localhost:3333/health
http://localhost:3333/docs
```

## Backend local

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run seed
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
```

## Frontend local

```bash
cd frontend
npm install
npm run dev
```

Scripts:

```bash
npm run dev
npm run build
npm run preview
```

## Variaveis do backend

Definidas em `backend/src/config/env.ts`:

```txt
NODE_ENV
PORT
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
CORS_ORIGIN
FRONTEND_URL
PUBLIC_BACKEND_URL
WAHA_BASE_URL
WAHA_API_KEY
WAHA_WEBHOOK_SECRET
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
```

## Variaveis do frontend

Padroes usadas pelos services:

```txt
VITE_API_BASE_URL
VITE_DEMO_TENANT_SLUG
VITE_DEMO_EMAIL
VITE_DEMO_PASSWORD
VITE_DEMO_BRANCH_ID
```

## Dados de seed

O seed cria:

- planos `TRIAL`, `BASIC`, `PRO`, `ENTERPRISE`;
- permissoes `platform.*` e `tenant.*`;
- tenant demo `demo-burger`;
- admin tenant `admin@demo.local`;
- superadmin padrao `superadmin@podepedir.local`, se nao configurado por env;
- filial, categoria, produto e cupom demo.

## Checklist antes de desenvolver

- Rodar `git status --short` e observar mudancas existentes.
- Confirmar se a task e backend, frontend, banco ou fluxo completo.
- Ler docs relacionadas antes de alterar arquivos.
- Evitar tocar em arquivos nao relacionados.
- Rodar build/lint proporcional ao risco da mudanca.

