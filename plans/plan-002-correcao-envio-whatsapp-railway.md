# Plano 002 - Correcao de envio WhatsApp no Railway

## 1. Agente principal selecionado

Agente principal: **DevOps Agent**

Justificativa:

- O PRD descreve um bug especifico de producao no Railway: QR conecta, sessao fica online, mas mensagens outbound nao chegam.
- O problema envolve rede, egress, env vars, service discovery, healthcheck, logs e deploy.
- Conforme `docs/agents/README.md`, mudancas de infraestrutura devem usar `DevOps Agent + Release Manager Agent`.

Agentes de apoio:

- **WhatsApp Integrations Agent**: revisar WAHA, sessoes, envio de mensagens e payloads de envio.
- **Backend Agent**: ajustar service/controller/routes, tratamento de erro, Zod e contratos internos.
- **Security Agent**: revisar secrets, API key WAHA, rotas de diagnostico e mascaramento de telefone/logs.
- **QA Agent**: definir smoke test real, casos de regressao e validacao multi tenant.
- **Release Manager Agent**: coordenar deploy, rollback, checklist final e evidencias.

## 2. Referencias usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/devops-agent.md`
- `docs/agents/whatsapp-integrations-agent.md`
- `docs/agents/backend-agent.md`
- `docs/agents/security-agent.md`
- `docs/agents/qa-agent.md`
- `docs/agents/release-manager-agent.md`
- PRD anexado: Correcao - Mensagens nao sao enviadas via WhatsApp no ambiente Railway

## 3. Objetivo

Identificar e corrigir a causa raiz do envio de mensagens WhatsApp falhar no Railway, mantendo o fluxo de conexao por QR intacto.

Ao final, o sistema deve:

- Enviar mensagens reais via WAHA em producao Railway.
- Exibir/logar erro claro quando o envio falhar.
- Ter um healthcheck de conectividade backend -> WAHA.
- Permitir smoke test controlado apos deploy.
- Preservar seguranca, tenant isolation e secrets.

## 4. Escopo tecnico

Backend:

- `backend/src/modules/whatsapp/whatsapp.service.ts`
- `backend/src/modules/whatsapp/waha.client.ts`
- `backend/src/modules/whatsapp/whatsapp.routes.ts`
- `backend/src/modules/whatsapp/whatsapp.controller.ts`
- `backend/src/modules/whatsapp/whatsapp.schemas.ts`
- `backend/src/config/env.ts`
- `backend/src/config/cors.ts`, se houver impacto em producao

Infra/operacao:

- `Dockerfile.railway`
- `railway-start.sh`
- `railway.json`
- Railway env vars do service `waha`
- WAHA service URL interna/publica
- Logs Railway build/deploy/runtime

Frontend:

- Fora do escopo principal, exceto se a UI de teste enviar payload errado ou esconder erro da API.

Fora de escopo:

- Fluxo de QR code/conexao, salvo se o status conectado estiver falso para envio.
- Criacao de templates novos.
- Chatbot/RAG.
- Reestruturacao ampla do modulo WhatsApp.

## 5. Diagnostico inicial obrigatorio

Antes de alterar codigo funcional, executar auditoria curta:

1. Confirmar arquitetura Railway atual:
   - WAHA e backend no mesmo container ou services separados?
   - Porta publica exposta.
   - URL interna se houver service separado.
   - Healthcheck configurado.
2. Confirmar env vars em Railway sem imprimir secrets:
   - `WAHA_BASE_URL`
   - `WAHA_API_KEY`
   - `WAHA_WEBHOOK_SECRET`
   - `PUBLIC_BACKEND_URL`
   - `FRONTEND_URL`
   - engine/session storage WAHA, se existir.
3. Confirmar se `WAHA_BASE_URL` aponta para:
   - URL interna correta em Railway, ou
   - localhost/porta correta quando backend e WAHA rodam no mesmo container.
4. Confirmar endpoints WAHA disponiveis a partir do backend:
   - listar sessoes;
   - obter status da sessao;
   - enviar texto para uma conversa de teste.
5. Ler logs Railway no momento de um envio real:
   - request da UI/API;
   - chamada backend -> WAHA;
   - resposta WAHA;
   - erro/timeout.
6. Confirmar se envio e sincrono ou depende de fila/worker.

## 6. Hipoteses por probabilidade

### 6.1 P0 - URL WAHA incorreta dentro do Railway

Sintoma esperado:

- Sessao conecta por WAHA, mas backend chama URL errada ao enviar.
- Erros possiveis: DNS, connection refused, timeout, 404/502.

Investigacao:

