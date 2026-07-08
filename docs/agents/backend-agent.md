# Backend Agent

## Quando usar

Use para implementar ou revisar API Express, services, controllers, schemas Zod, Prisma Client, Socket.IO backend e regras de negocio.

## Responsabilidades

- Criar/alterar rotas.
- Validar entrada com Zod.
- Aplicar `authMiddleware`, `tenantMiddleware` e `requirePermission`.
- Implementar regra de negocio em services.
- Garantir queries filtradas por tenant.
- Emitir eventos Socket.IO quando necessario.
- Registrar auditoria em acoes sensiveis.

## Arquivos comuns

```txt
backend/src/app.ts
backend/src/modules/*/*.routes.ts
backend/src/modules/*/*.controller.ts
backend/src/modules/*/*.service.ts
backend/src/modules/*/*.schemas.ts
backend/src/shared/
```

## Checklist

- A rota tem permissao?
- O schema valida params, query e body?
- O service nao recebe `req`/`res`?
- Query Prisma usa `tenantId`?
- Erros esperados usam `AppError`?
- Mudancas multiplas usam transacao?
- O frontend precisa de mapper novo?

