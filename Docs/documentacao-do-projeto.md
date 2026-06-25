# Documentacao geral do projeto PodePedir

## Visao geral

O PodePedir e uma aplicacao web multi tenant para operacoes de pedidos, pensada principalmente para restaurantes, lanchonetes, dark kitchens e negocios similares.

O sistema separa tres experiencias principais:

- Cliente: consulta cardapio publico, monta carrinho, finaliza pedido e acompanha status.
- Cozinha: visualiza fila operacional e atualiza etapas de preparo.
- Admin: acompanha dashboard, gerencia pedidos, cardapio, filiais, cupons e configuracoes.

A base tecnica atual esta dividida em `backend/`, `frontend/` e `Docs/`, com banco PostgreSQL via Prisma, API REST em Express, autenticacao JWT propria e frontend React com Vite.

## Estado atual da implementacao

O PRD original cita algumas intencoes como MySQL e Clerk. A implementacao atual, porem, usa:

- PostgreSQL como banco real.
- Prisma ORM para schema, migrations e seed.
- JWT proprio para autenticacao.
- Socket.IO configurado no backend.
- Frontend React consumindo API REST.
- Socket do frontend ainda simulado em `SocketProvider`, sem conexao real com `socket.io-client`.

Funcionalidades ja implementadas no codigo:

- Login de usuario interno.
- Isolamento por tenant via `tenantId`.
- Permissoes por role.
- CRUD basico de tenants, usuarios, filiais, categorias, produtos, templates de produto e cupons.
- Cardapio publico por slug de tenant.
- Criacao publica de pedido.
- Calculo de totais, descontos, entrega e snapshots de itens.
- Baixa simples de estoque no pedido.
- Historico de status do pedido.
- Criacao de ticket de cozinha.
- Fila da cozinha e atualizacao de status.
- Relatorio resumido por periodo.
- Auditoria de acoes registradas.
- Swagger em `/docs`.
- Upload local de imagens de produto em `backend/uploads`.

Funcionalidades modeladas no banco, mas ainda nao completas nas telas ou rotas:

- Pagamentos reais e estornos.
- Notificacoes persistentes.
- Carrinho persistente no backend.
- Clientes autenticados.
- Preferencias de notificacao.
- Webhooks externos.
- Estacoes avancadas de cozinha.
- Configuracoes completas de tenant e filial.

## Estrutura de pastas

```txt
.
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
    uploads/
    package.json
    Dockerfile

  frontend/
    src/
      app/
      components/
      data/
      pages/
      routes/
      services/
      types/
      utils/
      App.tsx
      main.tsx
      styles.css
    public/
    package.json
    vite.config.ts

  Docs/
    agents/
    backend/
    anotacoes-gerais/
    prd.md
    documentacao-do-projeto.md

  docker-compose.yml
  prd.md
```

## Stack tecnica

Backend:

- Node.js com TypeScript.
- Express para API HTTP.
- Prisma Client e migrations.
- PostgreSQL.
- Socket.IO.
- Swagger UI e swagger-jsdoc.
- Zod para validacao de payloads.
- JWT com `jsonwebtoken`.
- `bcryptjs` para senha.
- Helmet, CORS, Morgan e rate limit.

Frontend:

- React 19.
- TypeScript.
- Vite.
- React Router.
- TanStack React Query.
- React Toastify.
- Lucide React.
- Socket.IO client instalado, mas ainda nao conectado na camada de provider.

Infra local:

- Docker Compose com Postgres e backend.
- Banco exposto localmente na porta `5433`.
- Backend padrao na porta `3333`.
- Frontend Vite padrao na porta `5173`.

## Como rodar

### Com Docker

Na raiz:

```bash
docker compose up --build
```

Servicos esperados:

- PostgreSQL: `localhost:5433`
- Backend: `http://localhost:3333`
- Healthcheck: `http://localhost:3333/health`
- Swagger: `http://localhost:3333/docs`

### Backend local

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

Scripts importantes:

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

### Frontend local

```bash
cd frontend
npm install
npm run dev
```

Scripts importantes:

```bash
npm run dev
npm run build
npm run preview
```

## Variaveis de ambiente

Backend, em `backend/src/config/env.ts`:

```txt
NODE_ENV
PORT
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
CORS_ORIGIN
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
```