- Validar `WAHA_BASE_URL` efetivo em runtime.
- Criar healthcheck backend -> WAHA que chama endpoint simples do WAHA.
- Confirmar se deploy combinado usa porta interna correta.

Correcao:

- Ajustar env var no Railway.
- Se necessario, ajustar `railway-start.sh`/config para expor WAHA e backend corretamente.
- Documentar qual URL deve ser usada por ambiente:
  - local docker compose;
  - Railway combinado;
  - Railway services separados.

### 6.2 P0 - Erro de envio esta sendo engolido ou pouco observavel

Sintoma esperado:

- UI indica envio, mas nao ha mensagem.
- Logs nao mostram status HTTP, payload alvo nem erro WAHA.

Implementacao:

- Instrumentar `sendTextMessage`/cliente WAHA.
- Logar inicio, sucesso e falha de envio.
- Mascarar telefone/chatId nos logs.
- Propagar `AppError` claro para chamada manual/teste.
- Persistir `lastError` na sessao quando envio falhar.

### 6.3 P1 - Endpoint/payload de envio WAHA divergente da versao/engine em Railway

Sintoma esperado:

- WAHA esta conectado, mas endpoint de envio mudou ou engine exige formato diferente.
- Erros possiveis: 400, 404, "session not found", "chat not found", "not ready".

Investigacao:

- Confirmar versao/engine WAHA em Railway.
- Comparar endpoint usado pelo codigo com API real do WAHA rodando.
- Testar chamada manual equivalente ao `sendTextMessage`.

Correcao:

- Ajustar endpoint e payload no `waha.client.ts` ou service.
- Normalizar resposta WAHA e erros conhecidos.

### 6.4 P1 - Sessao `CONNECTED` ainda nao esta pronta para envio

Sintoma esperado:

- Status interno conectado, mas WAHA rejeita envio logo apos QR.

Investigacao:

- Logar status bruto WAHA antes do envio.
- Diferenciar `CONNECTED` interno de estado WAHA real no momento do send.

Correcao:

- Antes do envio, consultar status WAHA quando necessario.
- Retornar erro claro: "sessao ainda nao pronta para envio".
- Opcional: retry curto e limitado para status transitorio.

### 6.5 P1 - Worker/fila de envio nao roda no Railway

Sintoma esperado:

- API apenas agenda mensagem, mas nenhum processo consome fila.

Investigacao:

- Confirmar se envio atual e direto ou assincorno.
- Buscar jobs, filas, cron ou worker no repo.

Correcao:

- Se houver worker, provisionar service Railway dedicado.
- Se nao houver worker, garantir que o caminho atual chama WAHA diretamente e retorna erro real.

## 7. Implementacao proposta

### 7.1 Healthcheck interno backend -> WAHA

Criar endpoint protegido para diagnostico operacional:

```txt
GET /tenant/whatsapp/health
```

Resposta esperada:

```json
{
  "ok": true,
  "wahaReachable": true,
  "sessionName": "podepedir-demo-burguer",
  "sessionStatus": "WORKING",
  "latencyMs": 123
}
```

Regras:

- Exigir auth tenant e permissao de configuracao.
- Nunca retornar `WAHA_API_KEY`, webhook secret ou URL com segredo.
- Retornar erro sanitizado, mas util.

Opcional para superadmin:

```txt
GET /platform/whatsapp/health
```

Usar apenas se ja existir padrao de rota platform adequado.

### 7.2 Instrumentacao de envio

No fluxo de envio, registrar:

- `tenantId`
- `sessionId`
- `sessionName`
- `chatId` mascarado
- endpoint WAHA chamado, sem query secreta
- status HTTP WAHA
- latencia
- erro normalizado
- tipo de envio: teste, auto-reply, status pedido

Nao logar:

- corpo completo da mensagem;
- API key;
- webhook secret;
- JWT;
- telefone completo, salvo ultimos 4 digitos.

### 7.3 Tratamento de erro WAHA

Padronizar erros:

- `WAHA_UNREACHABLE`: DNS, connection refused, timeout.
- `WAHA_UNAUTHORIZED`: API key ausente/invalida.
- `WAHA_SESSION_NOT_FOUND`: sessao nao existe no WAHA.
- `WAHA_SESSION_NOT_READY`: sessao existe, mas nao esta pronta.
- `WAHA_SEND_REJECTED`: WAHA respondeu 4xx/5xx com detalhe.

Persistir falha em `WhatsappSession.lastError`.

### 7.4 Smoke test de envio

Manter endpoint atual de teste:

```txt
POST /tenant/whatsapp/messages/test
```

Melhorias:

