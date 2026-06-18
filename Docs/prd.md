# PRD - Sistema Multi Tenant de Gerenciamento de Pedidos

## Problem Statement

Empresas que operam pedidos em ambientes como restaurantes, lanchonetes, cozinhas, dark kitchens, delivery ou atendimento presencial precisam gerenciar clientes, cardapios, pedidos, pagamentos, preparo e administracao em uma plataforma unica. O sistema deve permitir que varios tenants usem a mesma aplicacao com dados isolados, configuracoes proprias, usuarios com permissoes diferentes e acompanhamento em tempo real do fluxo dos pedidos.

Hoje, sem uma base multi tenant bem definida, o produto tende a misturar regras de negocio, dificultar escalabilidade, auditoria, seguranca, manutencao do banco de dados e criacao de telas especificas para cozinha, cliente e administracao.

## Solution

Construir uma plataforma web multi tenant com API Node.js + Express, frontend React + TSX, banco MySQL com Prisma ORM, comunicacao em tempo real via Socket.IO e autenticacao via Clerk ou JWT. A solucao sera organizada em tres frentes principais:

- Backend: API REST documentada com Swagger, regras de negocio, autenticao/autorizacao, isolamento multi tenant, sockets, servicos de pedidos, cardapio, cozinha, clientes, pagamentos e administracao.
- Frontend: aplicacao React TypeScript com interfaces separadas para Cliente, Cozinha e Admin, usando rotas protegidas e consumo da API/sockets.
- Banco de Dados: schema Prisma completo para multi tenancy, usuarios, roles, cardapio, pedidos, pagamentos, enderecos, cozinha, auditoria, notificacoes, configuracoes, cupons e migrations versionadas.

## User Stories