Frontend, em `frontend/src/services/api.ts` e servicos relacionados:

```txt
VITE_API_BASE_URL
VITE_DEMO_TENANT_SLUG
VITE_DEMO_EMAIL
VITE_DEMO_PASSWORD
VITE_DEMO_BRANCH_ID
```

Valores padrao usados pelo frontend quando envs nao existem:

```txt
VITE_API_BASE_URL=http://localhost:3333
VITE_DEMO_TENANT_SLUG=demo-burger
VITE_DEMO_EMAIL=admin@demo.local
VITE_DEMO_PASSWORD=admin123
```

## Dados de demonstracao

O seed cria uma base funcional:

```txt
Tenant: Demo Burger
Slug: demo-burger
Usuario: admin@demo.local
Senha: admin123
Filial: matriz
Cupom: BEMVINDO10
Produto: Burger Classico
```

Tambem cria permissoes base e roles:

- `admin`: recebe todas as permissoes.
- `kitchen`: recebe permissoes de pedidos e cozinha.

## Backend

### Pontos de entrada

- `backend/src/app.ts`: configura middlewares globais, healthcheck, Swagger, arquivos estaticos e rotas.
- `backend/src/server.ts`: cria servidor HTTP, conecta Socket.IO e inicializa a API.
- `backend/src/config/env.ts`: valida variaveis de ambiente com Zod.
- `backend/src/config/prisma.ts`: instancia Prisma Client.
- `backend/src/config/jwt.ts`: gera e valida tokens JWT.
- `backend/src/config/socket.ts`: configura Socket.IO e rooms.
- `backend/src/config/swagger.ts`: configura documentacao Swagger.

### Middlewares compartilhados

- `auth.middleware.ts`: valida Bearer token, busca usuario, role, tenant e permissoes.
- `tenant.middleware.ts`: resolve `tenantId` pelo token ou header `x-tenant-id` e bloqueia divergencia.
- `validate.middleware.ts`: valida body, params e query com schemas Zod.
- `rate-limit.middleware.ts`: aplica limite em endpoints publicos.
- `error.middleware.ts`: padroniza erros de validacao, erros conhecidos e erro interno.

### Modelo de autenticacao

O login acontece em `POST /auth/login`.

O token gerado carrega dados suficientes para identificar o usuario e o tenant. Em rotas protegidas, o backend consulta o banco para confirmar:

- usuario ativo;
- vinculo ativo com tenant;
- role;
- permissoes atuais.

Nas chamadas protegidas, o frontend envia:

```txt
Authorization: Bearer <token>
x-tenant-id: <tenantId>
```

### Modelo multi tenant

A maioria das entidades de negocio possui `tenantId`.

O padrao de seguranca e:

- endpoint protegido passa por autenticacao;
- tenant e resolvido por token/header;
- query Prisma filtra pelo `tenantId`;
- permissao e verificada antes do controller;
- se header e token divergirem, a API retorna erro.

### Rotas implementadas

Saude e documentacao:

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

Tenants:

```txt
GET /tenants/:slug/public
GET /admin/tenants
POST /admin/tenants
PATCH /admin/tenants/:id
```

Usuarios:

```txt
GET /tenant/users
POST /tenant/users
PATCH /tenant/users/:id
```

Filiais:

```txt
GET /tenant/branches
POST /tenant/branches
PATCH /tenant/branches/:id
```

Cardapio administrativo:

```txt
GET /tenant/menu/categories
POST /tenant/menu/categories
PATCH /tenant/menu/categories/:id
DELETE /tenant/menu/categories/:id

GET /tenant/menu/templates
POST /tenant/menu/templates
PATCH /tenant/menu/templates/:id
DELETE /tenant/menu/templates/:id

GET /tenant/menu/products
POST /tenant/menu/products
PATCH /tenant/menu/products/:id
DELETE /tenant/menu/products/:id
```

Cardapio publico:

