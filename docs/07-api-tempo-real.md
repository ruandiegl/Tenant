# API, contratos e tempo real

## Base HTTP

Backend padrao:

```txt
http://localhost:3333
```

Swagger:

```txt
GET /docs
```

Healthcheck:

```txt
GET /health
```

## Padrao de autenticacao

Rotas protegidas usam:

```txt
Authorization: Bearer <jwt>
x-tenant-id: <tenantId>
```

Rotas de plataforma exigem usuario platform admin.

Rotas publicas usam `tenantSlug` e nao recebem `tenantId` como fonte de verdade.

## Principais grupos de endpoints

Auth:

```txt
POST /auth/login
GET /auth/invite/:token
POST /auth/accept-invite
GET /auth/me
PATCH /auth/me
POST /auth/logout
```

Tenant publico:

```txt
GET /tenants/:slug/public
```

Superadmin:

```txt
GET /admin/tenants/plans
POST /admin/tenants/plans
PATCH /admin/tenants/plans/:planId
DELETE /admin/tenants/plans/:planId
GET /admin/tenants
POST /admin/tenants
GET /admin/tenants/:id
PATCH /admin/tenants/:id
DELETE /admin/tenants/:id
PATCH /admin/tenants/:id/status
PATCH /admin/tenants/:id/plan
POST /admin/tenants/:id/users/:tenantUserId/invite-link
GET /admin/tenants/:id/usage
GET /admin/audit-logs
```

Tenant admin:

```txt
GET /tenant/settings
PATCH /tenant/settings
GET /tenant/users
POST /tenant/users
PATCH /tenant/users/:id
GET /tenant/branches
POST /tenant/branches
PATCH /tenant/branches/:id
DELETE /tenant/branches/:id
GET /tenant/delivery-zones
POST /tenant/delivery-zones
PATCH /tenant/delivery-zones/:id
DELETE /tenant/delivery-zones/:id
```

Cardapio:

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
GET /public/:tenantSlug/menu
```

Pedidos e cozinha:

```txt
POST /public/:tenantSlug/orders
GET /public/:tenantSlug/orders/:publicCode
GET /tenant/orders
GET /tenant/orders/:id
PATCH /tenant/orders/:id/status
POST /tenant/orders/:id/cancel
GET /tenant/kitchen/orders
PATCH /tenant/kitchen/orders/:id/status
```

Delivery publico:

```txt
GET /public/:tenantSlug/delivery-zones
```

WhatsApp:

```txt
GET /tenant/whatsapp/session
POST /tenant/whatsapp/session
POST /tenant/whatsapp/session/qr
POST /tenant/whatsapp/session/stop
PATCH /tenant/whatsapp/session/settings
POST /tenant/whatsapp/messages/test
GET /tenant/whatsapp/templates
PATCH /tenant/whatsapp/templates/:id
DELETE /tenant/whatsapp/templates/:id
POST /public/webhooks/waha
```

Relatorios e auditoria:

```txt
GET /tenant/reports/summary
GET /tenant/audit-logs
```

## Contratos

Backend:

- contratos de entrada ficam em `*.schemas.ts`;
- Zod valida body, params e query;
- erros devem sair pelo `errorMiddleware`.

Frontend:

- contratos remotos ficam encapsulados em `services`;
- services convertem dados para tipos de `types/database.ts`;
- paginas nao devem montar URL manualmente quando ja existe service.

## Socket.IO

Rooms:

```txt
tenant:{tenantId}
branch:{branchId}
kitchen:{branchId}
order:{orderId}
```

Eventos recebidos:

```txt
tenant.subscribe
kitchen.subscribe
order.subscribe
order.unsubscribe
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

Guidelines:

- validar JWT no handshake;
- so entrar em rooms do tenant autenticado;
- emitir evento apos persistencia;
- payload deve conter dados suficientes para invalidar/cachear no frontend;
- nao enviar dados de outro tenant.