- Retornar status claro do WAHA.
- Retornar `messageId`/response id quando disponivel.
- Se falhar, retornar codigo e mensagem acionavel.
- Logar tentativa com destino mascarado.

## 8. Auditoria de Railway/env vars

Checklist de variaveis:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `PUBLIC_BACKEND_URL`
- `CORS_ORIGIN`
- `WAHA_BASE_URL`
- `WAHA_API_KEY`
- `WAHA_WEBHOOK_SECRET`
- `WHATSAPP_AUTO_REPLY_DELAY_MS`
- Variaveis proprias do container WAHA, se existirem:
  - engine;
  - storage;
  - sessions path;
  - auth/api key;
  - base path/port.

Validacoes:

- `PUBLIC_BACKEND_URL` deve apontar para a API publica Railway.
- `FRONTEND_URL` deve apontar para Vercel producao.
- `WAHA_BASE_URL` deve ser acessivel a partir do backend, nao apenas do navegador.
- Secrets devem existir no Railway e nao no codigo.

## 9. Plano de testes

### 9.1 Local

Rodar:

```bash
cd backend
npm run lint
npm run build
```

Testes manuais:

1. Subir WAHA local.
2. Criar/conectar sessao.
3. Rodar health backend -> WAHA.
4. Enviar mensagem teste.
5. Forcar WAHA indisponivel e confirmar erro claro.
6. Usar API key invalida e confirmar erro claro.

### 9.2 Railway

1. Deploy backend/WAHA.
2. Confirmar `/health` geral da API.
3. Confirmar `/tenant/whatsapp/health` autenticado.
4. Enviar mensagem teste para numero controlado.
5. Monitorar logs:
   - tentativa de envio;
   - resposta WAHA;
   - sucesso/falha.
6. Confirmar mensagem entregue no WhatsApp.

### 9.3 Regressao WhatsApp

1. QR segue conectando.
2. Auto-reply ainda respeita deduplicacao do plano 001.
3. Mensagem de status de pedido ainda usa templates.
4. Tenant A nao acessa sessao/mensagens do Tenant B.
5. Falha de envio nao derruba webhook.

## 10. Sequencia de execucao

### Fase 1 - Observabilidade

1. Auditar `sendTextMessage` e `waha.client.ts`.
2. Adicionar logs estruturados e mascaramento.
3. Padronizar erros WAHA.
4. Persistir `lastError` em falhas de envio.

Saida esperada:

- Falha de envio deixa rastro claro.

### Fase 2 - Healthcheck WAHA

1. Criar service de diagnostico backend -> WAHA.
2. Criar controller/route protegida.
3. Validar schema/permission.
4. Testar contra WAHA local/Railway.

Saida esperada:

- Endpoint diferencia falha de rede/config de falha de regra de negocio.

### Fase 3 - Correcao de causa raiz

1. Comparar env vars local/Railway.
2. Corrigir `WAHA_BASE_URL` ou service discovery.
3. Ajustar payload/endpoint se a versao WAHA exigir.
4. Confirmar se precisa alterar Railway service layout.

Saida esperada:

- Envio de teste chega no WhatsApp em Railway.

### Fase 4 - Validacao e release

1. Rodar lint/build.
2. Deploy Railway.
3. Smoke test real.
4. Ver logs.
5. Documentar env vars e rollback.

Saida esperada:

- Producao com envio restabelecido e diagnostico permanente.

## 11. Criterios de aceite

- Mensagem enviada via tenant em Railway chega no WhatsApp real.
- Healthcheck backend -> WAHA retorna sucesso quando WAHA esta acessivel.
- Se WAHA estiver inacessivel, healthcheck retorna erro claro.
- Falha de envio aparece em log estruturado com contexto e sem segredo.
- `WhatsappSession.lastError` e atualizado em falha real de envio.
- Nenhum secret ou corpo completo de mensagem aparece nos logs.
- Fluxo de QR/conexao continua funcionando.
- `backend npm run lint` passa.
- `backend npm run build` passa ou existe justificativa tecnica registrada.
- Deploy Railway fica `SUCCESS`.

## 12. Riscos

- O WAHA pode estar no mesmo container do backend; alterar URL/porta sem entender o start script pode quebrar QR.
- Se a sessao estiver conectada mas o WhatsApp bloquear envio, o problema pode parecer infra mas ser estado de conta/dispositivo.
- Healthcheck muito detalhado pode expor informacao sensivel se nao for protegido.
- Retry sem limite pode voltar a causar duplicidade ou spam.
- Alterar engine WAHA pode invalidar sessoes existentes.

## 13. Rollback

Rollback recomendado:

