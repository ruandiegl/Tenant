# Deploy e operacao

## Ambientes

O projeto suporta execucao local com Docker Compose e pode ser publicado em infraestrutura que suporte Node.js, PostgreSQL e variaveis de ambiente.

Arquivos relevantes:

```txt
docker-compose.yml
backend/Dockerfile
backend/railway.json
frontend/vercel.json
```

## Docker Compose

Servicos:

- `postgres`: PostgreSQL 16.
- `backend`: API Express.
- `waha`: gateway WhatsApp.

O backend executa:

```bash
npx prisma migrate deploy && node dist/src/server.js
```

## Backend

Build:

```bash
cd backend
npm run build
```

Start:

```bash
npm run start
```

Deploy de migrations:

```bash
npm run prisma:deploy
```

## Frontend

Build:

```bash
cd frontend
npm run build
```

Preview:

```bash
npm run preview
```

## Variaveis obrigatorias em producao

Backend:

```txt
DATABASE_URL
JWT_SECRET
CORS_ORIGIN
FRONTEND_URL
PUBLIC_BACKEND_URL
WAHA_BASE_URL
WAHA_API_KEY
WAHA_WEBHOOK_SECRET
WHATSAPP_PROVIDER
```

Frontend:

```txt
VITE_API_BASE_URL
VITE_DEMO_TENANT_SLUG
```

## Observabilidade minima

Manter visiveis:

- logs HTTP do backend;
- falhas de Prisma;
- falhas de webhook WAHA;
- erros 401/403 anormais;
- falhas de envio WhatsApp;
- tempo de resposta em pedidos e cardapio.

## WAHA em Railway

Quando WAHA e API rodam no mesmo projeto Railway, a API deve falar com o WAHA pela rede privada e pela porta HTTP real do WAHA:

```txt
WAHA_BASE_URL=http://${{waha.RAILWAY_PRIVATE_DOMAIN}}:3000
```

Cuidados:

- O WAHA informa nos logs a porta em que a API HTTP esta rodando. No container oficial, normalmente e `3000`.
- Nao confundir a porta publica/antiga usada por outros servicos com a porta da API WAHA.
- Se `/tenant/whatsapp/health` retornar HTML com `Cannot GET /api/sessions`, a API provavelmente esta apontando para porta/base URL errada.
- O volume persistente do WAHA deve permanecer montado no diretorio de sessoes, por exemplo `/app/.sessions`, para a sessao sobreviver a redeploys.
- Webhooks devem apontar para `PUBLIC_BACKEND_URL/public/webhooks/waha`, nao para o dominio publico do proprio WAHA.
- Eventos esperados para sessao/mensagens: `session.status`, `message` e `message.any`.
- Nao configure evento `qr` sem confirmar suporte da versao do WAHA em uso. A imagem observada em producao rejeita `qr` com HTTP 400; o QR deve ser buscado pela API em `/api/{session}/auth/qr`.

## WhatsApp com Baileys

O backend suporta migracao gradual do WhatsApp por provider:

```txt
WHATSAPP_PROVIDER=WAHA
WHATSAPP_PROVIDER=BAILEYS
```

Cuidados:

- O default seguro continua sendo `WAHA`; use `BAILEYS` apenas em loja piloto ate validar estabilidade.
- Baileys roda dentro do processo Node.js do backend e persiste auth state no PostgreSQL via Prisma.
- A sessao Baileys nao depende do volume do WAHA, mas depende das migrations aplicadas.
- Com mais de uma replica do backend, garanta que apenas uma instancia gerencie a mesma sessao ou implemente lock operacional antes do rollout amplo.
- Pareamento Baileys pode usar QR Code ou `POST /tenant/whatsapp/session/pairing-code`.
- Nao remova o service WAHA enquanto ainda houver tenant com provider `WAHA` ou enquanto o rollback por tenant ainda for necessario.

## Checklist de deploy

- `npm run build` no backend.
- `npm run build` no frontend.
- Migrations revisadas.
- Env vars configuradas.
- CORS apontando para frontend correto.
- `PUBLIC_BACKEND_URL` acessivel externamente quando usado por webhook.
- WAHA acessivel pelo backend.
- Healthcheck respondendo.
- Seed executado apenas quando apropriado.

## Cuidados

- Nunca usar segredo demo em producao.
- Nunca apontar frontend de producao para backend local.
- Nao rodar `migrate dev` em producao.
- Nao apagar volume do Postgres sem backup.
- Validar webhooks antes de habilitar automacoes WhatsApp.