1. As an administrador da plataforma, I want cadastrar tenants, so that diferentes empresas possam usar o sistema com dados isolados.
2. As an administrador da plataforma, I want ativar, suspender e configurar tenants, so that eu consiga controlar o acesso de cada empresa.
3. As an dono de estabelecimento, I want gerenciar os dados do meu tenant, so that eu possa personalizar a operacao da minha empresa.
4. As an administrador do tenant, I want cadastrar unidades ou filiais, so that pedidos possam ser associados ao local correto.
5. As an administrador do tenant, I want cadastrar usuarios internos, so that equipe de atendimento, cozinha e gestao possam acessar o sistema.
6. As an administrador do tenant, I want definir roles e permissoes, so that cada usuario veja apenas as funcoes permitidas.
7. As an usuario interno, I want fazer login com seguranca, so that apenas pessoas autorizadas acessem o sistema.
8. As an cliente, I want criar uma conta ou entrar como convidado quando permitido, so that eu possa fazer pedidos rapidamente.
9. As an cliente, I want visualizar o cardapio disponivel do tenant, so that eu possa escolher produtos.
10. As an cliente, I want filtrar produtos por categoria, so that eu encontre itens com mais facilidade.
11. As an cliente, I want ver detalhes de um produto, so that eu saiba preco, descricao, imagens, ingredientes e adicionais.
12. As an cliente, I want adicionar complementos ao produto, so that eu personalize meu pedido.
13. As an cliente, I want montar um carrinho, so that eu revise os itens antes de finalizar.
14. As an cliente, I want informar endereco de entrega, so that o pedido seja enviado ao local correto.
15. As an cliente, I want escolher retirada, consumo no local ou entrega, so that o fluxo se adapte ao meu contexto.
16. As an cliente, I want aplicar cupom de desconto, so that eu receba promocoes validas.
17. As an cliente, I want escolher forma de pagamento, so that eu finalize o pedido da maneira desejada.
18. As an cliente, I want acompanhar o status do pedido em tempo real, so that eu saiba quando ele foi aceito, preparado, saiu para entrega ou foi concluido.
19. As an cliente, I want receber notificacoes de atualizacao do pedido, so that eu nao precise atualizar a pagina manualmente.
20. As an cliente, I want consultar meu historico de pedidos, so that eu possa repetir compras ou acompanhar compras anteriores.
21. As an cliente, I want cancelar um pedido quando permitido pela regra do tenant, so that eu possa corrigir erros rapidamente.
22. As an operador de atendimento, I want receber pedidos novos em tempo real, so that eu possa confirmar ou rejeitar rapidamente.
23. As an operador de atendimento, I want editar dados operacionais do pedido antes do preparo quando permitido, so that erros simples sejam corrigidos.
24. As an operador de atendimento, I want alterar status do pedido, so that cliente e cozinha acompanhem o fluxo correto.
25. As an operador de cozinha, I want visualizar uma fila de pedidos em tempo real, so that eu saiba o que precisa ser preparado.
26. As an operador de cozinha, I want ver detalhes dos itens, observacoes e adicionais, so that eu prepare o pedido corretamente.
27. As an operador de cozinha, I want marcar pedido como em preparo, pronto ou atrasado, so that o restante da operacao seja avisado.
28. As an operador de cozinha, I want filtrar pedidos por status, prioridade e horario, so that eu organize melhor a producao.
29. As an operador de cozinha, I want receber alertas sonoros ou visuais para pedidos novos, so that pedidos nao sejam ignorados.
30. As an administrador do tenant, I want cadastrar categorias do cardapio, so that os produtos fiquem organizados.
31. As an administrador do tenant, I want cadastrar produtos, imagens e precos, so that clientes consigam comprar.
32. As an administrador do tenant, I want configurar adicionais, grupos de opcoes e regras obrigatorias, so that produtos sejam vendidos com personalizacao correta.
33. As an administrador do tenant, I want controlar disponibilidade de produtos, so that itens esgotados nao sejam vendidos.
34. As an administrador do tenant, I want configurar horarios de funcionamento, so that pedidos respeitem a disponibilidade da loja.
35. As an administrador do tenant, I want configurar areas e taxas de entrega, so that o frete seja calculado corretamente.
36. As an administrador do tenant, I want configurar formas de pagamento, so that o cliente veja apenas opcoes aceitas.
37. As an administrador do tenant, I want criar cupons e promocoes, so that eu incentive vendas.
38. As an administrador do tenant, I want visualizar dashboard de pedidos, vendas e ticket medio, so that eu acompanhe desempenho.
39. As an administrador do tenant, I want exportar relatorios, so that eu possa analisar dados fora do sistema.
40. As an administrador do tenant, I want auditar alteracoes importantes, so that eu tenha rastreabilidade de operacoes.
41. As an desenvolvedor, I want uma API modular e documentada com Swagger, so that integracoes e manutencao sejam simples.
42. As an desenvolvedor, I want migrations versionadas com Prisma, so that o banco evolua com seguranca.
43. As an desenvolvedor, I want isolamento de dados por tenantId em todas as entidades sensiveis, so that nao exista vazamento entre empresas.
44. As an desenvolvedor, I want eventos de socket padronizados, so that frontend e backend comuniquem mudancas de pedido sem polling.
45. As an desenvolvedor, I want testes automatizados nos fluxos principais, so that regressions sejam detectadas cedo.

## Backend

### Objetivo

Construir uma API Node.js com Express, TypeScript, Prisma ORM, Swagger, Socket.IO e camada de autenticacao/autorizacao. A API deve ser multi tenant desde a primeira migration, com separacao clara entre modulos de dominio.

### Estrutura de Pastas

```txt
src/
  app.ts
  server.ts
  config/
    env.ts
    prisma.ts
    swagger.ts
    socket.ts
    clerk.ts
    jwt.ts
  modules/
    auth/
      auth.controller.ts
      auth.routes.ts
      auth.service.ts
      auth.middleware.ts
    tenants/
      tenants.controller.ts
      tenants.routes.ts
      tenants.service.ts
      tenants.repository.ts
    users/
    roles/
    branches/
    customers/
    addresses/
    menu/
      categories/
      products/
      option-groups/
      options/
    carts/
    orders/
      orders.controller.ts
      orders.routes.ts
      orders.service.ts
      orders.repository.ts
      orders.socket.ts
      orders.types.ts
    kitchen/
    payments/
    coupons/
    notifications/
    reports/
    audit/
    settings/
  shared/
    errors/
    middlewares/
      tenant.middleware.ts
      error.middleware.ts
      validate.middleware.ts
      rate-limit.middleware.ts
    utils/
    validators/
    types/
  prisma/
    schema.prisma
    migrations/
  tests/
    integration/
    unit/
```