```txt
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

Cupons:

```txt
GET /tenant/coupons
POST /tenant/coupons
```

Relatorios:

```txt
GET /tenant/reports/summary
```

Auditoria:

```txt
GET /tenant/audit-logs
```

### Modulos do backend

`auth`:

- Login com email, senha e `tenantSlug` opcional.
- Retorno do usuario atual.
- Logout sem persistencia de sessao no backend.
- Middleware de permissao.

`tenants`:

- Criacao, listagem e atualizacao de tenants.
- Consulta publica por slug com dados basicos, settings e filiais.

`users`:

- Criacao de usuario interno do tenant.
- Listagem de usuarios do tenant.
- Atualizacao de usuario/vinculo.

`branches`:

- Criacao e atualizacao de filiais.
- Listagem por tenant.
- Dados de endereco e operacao.

`menu`:

- Categorias.
- Produtos.
- Templates de produto.
- Grupos de opcoes e itens de opcao.
- Disponibilidade por filial.
- Upload local em base64 para imagens recebidas pelo frontend.
- Soft delete operacional por status/deletedAt.
- Cardapio publico agrupado por categoria.

`orders`:

- Criacao publica de pedido.
- Validacao de tenant, filial, produtos e opcoes.
- Calculo de subtotal, adicionais, cupom, frete e total.
- Persistencia de endereco de entrega quando aplicavel.
- Snapshot de nome, preco e opcoes dos itens.
- Criacao de historico inicial.
- Criacao de `KitchenTicket`.
- Baixa simples de estoque.
- Listagem administrativa por tenant, status, filial e periodo.
- Consulta publica por codigo.
- Alteracao e cancelamento de status.
- Emissao de eventos Socket.IO.

`kitchen`:

- Lista pedidos/tickets da cozinha.
- Atualiza status operacional do ticket e do pedido.
- Emite eventos para cozinha e acompanhamento do pedido.

`coupons`:

- Criacao de cupom.
- Listagem de cupons por tenant.
- Suporte no modelo para percentual, valor fixo e frete gratis.

`reports`:

- Agrupamento de pedidos por status.
- Agrupamento por tipo.
- Receita, ticket medio, pedidos abertos e cancelados.
- Taxa de cancelamento.
- Tempo medio de preparo.
- Produtos mais vendidos.
- Pagamentos por metodo.
- Vendas por hora.

`audit`:

- Listagem de logs por tenant.
- O modelo de banco esta pronto para rastrear entidade, acao, antes/depois, IP e usuario.

## Banco de dados

O schema principal fica em:

```txt
backend/prisma/schema.prisma
```

Provider atual:

```txt
postgresql
```

### Entidades principais

Plataforma:

- `Plan`
- `Tenant`
- `TenantSettings`

Usuarios e acesso:

- `User`
- `TenantUser`
- `Role`
- `Permission`
- `RolePermission`
- `UserSession`

Operacao:

- `Branch`
- `Address`
- `BusinessHour`
- `DeliveryZone`

Clientes:

- `Customer`
- `CustomerAddress`
- `CustomerFavoriteProduct`

Cardapio:

- `MenuCategory`
- `Product`
- `ProductAvailability`
- `OptionGroup`
- `OptionItem`
- `ProductImage`
- `ProductTemplate`
- `ProductTemplateItem`

Carrinho:

- `Cart`
- `CartItem`
- `CartItemOption`

Pedidos:

- `Order`
- `OrderItem`
- `OrderItemOption`
- `OrderStatusHistory`
- `OrderNote`

Cozinha:

- `KitchenTicket`
- `KitchenStation`
- `KitchenTicketItem`

Pagamentos:

- `PaymentMethod`
- `Payment`
- `PaymentAttempt`
- `Refund`

Marketing e comunicacao:

- `Coupon`
- `CouponRedemption`
- `Notification`
- `NotificationPreference`

Auditoria e integracoes:

- `AuditLog`
- `WebhookEvent`

### Enums importantes

- `TenantStatus`: `ACTIVE`, `SUSPENDED`, `CANCELLED`, `TRIAL`
- `RecordStatus`: `ACTIVE`, `INACTIVE`, `ARCHIVED`
- `UserStatus`: `ACTIVE`, `INVITED`, `SUSPENDED`, `DISABLED`
- `BranchStatus`: `ACTIVE`, `INACTIVE`, `CLOSED_TEMPORARILY`
- `ProductStatus`: `ACTIVE`, `INACTIVE`, `OUT_OF_STOCK`, `ARCHIVED`
- `CartStatus`: `ACTIVE`, `CHECKED_OUT`, `ABANDONED`, `EXPIRED`
- `OrderType`: `DELIVERY`, `PICKUP`, `DINE_IN`
- `OrderStatus`: `DRAFT`, `PLACED`, `ACCEPTED`, `REJECTED`, `PREPARING`, `READY`, `DISPATCHED`, `DELIVERED`, `COMPLETED`, `CANCELLED`
- `OrderSource`: `WEB`, `ADMIN`, `KIOSK`, `API`
- `PaymentStatus`: `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CANCELLED`
- `PaymentType`: `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `PIX`, `VOUCHER`, `ONLINE`
- `DiscountType`: `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_DELIVERY`
- `NotificationType`: `ORDER`, `PAYMENT`, `SYSTEM`, `PROMOTION`
- `KitchenTicketStatus`: `QUEUED`, `STARTED`, `READY`, `DELAYED`, `CANCELLED`
- `KitchenTicketPriority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`

