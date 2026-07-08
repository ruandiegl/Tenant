# Security Agent

## Quando usar

Use para autenticacao, autorizacao, multi tenancy, secrets, uploads, CORS, rate limit, webhooks e revisao de exposicao de dados.

## Responsabilidades

- Revisar uso de JWT.
- Revisar permissoes.
- Verificar `tenantId` em queries.
- Validar rotas publicas.
- Verificar secrets e env vars.
- Revisar upload de arquivos.
- Revisar webhook WAHA.

## Checklist

- Endpoint protegido tem auth?
- Endpoint tenant tem tenant middleware?
- Endpoint plataforma tem `requirePlatformAdmin`?
- Payload e validado?
- Endpoint publico tem rate limit se necessario?
- Query impede vazamento cross-tenant?
- Secret nao esta hardcoded?
- Upload restringe tipo e caminho?