### API e Modulos

- Auth: login, validacao de token, integracao Clerk ou JWT, refresh quando JWT for usado, logout, recuperacao de usuario atual.
- Tenants: criacao, atualizacao, status, subdominio ou slug, configuracoes publicas.
- Users: usuarios internos, vinculacao tenant/role, status, perfil.
- Roles e Permissions: permissoes por escopo como admin, manager, kitchen, attendant e customer.
- Branches: unidades, enderecos, horarios, contatos e status operacional.
- Customers: clientes finais, preferencias, historico e dados de contato.
- Addresses: enderecos de clientes, tenants e filiais.
- Menu: categorias, produtos, imagens, precos, grupos de adicionais, opcoes, disponibilidade e estoque simples.
- Carts: carrinho persistente opcional para cliente autenticado ou sessao anonima.
- Orders: criacao, validacao, status, itens, totais, descontos, taxas, historico e cancelamento.
- Kitchen: fila de producao, atualizacao de preparo, priorizacao e tempo estimado.
- Payments: registro de tentativas, metodo, status, transacoes e conciliacao basica.
- Coupons: regras de desconto, validade, limites por cliente, tenant e pedido.
- Notifications: notificacoes internas e para clientes.
- Reports: indicadores de vendas, pedidos, produtos mais vendidos, ticket medio e tempos de preparo.
- Audit: logs de alteracoes criticas.
- Settings: configuracoes operacionais por tenant e filial.

### Endpoints Principais