## Socket.IO

O backend esta configurado em `backend/src/config/socket.ts`.

Autenticacao:

- O socket valida token via `socket.handshake.auth.token` ou header `Authorization`.
- Se o token for invalido, a conexao e rejeitada.

Rooms:

```txt
tenant:{tenantId}
branch:{branchId}
kitchen:{branchId}
order:{orderId}
```

Eventos recebidos pelo backend:

```txt
tenant.subscribe
kitchen.subscribe
order.subscribe
order.unsubscribe
```

Eventos emitidos pelo backend:

```txt
order.created
order.status_changed
order.cancelled
kitchen.order_queued
kitchen.order_started
kitchen.order_ready
```

Observacao importante: o frontend tem `socket.io-client` instalado e `frontend/src/services/socket.ts`, mas o provider atual `frontend/src/app/providers/socket-provider.tsx` ainda e um mock que apenas registra eventos no console. Para tempo real completo no navegador, esse provider precisa ser conectado ao backend.

## Frontend

### Pontos de entrada

- `frontend/src/main.tsx`: monta a aplicacao.
- `frontend/src/App.tsx`: renderiza rotas globais.
- `frontend/src/routes/index.tsx`: define todas as rotas.
- `frontend/src/app/providers/app-providers.tsx`: compoe React Query, tenant, auth, catalogo, fluxo do cliente, socket e toasts.
- `frontend/src/styles.css`: estilos globais.

### Rotas

Publicas e cliente:

```txt
/
/cliente
/cliente/menu
/cliente/carrinho
/cliente/carrinho/endereco
/cliente/carrinho/pagamento
/cliente/carrinho/confirmacao
/cliente/perfil
/cliente/pedido
/cliente/pedido/:publicCode
```

Autenticacao:

```txt
/login
```

Cozinha:

```txt
/cozinha
```

Admin:

```txt
/admin
/admin/pedidos
/admin/cardapio
/admin/cozinha
/admin/config
```

Rotas protegidas usam `ProtectedRoute` com permissoes como:

- `tenant.reports.read`
- `tenant.orders.read`
- `tenant.menu.read`
- `tenant.kitchen.read`
- `tenant.branches.read`

### Providers

`TenantProvider`:

- Carrega dados publicos do tenant.
- Usa fallback de mock quando necessario.

`AuthProvider`:

- Consulta usuario atual.
- Faz login.
- Mantem sessao via localStorage.
- Expoe `user`, `login`, `logout` e estado de carregamento.

`CatalogProvider`:

- Carrega cardapio publico por padrao.
- Carrega cardapio admin quando necessario.
- Mantem categorias, produtos e disponibilidade.
- Cria, atualiza e remove categorias/produtos.
- Gera grupos de opcoes a partir de ingredientes e complementos.
- Faz baixa local otimista de estoque apos pedido.

`CustomerFlowProvider`:

- Mantem carrinho em memoria.
- Mantem endereco, pagamento e perfil do cliente.
- Calcula subtotal, entrega, desconto e total no frontend.
- Envia pedido publico para backend.
- Limpa carrinho apos pedido criado.

`SocketProvider`:

- Atualmente mockado.
- Expoe `connected`, `lastEvent` e `emit`.

### Servicos HTTP

`api.ts`:

- Define URL base.
- Gerencia token e tenantId no localStorage.
- Faz login demo.
- Expõe `api` para rotas publicas e `protectedApi` para rotas autenticadas.

