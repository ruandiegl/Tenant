# Seguranca e multi tenancy

## Principio principal

Nenhum dado sensivel pode atravessar tenants. Toda query, rota, socket, relatorio e integracao deve respeitar o contexto do tenant.

## Autenticacao

- JWT proprio.
- Login por email/senha e tenant opcional.
- Convites de usuario via token.
- Perfil autenticado em `/auth/me`.

## Autorizacao

Permissoes seguem dois grupos:

- `platform.*` para superadmin.
- `tenant.*` para administracao e operacao de restaurante.

Exemplos:

```txt
platform.tenants.read
platform.tenants.write
tenant.orders.read
tenant.orders.write
tenant.menu.read
tenant.menu.write
tenant.settings.read
tenant.settings.write
```

## Tenant context

Rotas protegidas de tenant devem usar:

```txt
authMiddleware
tenantMiddleware
requirePermission(...)
```

O tenant pode vir do JWT ou do header `x-tenant-id`. Se os dois existirem e divergirem, a API deve bloquear.

## Platform admin

Rotas de superadmin devem usar:

```txt
authMiddleware
requirePlatformAdmin
requirePermission("platform.tenants.read")
```

Nao misture rotas `platform.*` com `tenantMiddleware`.

## Rotas publicas

Rotas publicas devem:

- usar slug do tenant;
- aplicar rate limit quando criam dados ou podem receber abuso;
- expor apenas dados publicos;
- nunca permitir escolher outro tenant por ID interno;
- validar payload com Zod.

## Senhas e tokens

- Senhas devem ser hasheadas com bcrypt.
- Nunca salvar senha em texto.
- Tokens de convite devem expirar ou ser revogados quando usados.
- Variaveis como `JWT_SECRET`, `WAHA_API_KEY` e `WAHA_WEBHOOK_SECRET` devem ficar fora do codigo.

## Uploads

- Permitir apenas tipos esperados.
- Validar tamanho e mime type.
- Salvar arquivos em caminhos controlados.
- Servir uploads como arquivos estaticos sem permitir path traversal.

## WhatsApp e webhooks

- Validar segredo do webhook quando configurado.
- Persistir eventos relevantes.
- Nao confiar em payload externo sem normalizacao.
- Evitar enviar mensagens automaticas duplicadas.
- Logar falhas de envio sem vazar dados sensiveis.

## Checklist de seguranca para PR

- A query tem `tenantId` quando deveria?
- A rota tem permissao explicita?
- O schema valida payload inteiro?
- O frontend nao expoe credenciais?
- O endpoint publico tem rate limit quando necessario?
- O socket valida tenant?
- A auditoria cobre a acao sensivel?