- `GET /health`
- `GET /docs`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /tenants/:slug/public`
- `POST /admin/tenants`
- `GET /admin/tenants`
- `PATCH /admin/tenants/:id`
- `POST /tenant/users`
- `GET /tenant/users`
- `PATCH /tenant/users/:id`
- `POST /tenant/branches`
- `GET /tenant/branches`
- `PATCH /tenant/branches/:id`
- `POST /tenant/menu/categories`
- `GET /tenant/menu/categories`
- `POST /tenant/menu/products`
- `GET /tenant/menu/products`
- `PATCH /tenant/menu/products/:id`
- `POST /tenant/menu/products/:id/options`
- `GET /public/:tenantSlug/menu`
- `POST /public/:tenantSlug/orders`
- `GET /public/:tenantSlug/orders/:publicCode`
- `GET /tenant/orders`
- `GET /tenant/orders/:id`
- `PATCH /tenant/orders/:id/status`
- `POST /tenant/orders/:id/cancel`
- `GET /tenant/kitchen/orders`
- `PATCH /tenant/kitchen/orders/:id/status`
- `POST /tenant/coupons`
- `GET /tenant/coupons`
- `GET /tenant/reports/summary`
- `GET /tenant/audit-logs`

### Swagger

- Swagger deve ser servido em `/docs`.
- Contratos devem incluir exemplos de request/response, codigos de erro e schemas reutilizaveis.
- A documentacao deve separar grupos: Auth, Tenants, Users, Menu, Orders, Kitchen, Payments, Reports.
- Todos os endpoints protegidos devem declarar o esquema de seguranca Bearer JWT ou Clerk JWT.

### Socket

Socket.IO sera usado para atualizar pedidos e cozinha em tempo real.

Rooms:

- `tenant:{tenantId}` para eventos administrativos do tenant.
- `branch:{branchId}` para eventos por unidade.
- `kitchen:{branchId}` para a tela da cozinha.
- `order:{orderId}` para acompanhamento individual do cliente.
- `customer:{customerId}` para notificacoes do cliente autenticado.

Eventos emitidos pelo backend:

- `order.created`
- `order.accepted`
- `order.rejected`
- `order.status_changed`
- `order.cancelled`
- `order.payment_updated`
- `kitchen.order_queued`
- `kitchen.order_started`
- `kitchen.order_ready`
- `notification.created`

Eventos recebidos pelo backend:

- `order.subscribe`
- `order.unsubscribe`
- `kitchen.subscribe`
- `tenant.subscribe`

Todos os eventos devem validar autenticacao, tenantId, branchId e permissao antes de associar o socket a uma room.

### Autenticacao e Autorizacao

- Clerk e a opcao preferencial para autenticacao gerenciada.
- JWT proprio pode ser usado quando o projeto nao depender de provedor externo.
- Em ambos os cenarios, a API deve normalizar o usuario autenticado em `req.auth`.
- Autorizacao deve considerar `tenantId`, `role`, `permissions` e status do usuario.
- Endpoints publicos de cardapio e criacao de pedido devem aplicar rate limit e validacoes fortes.
- Todo acesso a dados sensiveis deve passar por middleware de tenant.

## Frontend

### Objetivo

Construir uma aplicacao React com TypeScript e TSX contendo tres experiencias principais: Cliente, Cozinha e Admin. As telas devem consumir a API REST, assinar eventos via Socket.IO e respeitar roles/permissoes.

### Estrutura de Pastas

```txt
src/
  main.tsx
  App.tsx
  routes/
    index.tsx
    protected-route.tsx
  app/
    providers/
      auth-provider.tsx
      socket-provider.tsx
      query-provider.tsx
      tenant-provider.tsx
    layouts/
      admin-layout.tsx
      kitchen-layout.tsx
      customer-layout.tsx
  pages/
    admin/
      dashboard.tsx
      orders.tsx
      menu.tsx
      products.tsx
      categories.tsx
      users.tsx
      branches.tsx
      coupons.tsx
      reports.tsx
      settings.tsx
    kitchen/
      queue.tsx
      order-detail.tsx
    customer/
      menu.tsx
      product-detail.tsx
      cart.tsx
      checkout.tsx
      order-tracking.tsx
      order-history.tsx
  components/
    ui/
    orders/
    menu/
    forms/
    tables/
    charts/
  services/
    api.ts
    auth.ts
    socket.ts
    orders.ts
    menu.ts
    tenants.ts
  hooks/
  schemas/
  types/
  utils/
