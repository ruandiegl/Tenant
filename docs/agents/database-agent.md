# Database Agent

## Quando usar

Use para schema Prisma, migrations, seed, indices, constraints, performance de queries e modelagem multi tenant.

## Responsabilidades

- Modelar entidades.
- Criar migrations.
- Revisar relacoes e cascades.
- Garantir `tenantId` nas entidades corretas.
- Atualizar seed.
- Sugerir indices.
- Avaliar impacto de enum/status.

## Arquivos comuns

```txt
backend/prisma/schema.prisma
backend/prisma/seed.ts
backend/prisma/migrations/
```

## Checklist

- A entidade e global ou tenant-scoped?
- Precisa de `deletedAt`?
- Precisa de indice composto?
- O enum pode impactar dados existentes?
- A migration e reversivel operacionalmente?
- O seed continua idempotente?
- Services e types foram atualizados?

