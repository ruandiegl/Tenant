# Guidelines de backend

## Stack

- Node.js
- Express
- TypeScript
- Prisma Client
- PostgreSQL
- Zod
- JWT
- Socket.IO

## Estrutura de modulo

Cada dominio deve seguir, quando aplicavel:

```txt
modules/nome-do-modulo/
  nome-do-modulo.routes.ts
  nome-do-modulo.controller.ts
  nome-do-modulo.service.ts
  nome-do-modulo.schemas.ts
```

Papel de cada arquivo:

- `routes`: define endpoints, middlewares, validacao e permissoes.
- `controller`: traduz request/response e chama service.
- `service`: contem regra de negocio e acesso Prisma.
- `schemas`: contratos de entrada com Zod.

## Controllers

Controllers devem:

- ser finos;
- usar `RequestHandler`;
- passar erros para `next`;
- retornar status HTTP correto;
- nao conter regra de negocio complexa;
- nao montar queries Prisma grandes.

## Services

Services devem:

- conter regra de negocio;
- filtrar sempre por `tenantId` em entidades de negocio;
- usar transacoes quando alterar multiplas tabelas relacionadas;
- registrar historico/auditoria quando a mudanca for critica;
- emitir eventos somente depois de persistir dados;
- evitar acoplamento com `req` e `res`.

## Schemas

Schemas Zod devem:

- validar `params`, `query` e `body`;
- usar enums iguais aos enums Prisma;
- normalizar valores opcionais quando necessario;
- rejeitar payloads ambiguos;
- ficar proximos da rota que protegem.

## Erros

Use `AppError` para erros esperados:

- 400 para entrada invalida ou contexto ausente;
- 401 para autenticacao ausente/invalida;
- 403 para permissao insuficiente;
- 404 para recurso inexistente dentro do tenant;
- 409 para conflitos de regra ou unicidade.

Nao exponha detalhes internos em erros genericos.

## Rotas protegidas

Rotas protegidas devem seguir a ordem:

```ts
routes.use(authMiddleware, tenantMiddleware);
routes.get("/", requirePermission("tenant.modulo.read"), controller.list);
```

Rotas de plataforma usam:

```ts
routes.use(authMiddleware);
routes.use(requirePlatformAdmin);
```

## Rotas publicas

Rotas publicas devem:

- usar slug do tenant;
- usar `publicRateLimit` quando recebem alto volume ou criam dados;
- validar params/query/body;
- retornar apenas dados publicos;
- nunca aceitar `tenantId` direto do cliente como fonte de verdade.

## Prisma

Padroes:

- use `findFirst` com `tenantId` para recursos tenant-scoped;
- use `findUnique` apenas quando a constraint ja protege o tenant ou quando o recurso e global;
- use `include` com parcimonia;
- converta `Decimal` para numero/string na fronteira HTTP quando necessario;
- prefira transacoes para pedido, estoque, historico e cozinha.

## Auditoria

Registre auditoria para:

- criacao/alteracao/exclusao de tenant;
- mudanca de plano/status;
- configuracoes de tenant;
- delivery zones;
- acoes sensiveis de WhatsApp;
- alteracoes de pedido quando necessario.

## Modulos atuais

- `auth`: login, convite, perfil e JWT.
- `tenant-management`: superadmin, planos, tenants, uso, convites e auditoria de plataforma.
- `tenants`: consulta publica do tenant.
- `tenant-settings`: configuracoes do tenant atual.
- `users`: usuarios internos do tenant.
- `branches`: filiais.
- `delivery-zones`: areas de entrega.
- `menu`: categorias, produtos e templates.
- `orders`: pedido publico e gestao de pedidos.
- `kitchen`: fila da cozinha.
- `coupons`: cupons.
- `reports`: indicadores.
- `audit`: auditoria do tenant.
- `whatsapp`: WAHA, sessoes, templates e webhooks.