```

### Area do Cliente

- Tela publica por tenant usando slug ou subdominio.
- Cardapio com categorias, produtos, imagens, precos e disponibilidade.
- Detalhe do produto com adicionais, observacoes e quantidade.
- Carrinho com subtotal, descontos, taxa de entrega e total.
- Checkout com dados do cliente, endereco, tipo de entrega e pagamento.
- Confirmacao de pedido com codigo publico.
- Acompanhamento em tempo real do status.
- Historico de pedidos quando o cliente estiver autenticado.

### Area da Cozinha

- Fila de pedidos em tempo real.
- Agrupamento por status: novo, aceito, em preparo, pronto, atrasado.
- Detalhe do pedido com itens, adicionais, observacoes e horario.
- Acoes rapidas para iniciar preparo, marcar pronto e sinalizar atraso.
- Alertas visuais para novos pedidos.
- Filtros por filial, tipo de pedido, prioridade e tempo.

### Area Admin

- Dashboard com pedidos do dia, faturamento, ticket medio, pedidos por status e tempos medios.
- Gestao de pedidos com filtros, detalhe, alteracao de status e cancelamento.
- Gestao de cardapio com categorias, produtos, adicionais, imagens, precos e disponibilidade.
- Gestao de filiais, horarios, areas de entrega e taxas.
- Gestao de usuarios, roles e permissoes.
- Gestao de cupons e promocoes.
- Relatorios operacionais e financeiros.
- Configuracoes do tenant: marca, contatos, regras de pedido, pagamento e notificacoes.
- Auditoria para acoes criticas.

### Estado e Integracoes

- React Query deve gerenciar chamadas HTTP, cache e invalidacao.
- Socket.IO client deve atualizar pedidos e notificacoes sem polling.
- Formularios devem usar validacao com schemas compartilhados no frontend.
- Rotas protegidas devem validar autenticacao e permissao.
- Erros da API devem ser exibidos de forma padronizada.

## Banco de Dados

### Objetivo

Criar um banco MySQL com Prisma ORM e migrations versionadas, cobrindo multi tenancy, usuarios, clientes, cardapio, pedidos, pagamentos, cozinha, notificacoes, configuracoes e auditoria.

### Decisoes Gerais

- Todas as tabelas de negocio devem possuir `tenantId`, exceto entidades globais como `Tenant`, `Plan` e tabelas de plataforma.
- Usar `cuid()` ou `uuid()` como identificador principal no Prisma.
- Usar `createdAt`, `updatedAt` e, quando necessario, `deletedAt` para soft delete.
- Criar indices compostos por `tenantId` + campos de busca/status.
- Evitar exclusao fisica de pedidos, pagamentos e logs.
- Usar enums Prisma para status estaveis de pedido, pagamento, usuario e tenant.
- Migrations devem ser pequenas, nomeadas por contexto e revisadas antes de producao.

### Entidades Principais

#### Plataforma e Multi Tenant

- `Tenant`: empresa/cliente da plataforma.
  - Campos: `id`, `name`, `slug`, `document`, `email`, `phone`, `status`, `planId`, `settingsId`, `createdAt`, `updatedAt`, `deletedAt`.
  - Indices: `slug` unico, `document` unico opcional, `status`.
- `Plan`: plano comercial da plataforma.
  - Campos: `id`, `name`, `description`, `price`, `maxUsers`, `maxBranches`, `features`, `status`.
- `TenantSettings`: configuracoes gerais.
  - Campos: `tenantId`, `brandName`, `logoUrl`, `primaryColor`, `timezone`, `currency`, `allowGuestCheckout`, `autoAcceptOrders`, `defaultPreparationTime`, `minimumOrderValue`.

#### Usuarios, Roles e Permissoes

- `User`: identidade interna normalizada.
  - Campos: `id`, `externalAuthId`, `name`, `email`, `phone`, `avatarUrl`, `status`, `lastLoginAt`.
- `TenantUser`: vinculo de usuario com tenant.
  - Campos: `id`, `tenantId`, `userId`, `roleId`, `branchId`, `status`.
  - Indices: `tenantId`, `userId`, `roleId`, `branchId`.
- `Role`: papel por tenant ou global.
  - Campos: `id`, `tenantId`, `name`, `description`, `isSystem`, `status`.
- `Permission`: permissao atomica.
  - Campos: `id`, `key`, `description`, `module`.
- `RolePermission`: N:N entre role e permission.
  - Campos: `roleId`, `permissionId`.
- `UserSession`: sessoes quando JWT proprio for usado.
  - Campos: `id`, `userId`, `refreshTokenHash`, `ip`, `userAgent`, `expiresAt`, `revokedAt`.

#### Filiais e Enderecos

- `Branch`: unidade operacional.
  - Campos: `id`, `tenantId`, `name`, `slug`, `email`, `phone`, `status`, `addressId`, `acceptsDelivery`, `acceptsPickup`, `acceptsDineIn`.
- `Address`: endereco reutilizavel.
  - Campos: `id`, `tenantId`, `customerId`, `street`, `number`, `complement`, `district`, `city`, `state`, `postalCode`, `country`, `latitude`, `longitude`, `reference`.
- `BusinessHour`: horario de funcionamento.
  - Campos: `id`, `tenantId`, `branchId`, `weekday`, `opensAt`, `closesAt`, `isClosed`.
- `DeliveryZone`: area de entrega.
  - Campos: `id`, `tenantId`, `branchId`, `name`, `type`, `postalCodeStart`, `postalCodeEnd`, `radiusKm`, `fee`, `minimumOrderValue`, `estimatedMinutes`, `status`.

#### Clientes

- `Customer`: cliente final.
  - Campos: `id`, `tenantId`, `externalAuthId`, `name`, `email`, `phone`, `document`, `birthDate`, `status`.
- `CustomerAddress`: relacao cliente/endereco quando enderecos forem normalizados separadamente.
  - Campos: `id`, `tenantId`, `customerId`, `addressId`, `label`, `isDefault`.
- `CustomerFavoriteProduct`: produtos favoritos.
  - Campos: `tenantId`, `customerId`, `productId`.

#### Cardapio

- `MenuCategory`: categoria.
  - Campos: `id`, `tenantId`, `branchId`, `name`, `description`, `imageUrl`, `sortOrder`, `status`, `availableFrom`, `availableUntil`.
- `Product`: produto.
  - Campos: `id`, `tenantId`, `categoryId`, `name`, `description`, `sku`, `imageUrl`, `basePrice`, `promotionalPrice`, `costPrice`, `preparationTime`, `status`, `isFeatured`, `sortOrder`.
- `ProductAvailability`: disponibilidade por filial.
  - Campos: `id`, `tenantId`, `productId`, `branchId`, `isAvailable`, `stockQuantity`.
- `OptionGroup`: grupo de adicionais.
  - Campos: `id`, `tenantId`, `productId`, `name`, `minSelection`, `maxSelection`, `required`, `sortOrder`, `status`.
- `OptionItem`: adicional/opcao.
  - Campos: `id`, `tenantId`, `optionGroupId`, `name`, `description`, `price`, `status`, `sortOrder`.
- `ProductImage`: galeria do produto.
  - Campos: `id`, `tenantId`, `productId`, `url`, `alt`, `sortOrder`.

#### Carrinho

- `Cart`: carrinho persistente.
  - Campos: `id`, `tenantId`, `customerId`, `sessionId`, `branchId`, `status`, `expiresAt`.
- `CartItem`: item do carrinho.
  - Campos: `id`, `tenantId`, `cartId`, `productId`, `quantity`, `unitPrice`, `notes`.
- `CartItemOption`: adicionais escolhidos.
  - Campos: `id`, `tenantId`, `cartItemId`, `optionItemId`, `quantity`, `unitPrice`.

#### Pedidos

- `Order`: pedido.
  - Campos: `id`, `tenantId`, `branchId`, `customerId`, `publicCode`, `type`, `status`, `paymentStatus`, `source`, `subtotal`, `discountTotal`, `deliveryFee`, `serviceFee`, `taxTotal`, `total`, `couponId`, `customerName`, `customerPhone`, `deliveryAddressId`, `notes`, `estimatedReadyAt`, `acceptedAt`, `startedAt`, `readyAt`, `dispatchedAt`, `completedAt`, `cancelledAt`, `cancelReason`.
  - Indices: `tenantId/status`, `tenantId/branchId/status`, `tenantId/publicCode`, `customerId`.
- `OrderItem`: item do pedido.
  - Campos: `id`, `tenantId`, `orderId`, `productId`, `productNameSnapshot`, `quantity`, `unitPrice`, `totalPrice`, `notes`.
- `OrderItemOption`: adicionais do item.
  - Campos: `id`, `tenantId`, `orderItemId`, `optionItemId`, `optionNameSnapshot`, `quantity`, `unitPrice`, `totalPrice`.
- `OrderStatusHistory`: historico de status.
  - Campos: `id`, `tenantId`, `orderId`, `fromStatus`, `toStatus`, `changedByUserId`, `reason`, `createdAt`.
- `OrderNote`: observacoes internas.
  - Campos: `id`, `tenantId`, `orderId`, `userId`, `note`, `visibility`.

#### Cozinha

- `KitchenTicket`: ticket operacional da cozinha.
  - Campos: `id`, `tenantId`, `branchId`, `orderId`, `status`, `priority`, `station`, `queuedAt`, `startedAt`, `readyAt`, `assignedToUserId`.
- `KitchenStation`: estacoes de preparo.
  - Campos: `id`, `tenantId`, `branchId`, `name`, `description`, `status`.
- `KitchenTicketItem`: associacao de itens a ticket/estacao quando necessario.
  - Campos: `id`, `tenantId`, `kitchenTicketId`, `orderItemId`, `stationId`, `status`.

#### Pagamentos

- `PaymentMethod`: metodos habilitados.
  - Campos: `id`, `tenantId`, `branchId`, `type`, `name`, `provider`, `status`, `config`.
- `Payment`: pagamento do pedido.
  - Campos: `id`, `tenantId`, `orderId`, `methodId`, `provider`, `providerPaymentId`, `amount`, `status`, `paidAt`, `failedAt`, `refundedAt`, `metadata`.
- `PaymentAttempt`: tentativas de pagamento.
  - Campos: `id`, `tenantId`, `paymentId`, `status`, `requestPayload`, `responsePayload`, `errorMessage`, `createdAt`.
- `Refund`: estorno.
  - Campos: `id`, `tenantId`, `paymentId`, `amount`, `reason`, `status`, `providerRefundId`, `createdAt`.

#### Cupons e Promocoes

- `Coupon`: cupom.
  - Campos: `id`, `tenantId`, `code`, `description`, `discountType`, `discountValue`, `maxDiscountValue`, `minimumOrderValue`, `startsAt`, `endsAt`, `usageLimit`, `usageLimitPerCustomer`, `status`.
- `CouponRedemption`: uso do cupom.
  - Campos: `id`, `tenantId`, `couponId`, `customerId`, `orderId`, `discountAmount`, `createdAt`.

#### Notificacoes

- `Notification`: notificacao.
  - Campos: `id`, `tenantId`, `userId`, `customerId`, `type`, `title`, `message`, `payload`, `readAt`, `createdAt`.
- `NotificationPreference`: preferencias.
  - Campos: `id`, `tenantId`, `userId`, `customerId`, `channel`, `enabled`.

#### Auditoria e Logs

- `AuditLog`: auditoria.
  - Campos: `id`, `tenantId`, `userId`, `action`, `entity`, `entityId`, `before`, `after`, `ip`, `userAgent`, `createdAt`.
- `WebhookEvent`: eventos externos.
  - Campos: `id`, `tenantId`, `provider`, `eventType`, `externalId`, `payload`, `processedAt`, `status`, `error`.

### Enums Recomendados

- `TenantStatus`: `ACTIVE`, `SUSPENDED`, `CANCELLED`, `TRIAL`.
- `UserStatus`: `ACTIVE`, `INVITED`, `SUSPENDED`, `DISABLED`.
- `BranchStatus`: `ACTIVE`, `INACTIVE`, `CLOSED_TEMPORARILY`.
- `ProductStatus`: `ACTIVE`, `INACTIVE`, `OUT_OF_STOCK`, `ARCHIVED`.
- `OrderType`: `DELIVERY`, `PICKUP`, `DINE_IN`.
- `OrderStatus`: `DRAFT`, `PLACED`, `ACCEPTED`, `REJECTED`, `PREPARING`, `READY`, `DISPATCHED`, `DELIVERED`, `COMPLETED`, `CANCELLED`.
- `PaymentStatus`: `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CANCELLED`.
- `PaymentType`: `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `PIX`, `VOUCHER`, `ONLINE`.
- `DiscountType`: `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_DELIVERY`.
- `NotificationType`: `ORDER`, `PAYMENT`, `SYSTEM`, `PROMOTION`.