1. Se o deploy quebrar QR ou API, reverter para deployment Railway anterior.
2. Se apenas envio novo falhar, manter logs/health e desativar auto-reply por tenant temporariamente.
3. Nao apagar volume WAHA sem backup/confirmacao.
4. Nao trocar engine WAHA em producao sem janela de manutencao.
5. Preservar env vars anteriores antes de alterar `WAHA_BASE_URL` ou API key.

## 14. Checklist de pronto

- [ ] Arquitetura Railway confirmada.
- [ ] Env vars WAHA auditadas sem expor secrets.
- [ ] Healthcheck backend -> WAHA implementado.
- [ ] Logs estruturados de envio implementados.
- [ ] Telefones/chatIds mascarados nos logs.
- [ ] Erros WAHA normalizados.
- [ ] `lastError` atualizado em falha de envio.
- [ ] Envio teste retorna resposta clara.
- [ ] Smoke test real em Railway aprovado.
- [ ] QR/conexao revalidado.
- [ ] Auto-reply revalidado.
- [ ] Notificacao de status de pedido revalidada.
- [ ] `backend npm run lint` passou.
- [ ] `backend npm run build` passou.
- [ ] Deploy Railway `SUCCESS`.
- [ ] Rollback documentado.

## 15. Execucao em 2026-07-08

Implementado:

- `GET /tenant/whatsapp/health` protegido por auth, tenant middleware e permissao `tenant.settings.read`.
- Healthcheck backend -> WAHA com chamada para `/api/sessions` e, quando existe sessao, `/api/sessions/:sessionName`.
- Retorno operacional sem secrets:
  - `ok`
  - `wahaReachable`
  - `sessionName`
  - `internalStatus`
  - `wahaStatus`
  - `normalizedWahaStatus`
  - `latencyMs`
  - `baseUrlHost`
- Cliente WAHA com timeout configuravel por `WAHA_REQUEST_TIMEOUT_MS`, default `15000`.
- Erros WAHA normalizados:
  - `WAHA_UNREACHABLE`
  - `WAHA_UNAUTHORIZED`
  - `WAHA_SESSION_NOT_FOUND`
  - `WAHA_SESSION_NOT_READY`
  - `WAHA_SEND_REJECTED`
- Envio outbound com logs estruturados de tentativa, sucesso e falha.
- Mascaramento de `chatId` nos logs de envio.
- Atualizacao de `WhatsappSession.lastError` em falha de envio.
- `POST /tenant/whatsapp/messages/test` agora retorna metadados de WAHA quando o envio passa:
  - `wahaStatus`
  - `latencyMs`
  - `messageId`
- Configuracao de webhook alterada de `?secret=...` para HMAC do WAHA (`hmac.key`), evitando secret na URL dos logs.
- Verificacao de webhook atualizada para aceitar `X-Webhook-Hmac` com `X-Webhook-Hmac-Algorithm: sha512`, mantendo compatibilidade temporaria com query `secret` antiga.

Diagnostico obtido:

- Arquitetura Railway atual usa backend e WAHA no mesmo container.
- `WAHA_BASE_URL` efetivo resolve para `127.0.0.1:3000`.
- Healthcheck backend -> WAHA em producao retornou `ok: true`, `wahaReachable: true`, latencia baixa e `listSessionsStatus: 200`.
- Sessao demo estava em `PENDING_QR` / WAHA `SCAN_QR_CODE`; portanto o smoke test real de envio depende de escanear QR antes.

Validado:

- `backend npm run lint`: passou.
- `backend npx prisma validate`: passou.
- `backend npm run build` local: bloqueado por `EPERM` no DLL do Prisma no Windows antes do `tsc`.
- Build Docker Railway: passou com `prisma generate && tsc`.
- Deploy Railway `77079297-7e88-4b1b-8c1a-9b7959ccbf88`: `SUCCESS`.
- Deploy Railway `68767d88-ce89-4d3d-b9c2-33e83bb5af94`: `SUCCESS`.
- `GET /health`: 200, database `ok`.
- `GET /tenant/whatsapp/health`: 200, WAHA acessivel.
- Sessao demo atualizada para webhook HMAC.
- Logs novos do WAHA mostram webhook para `/public/webhooks/waha` sem `?secret=`.

Pendente de validacao manual real:

- Escanear o QR da sessao demo/tenant desejado.
- Enviar mensagem teste para um numero controlado via `POST /tenant/whatsapp/messages/test`.
- Confirmar chegada no WhatsApp.
- Conferir log `WhatsApp outbound send succeeded` com `chatIdMasked`, `wahaStatus`, `durationMs` e sem corpo da mensagem.
- Revalidar auto-reply e notificacao de status de pedido com a sessao conectada.
