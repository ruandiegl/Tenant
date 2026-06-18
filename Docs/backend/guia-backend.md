# Guia do Backend

Este documento explica de forma simples o backend criado para o sistema multi tenant de gerenciamento de pedidos.

## O que foi criado

Foi criado um backend em `backend/` com API REST, banco PostgreSQL via Prisma, documentacao Swagger e comunicacao em tempo real com Socket.IO.

A raiz do projeto tambem recebeu um `docker-compose.yml` para subir PostgreSQL e backend posteriormente com Docker.

## Pastas principais

```txt
backend/
  src/
    app.ts
    server.ts
    config/
    modules/
    shared/
  prisma/
    schema.prisma
    seed.ts
    migrations/
  package.json
  Dockerfile
```

## Banco de dados

O banco usado e PostgreSQL.

A conexao padrao esta em `backend/.env.example`:

```txt
DATABASE_URL=postgresql://podepedir:Conquistas%4007@localhost:5433/podepedir?schema=public
```

O schema Prisma fica em:

```txt
backend/prisma/schema.prisma
```

A migration inicial fica em:

```txt
backend/prisma/migrations/20260618120000_init_postgresql_multi_tenant/migration.sql
```

## Como rodar com Docker

Na raiz do projeto:

```bash
docker compose up --build
```

Servicos criados:

- PostgreSQL em `localhost:5433`
- Backend em `localhost:3333`

Depois que subir, acesse:

```txt
http://localhost:3333/health
http://localhost:3333/docs
```

## Como rodar localmente sem Docker

Entre na pasta do backend:

```bash
cd backend
```

Crie um `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Instale dependencias:

```bash
npm install
```

Gere o Prisma Client:

```bash
npx prisma generate
```

Rode migrations:

```bash
npx prisma migrate dev
```

Rode o seed:

```bash
npm run seed
```

Suba a API:

```bash
npm run dev
```

## Usuario de demonstracao

O seed cria:

```txt
Tenant: demo-burger
Email: admin@demo.local
Senha: admin123
Cupom: BEMVINDO10
```

Login:

```http
POST /auth/login
```

Body:

```json
{
  "email": "admin@demo.local",
  "password": "admin123",
  "tenantSlug": "demo-burger"
}
```

Use o token retornado como Bearer Token nos endpoints protegidos.

## Endpoints principais

Saude e docs:

```txt
GET /health
GET /docs
```

Autenticacao:

```txt
POST /auth/login
GET /auth/me
POST /auth/logout
```

Tenant:

```txt
GET /tenants/:slug/public
POST /admin/tenants
GET /admin/tenants
PATCH /admin/tenants/:id
```

Usuarios:

```txt
POST /tenant/users
GET /tenant/users
PATCH /tenant/users/:id
```

Filiais:

```txt
POST /tenant/branches
GET /tenant/branches
PATCH /tenant/branches/:id
```

Menu:

```txt
POST /tenant/menu/categories
GET /tenant/menu/categories
POST /tenant/menu/products
GET /tenant/menu/products
PATCH /tenant/menu/products/:id
GET /public/:tenantSlug/menu
```

Pedidos:

```txt
POST /public/:tenantSlug/orders
GET /public/:tenantSlug/orders/:publicCode
GET /tenant/orders
GET /tenant/orders/:id
PATCH /tenant/orders/:id/status
POST /tenant/orders/:id/cancel
```

Cozinha:

```txt
GET /tenant/kitchen/orders
PATCH /tenant/kitchen/orders/:id/status
```

Cupons, relatorios e auditoria:

```txt
POST /tenant/coupons
GET /tenant/coupons
GET /tenant/reports/summary
GET /tenant/audit-logs
```

## Como funciona o multi tenant

As tabelas de negocio possuem `tenantId`.

Nos endpoints protegidos, o tenant vem de uma destas formas:

- do token JWT gerado no login;
- do header `x-tenant-id`, quando necessario.

Se o header informar um tenant diferente do token, a API bloqueia a requisicao.

## Como funciona pedido e cozinha

Quando um pedido publico e criado:

1. A API identifica o tenant pelo slug.
2. Valida filial e produtos.
3. Calcula subtotal, adicionais, desconto, taxa de entrega e total.
4. Salva snapshot de nome e preco dos produtos.
5. Cria `OrderStatusHistory`.
6. Cria um `KitchenTicket`.
7. Emite evento Socket.IO para tenant, filial, cozinha e pedido.

## Eventos Socket.IO

Rooms usadas:

```txt
tenant:{tenantId}
branch:{branchId}
kitchen:{branchId}
order:{orderId}
```

Eventos emitidos:

```txt
order.created
order.status_changed
order.cancelled
kitchen.order_queued
kitchen.order_started
kitchen.order_ready
```

Eventos recebidos:

```txt
tenant.subscribe
kitchen.subscribe
order.subscribe
order.unsubscribe
```

## Comandos uteis

Dentro de `backend/`:

```bash
npm run dev
npm run build
npm run start
npm run seed
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

## O que ainda pode evoluir

- Integrar Clerk como provedor gerenciado de autenticacao.
- Criar testes automatizados de integracao.
- Expandir Swagger com todos os exemplos de resposta.
- Implementar pagamentos com gateway real.
- Implementar relatorios exportaveis.
- Criar rotas completas para settings, notificacoes e payments.
- Refinar autorizacao por filial em todos os fluxos operacionais.