### Plano de Migrations Prisma

1. `init_platform_multi_tenant`: Tenant, Plan, TenantSettings e enums base.
2. `add_auth_users_roles_permissions`: User, TenantUser, Role, Permission, RolePermission e UserSession.
3. `add_branches_addresses_business_hours`: Branch, Address, BusinessHour e DeliveryZone.
4. `add_customers`: Customer, CustomerAddress e favoritos.
5. `add_menu_catalog`: MenuCategory, Product, ProductAvailability, OptionGroup, OptionItem e ProductImage.
6. `add_carts`: Cart, CartItem e CartItemOption.
7. `add_orders`: Order, OrderItem, OrderItemOption, OrderStatusHistory e OrderNote.
8. `add_kitchen`: KitchenTicket, KitchenStation e KitchenTicketItem.
9. `add_payments`: PaymentMethod, Payment, PaymentAttempt e Refund.
10. `add_coupons_promotions`: Coupon e CouponRedemption.
11. `add_notifications`: Notification e NotificationPreference.
12. `add_audit_webhooks`: AuditLog e WebhookEvent.
13. `add_indexes_and_constraints`: indices compostos, unique constraints por tenant e otimizacoes de consulta.
14. `seed_system_roles_permissions`: seed de roles e permissoes base.

## Implementation Decisions

