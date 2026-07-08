# Guidelines de banco de dados

## Tecnologia

- PostgreSQL.
- Prisma ORM.
- Migrations versionadas.

## Arquivos principais

```txt
backend/prisma/schema.prisma
backend/prisma/seed.ts
backend/prisma/migrations/
```

## Principios

- Entidades de negocio devem ter `tenantId`.
- Entidades globais podem nao ter `tenantId`, como `Plan`, `Permission` e parte de plataforma.
- Use enums Prisma para status estaveis.
- Use `createdAt` e `updatedAt` em entidades mutaveis.
- Use `deletedAt` quando exclusao fisica quebrar historico.
- Crie indices por `tenantId` e campos usados em filtros.
- Evite apagar pedidos, pagamentos, auditoria e mensagens.

## Grupos de entidades

Plataforma:

- `Plan`
- `Tenant`
- `TenantSettings`
- `TenantInvite`

Acesso:

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

Cliente:

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

Pedido:

- `Cart`
- `CartItem`
- `CartItemOption`
- `Order`
- `OrderItem`
- `OrderItemOption`
- `OrderStatusHistory`
- `OrderNote`

Cozinha:

- `KitchenTicket`
- `KitchenStation`
- `KitchenTicketItem`

Pagamento:

- `PaymentMethod`
- `Payment`
- `PaymentAttempt`
- `Refund`

Marketing e notificacao:

- `Coupon`
- `CouponRedemption`
- `Notification`
- `NotificationPreference`

WhatsApp:

- `WhatsappSession`
- `WhatsappConversation`
- `WhatsappMessage`
- `WhatsappMessageTemplate`

Auditoria e webhooks:

- `AuditLog`
- `WebhookEvent`

## Migrations

Ao alterar schema:

1. Edite `schema.prisma`.
2. Gere migration com nome claro.
3. Revise SQL gerado.
4. Atualize seed se o novo modelo exige dados base.
5. Atualize types/frontend se o contrato mudou.
6. Atualize docs relevantes.

Comandos:

```bash
cd backend
npx prisma migrate dev --name nome_da_mudanca
npm run prisma:generate
npx prisma validate
```

## Seed

O seed deve ser idempotente sempre que possivel.

Use `upsert` para:

- permissoes;
- planos;
- tenant demo;
- roles base;
- usuarios demo;
- categorias/produtos demo.

Nunca coloque credenciais reais no seed.

## Cuidados

- Nao criar relacao sem pensar no tenant.
- Nao usar cascade em entidades historicas sem revisao.
- Nao depender de `email` como unico identificador de cliente final entre tenants.
- Nao alterar enum usado em producao sem plano de migracao.
- Nao remover coluna sem verificar frontend, services e relatorios.