`auth.ts`:

- Mapeia `/auth/me` para o formato de usuario do frontend.
- Encapsula login/logout/me.

`tenants.ts`:

- Busca dados publicos do tenant.

`menu.ts`:

- Busca cardapio publico.
- Busca cardapio administrativo.
- Cria, edita e remove categorias/produtos/templates.
- Normaliza dinheiro, imagens, availability e option groups.

`orders.ts`:

- Lista pedidos administrativos.
- Busca pedido por ID.
- Busca pedido publico por codigo.
- Cria pedido publico.
- Atualiza status do pedido.

`kitchen.ts`:

- Lista pedidos da cozinha.
- Atualiza status da cozinha.

`admin.ts`:

- Busca resumo de relatorios.
- Busca bundle administrativo de filiais e cupons.

`mock-api.ts`:

- Mantem suporte a dados mockados antigos.

### Paginas principais

Cliente:

- `pages/customer/menu`: cardapio publico, categorias e produtos.
- `pages/customer/cart`: fluxo de carrinho, endereco, pagamento e confirmacao.
- `pages/customer/order-tracking`: acompanhamento por codigo publico.
- `pages/customer/profile`: dados basicos do cliente.

Cozinha:

- `pages/kitchen/queue`: fila de pedidos, detalhes e mudanca de status.

Admin:

- `pages/admin/dashboard`: indicadores de pedidos, receita e desempenho.
- `pages/admin/orders`: gestao de pedidos e mudanca de status.
- `pages/admin/menu`: gestao de categorias, produtos, imagens, estoque, ingredientes e complementos.
- `pages/admin/settings`: configuracoes/bundle administrativo com filiais e cupons.

Auth:

- `pages/auth/login`: entrada de usuario interno.

### Componentes reutilizaveis

UI:

- `BrandLogo`
- `PageHeader`
- `StatCard`
- `StatusBadge`

Formulario:

- `MoneyInput`
- `ImageUploadField`

Menu e pedidos:

- `ProductCard`
- `OrderCard`

Filtros:

- `PeriodFilter`

## Fluxos principais

### Login administrativo

1. Usuario abre `/login`.
2. Frontend chama `POST /auth/login`.
3. Backend valida email/senha e tenant.
4. Backend retorna JWT e dados do tenant.
5. Frontend salva token e tenantId no localStorage.
6. Rotas protegidas passam a enviar Authorization e `x-tenant-id`.

### Cliente consulta cardapio

1. Cliente acessa `/cliente/menu`.
2. `CatalogProvider` chama `GET /public/:tenantSlug/menu`.
3. Backend localiza tenant por slug.
4. Backend retorna categorias ativas com produtos disponiveis.
5. Frontend normaliza produtos, imagens, opcoes e disponibilidade.

### Cliente cria pedido

1. Cliente adiciona produtos ao carrinho.
2. Frontend coleta perfil, endereco e pagamento selecionado.
3. `CustomerFlowProvider` chama `ordersService.createPublicOrder`.
4. O service resolve `branchId` via env ou por `GET /tenants/:slug/public`.
5. Frontend envia `POST /public/:tenantSlug/orders`.
6. Backend valida filial, produtos, opcoes e tenant.
7. Backend calcula subtotal, desconto, entrega e total.
8. Backend cria pedido, itens, endereco, historico e ticket de cozinha.
9. Backend decrementa estoque quando aplicavel.
10. Backend emite eventos Socket.IO.
11. Frontend exibe codigo publico e limpa carrinho.

### Cozinha atualiza preparo

1. Operador acessa `/cozinha` ou `/admin/cozinha`.
2. Frontend lista tickets/pedidos em `/tenant/kitchen/orders`.
3. Operador altera status.
4. Frontend chama `PATCH /tenant/kitchen/orders/:id/status`.
5. Backend atualiza `KitchenTicket` e status do pedido quando necessario.
6. Backend emite evento para rooms de cozinha e pedido.

### Admin acompanha indicadores

1. Admin acessa `/admin`.
2. Frontend calcula periodo pelo `PeriodFilter`.
3. `adminService.getSummary` chama `/tenant/reports/summary`.
4. Backend agrega pedidos, itens, pagamentos e horarios.
5. Frontend renderiza cards, graficos/listas e distribuicoes.