- O backend sera construido com Node.js, Express e TypeScript.
- A documentacao da API sera feita com Swagger/OpenAPI e disponibilizada em `/docs`.
- Prisma sera a unica camada de acesso ao banco MySQL.
- O banco sera multi tenant por design, usando `tenantId` nas entidades de negocio.
- O frontend sera React com TypeScript/TSX, organizado por areas: Admin, Cozinha e Cliente.
- Socket.IO sera usado para atualizacoes em tempo real dos pedidos.
- Clerk sera a opcao preferencial de autenticacao, com JWT proprio como alternativa aceitavel.
- A API deve expor middlewares padronizados para autenticacao, tenant, permissao, validacao, erro e rate limit.
- Pedidos devem armazenar snapshots de nome e preco de produtos/adicionais para preservar historico mesmo que o cardapio seja alterado depois.
- Alteracoes de status do pedido devem gerar registros em `OrderStatusHistory`.
- A cozinha deve trabalhar com `KitchenTicket`, permitindo evoluir para multiplas estacoes de preparo.
- Pagamentos devem ser registrados mesmo quando forem offline, para manter rastreabilidade operacional.
- Auditoria deve cobrir mudancas criticas em pedidos, usuarios, permissoes, produtos, pagamentos e configuracoes.
- O sistema deve evitar vazamento entre tenants em endpoints, sockets, queries Prisma e relatorios.

