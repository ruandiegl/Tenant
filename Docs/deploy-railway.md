# Deploy no Railway

Este projeto deve ficar dividido em tres servicos:

- `frontend`: Vercel, apontando para a API publica.
- `backend`: Railway, usando `backend/Dockerfile`.
- `waha`: Railway, usando `waha/Dockerfile` e volume persistente.

## Backend

Crie um servico no Railway apontando para a pasta `backend`.

Variaveis obrigatorias:

```txt
NODE_ENV=production
PORT=3333
DATABASE_URL=<postgresql-publico-ou-privado-do-railway>
JWT_SECRET=<segredo-forte>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://seu-front.vercel.app
FRONTEND_URL=https://seu-front.vercel.app
PUBLIC_BACKEND_URL=https://sua-api.up.railway.app
WAHA_BASE_URL=https://seu-waha.up.railway.app
WAHA_API_KEY=<mesma-chave-do-waha>
WAHA_WEBHOOK_SECRET=<segredo-do-webhook>
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

Se usar previews do Vercel, `CORS_ORIGIN` pode receber varias origens separadas por virgula:

```txt
CORS_ORIGIN=https://app.vercel.app,https://app-git-main.vercel.app
```

## WAHA

Crie um servico no Railway apontando para a pasta `waha`.

Variaveis recomendadas:

```txt
PORT=3000
WAHA_API_KEY=<mesma-chave-do-backend>
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD=<senha-forte>
WHATSAPP_DEFAULT_ENGINE=WEBJS
```

Anexe um volume persistente no caminho:

```txt
/app/.sessions
```

Sem esse volume, o WhatsApp pode perder a sessao apos redeploy/restart.

## Frontend Vercel

No projeto Vercel do frontend, configure:

```txt
VITE_API_BASE_URL=https://sua-api.up.railway.app
VITE_DEMO_TENANT_SLUG=demo-burger
```

Depois de alterar envs no Vercel, faca novo deploy do frontend.

## Checklist de validacao

1. Abrir `https://sua-api.up.railway.app/health`.
2. Fazer login no frontend.
3. Abrir cardapio publico.
4. Criar sessao WhatsApp no admin.
5. Ler QR Code.
6. Enviar mensagem para o numero conectado.
7. Fazer pedido teste e mudar status para `PREPARING` e `DISPATCHED`.