## Regras e decisoes de dominio

- Tenant e a unidade de isolamento principal.
- `slug` identifica tenant em rotas publicas.
- `tenantId` aparece nas entidades de negocio.
- Pedidos guardam snapshots de produto/opcao para preservar historico.
- Alteracoes de status geram historico.
- Cozinha opera sobre `KitchenTicket`.
- Produtos podem ter opcoes por grupos.
- Produtos podem ter availability por filial.
- O upload de imagem pode salvar arquivo local em `/uploads/products/...`.
- Cupons podem ser percentuais, valor fixo ou frete gratis no modelo.
- Relatorios ignoram pedidos cancelados/rejeitados para receita e ticket medio.

## Qualidade, build e validacao

Backend:

```bash
cd backend
npm run lint
npm run build
npx prisma validate
```

Frontend:

```bash
cd frontend
npm run build
```

Nao ha suite automatizada de testes versionada no momento. A validacao atual depende principalmente de TypeScript/build, Prisma validate, smoke tests manuais e uso do Swagger.

## Pontos de atencao

- O frontend ainda tem partes com dados mockados ou fallback de mock.
- O provider de Socket.IO no frontend ainda nao conecta ao backend.
- Algumas entidades ricas do Prisma ainda nao possuem rotas/telas completas.
- `Docs/prd.md` e `prd.md` descrevem intencoes originais; esta documentacao reflete o estado atual do codigo.
- O `docker-compose.yml` usa `backend/.env.example`; confirme se o arquivo existe e contem `JWT_SECRET` valido antes de subir.
- O seed recria senha do admin demo em cada execucao.
- Nao ha testes automatizados cobrindo isolamento multi tenant, pedidos ou permissoes.
- Pagamentos aparecem no schema e relatorios, mas nao ha integracao real de gateway.

## Roadmap sugerido

1. Conectar `SocketProvider` do frontend ao Socket.IO real.
2. Criar testes de integracao para auth, tenant, menu, pedido e cozinha.
3. Expandir settings do tenant no frontend e backend.
4. Implementar clientes autenticados e historico real.
5. Implementar carrinho persistente quando fizer sentido.
6. Completar pagamentos offline/online e refletir no checkout.
7. Criar telas de usuarios, filiais, cupons e auditoria no admin.
8. Padronizar Swagger com exemplos completos de request/response.
9. Revisar encoding dos documentos antigos em `Docs/anotacoes-gerais`.
10. Adicionar CI com build, lint, Prisma validate e testes.

## Mapa rapido para manutencao

Para mudar regra de pedidos:

- Backend: `backend/src/modules/orders/orders.service.ts`
- Schemas: `backend/src/modules/orders/orders.schemas.ts`
- Frontend: `frontend/src/services/orders.ts`
- Fluxo cliente: `frontend/src/app/providers/customer-flow-provider.tsx`

Para mudar cardapio:

- Backend: `backend/src/modules/menu/menu.service.ts`
- Schemas: `backend/src/modules/menu/menu.schemas.ts`
- Frontend service: `frontend/src/services/menu.ts`
- Estado: `frontend/src/app/providers/catalog-provider.tsx`
- Tela admin: `frontend/src/pages/admin/menu/index.tsx`
- Tela cliente: `frontend/src/pages/customer/menu/index.tsx`

Para mudar permissao:

- Seed: `backend/prisma/seed.ts`
- Auth middleware: `backend/src/modules/auth/auth.middleware.ts`
- Rotas protegidas backend: arquivos `*.routes.ts`
- Rotas protegidas frontend: `frontend/src/routes/index.tsx`

Para mudar relatorios:

- Backend: `backend/src/modules/reports/reports.service.ts`
- Frontend: `frontend/src/services/admin.ts`
- Dashboard: `frontend/src/pages/admin/dashboard/index.tsx`
- Filtro: `frontend/src/components/filters/period-filter/index.tsx`

Para mudar cozinha:

- Backend: `backend/src/modules/kitchen/kitchen.service.ts`
- Pedido/status: `backend/src/modules/orders/orders.service.ts`
- Frontend service: `frontend/src/services/kitchen.ts`
- Tela: `frontend/src/pages/kitchen/queue/index.tsx`