## Testing Decisions

- Testes devem validar comportamento externo e regras de negocio, nao detalhes internos de implementacao.
- O principal seam de teste deve ser a API HTTP, cobrindo rotas com banco de teste e autenticacao simulada.
- Fluxos de socket devem ser testados em integracao para garantir emissao de eventos e isolamento por room/tenant.
- O Prisma deve ser validado com migrations aplicadas em banco de teste.
- Frontend deve ter testes de componentes para fluxos criticos de cliente, cozinha e admin.
- Testes E2E devem cobrir: cliente cria pedido, cozinha recebe pedido, cozinha atualiza status e cliente acompanha em tempo real.
- Testes de autorizacao devem garantir que um usuario de um tenant nao acesse dados de outro tenant.
- Testes de relatorio devem validar agregacoes por tenant, filial, periodo e status.
- Testes de cardapio devem validar adicionais obrigatorios, disponibilidade e precificacao.
- Testes de pedido devem validar subtotal, descontos, taxa de entrega, total e snapshots de itens.

## Out of Scope

- Aplicativo mobile nativo.
- Marketplace multi-loja com busca publica entre tenants.
- Integracao obrigatoria com gateway de pagamento especifico na primeira versao.
- Impressao fiscal, NFC-e, SAT ou integracoes contabeis.
- Controle avancado de estoque com compras, fornecedores e inventario completo.
- Motor avancado de entregadores e roteirizacao.
- BI avancado fora dos relatorios operacionais iniciais.
- Suporte offline completo.

## Further Notes

- O projeto deve comecar pela modelagem Prisma e migrations, pois o desenho multi tenant influencia API, sockets e frontend.
- A primeira versao deve priorizar o fluxo completo: configurar tenant, publicar cardapio, cliente fazer pedido, cozinha receber em tempo real, atualizar status e cliente acompanhar.
- Todas as features administrativas devem ser guiadas por permissao, nao apenas por tipo de usuario fixo.
- O uso de Clerk reduz complexidade de autenticacao, mas a arquitetura deve manter uma camada interna de usuario para roles, tenants e auditoria.
- A publicacao em issue tracker nao foi realizada porque nao ha configuracao de issue tracker disponivel neste workspace.
