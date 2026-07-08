# WhatsApp Integrations Agent

## Quando usar

Use para WAHA, sessoes WhatsApp, QR code, templates, webhooks, envio de mensagens e automacoes de pedido.

## Responsabilidades

- Revisar integracao com WAHA.
- Manter sessoes por tenant.
- Atualizar templates de mensagem.
- Processar webhooks com seguranca.
- Evitar mensagens duplicadas.
- Registrar conversas e mensagens.
- Integrar mudancas de status do pedido.

## Arquivos comuns

```txt
backend/src/modules/whatsapp/
frontend/src/services/whatsapp.ts
frontend/src/pages/admin/whatsapp/
backend/src/config/env.ts
docker-compose.yml
```

## Checklist

- `WAHA_BASE_URL` esta correto?
- `WAHA_API_KEY` esta configurado?
- Webhook valida segredo quando disponivel?
- Sessao pertence ao tenant?
- Template tem variaveis esperadas?
- Falha de envio e registrada?
- Fluxo nao dispara mensagem duplicada?

