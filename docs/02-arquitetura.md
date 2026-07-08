# Arquitetura

## Visao macro

```txt
Browser
  |
  | React/Vite
  v
Frontend
  |
  | REST + Socket.IO
  v
Backend Express
  |
  | Prisma Client
  v
PostgreSQL

Backend Express
  |
  | HTTP API
  v
WAHA / WhatsApp
```

## Backend

O backend fica em `backend/` e usa uma arquitetura modular:

```txt
src/
  app.ts
  server.ts
  config/
  modules/
  shared/
```

Responsabilidades:

- `app.ts`: middlewares globais, rotas, Swagger, healthcheck e arquivos estaticos.
- `server.ts`: servidor HTTP, Socket.IO e shutdown.
- `config/`: env, CORS, JWT, Prisma, Socket.IO, Swagger.
- `modules/`: dominios da aplicacao.
- `shared/`: erros, middlewares, tipos e utilitarios compartilhados.

## Frontend

O frontend fica em `frontend/` e usa React com organizacao por areas:

```txt
src/
  app/
  components/
  hooks/
  pages/
  routes/
  services/
  types/
  utils/
```

Responsabilidades:

- `routes/`: rotas publicas e protegidas.
- `pages/`: telas de cliente, admin, cozinha, superadmin e auth.
- `services/`: acesso HTTP e mapeamento de contratos.
- `app/providers/`: estado global e contexto.
- `components/`: componentes reutilizaveis.
- `types/`: tipos compartilhados do frontend.
- `utils/`: formatacao, mascaras, dinheiro, rotas publicas e datas.

## Banco de dados

O schema Prisma fica em `backend/prisma/schema.prisma`.

Padroes:

- entidades de negocio com `tenantId`;
- IDs com `cuid()`;
- enums para status;
- indices por `tenantId` + campos de busca/status;
- soft delete com `deletedAt` quando historico importa;
- migrations versionadas em `backend/prisma/migrations`.

## Comunicacao

REST:

- chamadas publicas usam `api()`;
- chamadas protegidas usam `protectedApi()`;
- o token vai em `Authorization`;
- o tenant vai em `x-tenant-id`.

Socket.IO:

- backend valida JWT no handshake;
- rooms por tenant, filial, cozinha e pedido;
- usado para pedidos e cozinha.

WhatsApp:

- backend integra com WAHA;
- sessoes e templates ficam no banco;
- webhooks entram por rota publica;
- eventos importantes podem disparar mensagens.

## Principios arquiteturais

- Separar dominio por modulo.
- Evitar regra de negocio em controllers.
- Manter validacao de entrada proxima das rotas.
- Isolar contratos HTTP em services no frontend.
- Nao acessar Prisma fora da camada de service do backend.
- Nao misturar dados de tenants.
- Evitar refactors globais junto com features pontuais.

