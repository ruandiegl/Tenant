# Plano 001 - Correcao de bugs WAHA

## 1. Agente principal selecionado

Agente principal: **WhatsApp Integrations Agent**

Justificativa:

- A tarefa envolve WAHA, sessoes WhatsApp, QR code, webhooks, envio/recebimento de mensagens e duplicidade de mensagens.
- Conforme `docs/agents/README.md`, mudancas em WhatsApp devem usar `WhatsApp Integrations Agent` com apoio de `Security Agent` e `QA Agent`.
- A documentacao do agente especifico lista exatamente os arquivos e riscos envolvidos:
  - `backend/src/modules/whatsapp/`
  - `frontend/src/services/whatsapp.ts`
  - `frontend/src/pages/admin/whatsapp/`
  - `backend/src/config/env.ts`
  - `docker-compose.yml`

Agentes de apoio:

- **Security Agent**: validar webhook secret, isolamento por tenant, logs sem vazamento de dados sensiveis, idempotencia de eventos externos.
- **QA Agent**: definir casos de regressao, simular retries de webhook, validar QR, mensagens unicas e estados de UI.
- **Backend Agent**: apoiar rotas, services, Zod, Prisma e eventos Socket.IO.
- **Frontend Agent**: apoiar tela WhatsApp, listeners, estados de loading/erro e invalidacao/cache.
- **DevOps Agent**: apoiar variaveis `WAHA_*`, `PUBLIC_BACKEND_URL`, healthcheck, logs e ambiente Railway/Docker.

## 2. Referencias usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/whatsapp-integrations-agent.md`
- `docs/04-backend-guidelines.md`
- `docs/07-api-tempo-real.md`
- `docs/08-seguranca-multitenancy.md`
- `docs/09-testes-qualidade.md`
- PRD anexado: Correcao de Bugs do Modulo WhatsApp (WAHA)

## 3. Objetivo

Restaurar a confiabilidade do modulo WhatsApp/WAHA, garantindo que:

- QR code conecte e atualize corretamente.
- Status da sessao reflita o estado real do WAHA.
- Cada webhook de mensagem seja processado no maximo uma vez.
- A mensagem inicial respeite delay configuravel.
- Exclusao de mensagens funcione de forma persistente.
- A UI nao exiba "Aguardando conexao" quando a sessao ja estiver conectada.

## 4. Escopo tecnico

Backend:

- `backend/src/modules/whatsapp/whatsapp.routes.ts`
- `backend/src/modules/whatsapp/whatsapp.controller.ts`
- `backend/src/modules/whatsapp/whatsapp.service.ts`
- `backend/src/modules/whatsapp/whatsapp.schemas.ts`
- `backend/src/modules/whatsapp/waha.client.ts`
- `backend/src/config/socket.ts`
- `backend/src/app.ts`
- `backend/prisma/schema.prisma`
- migrations, se idempotencia/exclusao exigir novo campo/tabela

Frontend:

- `frontend/src/pages/admin/whatsapp/`
- `frontend/src/services/whatsapp.ts`
- providers/hooks de tempo real, se necessario
- tipos em `frontend/src/types/database.ts`

Infra/operacao:

- env vars WAHA
- webhook publico
- logs Railway/Docker
- volume persistente WAHA

Fora de escopo:

- RAG/chatbot.
- Criacao de novos templates de marketing.
- Alteracoes profundas em pedidos, exceto notificacoes ja integradas ao WhatsApp.

## 5. Diagnostico inicial obrigatorio

Antes de alterar codigo, executar uma auditoria curta:

1. Confirmar versao do WAHA em producao e local.
2. Confirmar `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_WEBHOOK_SECRET`, `PUBLIC_BACKEND_URL` e `FRONTEND_URL`.
3. Confirmar se backend roda uma ou mais instancias.
4. Verificar se o webhook configurado no WAHA aponta para:

```txt
POST /public/webhooks/waha
```

5. Verificar no banco:

- `WhatsappSession`
- `WhatsappConversation`
- `WhatsappMessage`
- campos unicos existentes para deduplicacao

6. Verificar logs de producao durante:

- criacao de sessao
- leitura do QR
- mensagem recebida
- envio de resposta automatica

## 6. Plano por problema

### 6.1 P0 - Mensagens triplicadas

Hipotese principal:

- Webhook do WAHA chegando mais de uma vez ou sendo processado mais de uma vez sem idempotencia forte.

Implementacao:

1. Auditar `handleIncomingMessage` e fluxo de persistencia em `whatsapp.service.ts`.
2. Garantir chave idempotente por mensagem externa:
   - usar `externalId` do WAHA quando existir;
   - fallback para hash estavel com `sessionName`, `chatId`, `timestamp`, `body`.
3. Garantir constraint unica por tenant/sessao/externalId ou tabela de processamento.
4. Se ja existir `WhatsappMessage.externalId`, validar se existe indice unico adequado.
5. Ajustar processamento:
   - persistir evento/mensagem primeiro;
   - se ja existir, retornar sem reenviar resposta;
   - resposta automatica somente apos insert bem-sucedido.
6. Garantir resposta HTTP 200 rapida ao WAHA.
7. Se processamento pesado crescer, planejar fila ou processamento assincorno pos-ack.

Criterios de aceite:

- Reenviar o mesmo payload de webhook 3 vezes gera apenas 1 mensagem enviada.
- Logs mostram duplicata ignorada.
- Banco nao registra mensagens duplicadas para mesmo `externalId`.

Testes:

- Teste unitario/service para deduplicacao.
- Teste manual com payload repetido via HTTP.
- Teste em producao controlado com uma conversa real.

### 6.2 P0 - QR code nao conecta

Hipotese principal:

- Status `WORKING`/`CONNECTED` do WAHA nao atualiza corretamente a sessao no banco ou nao chega ate a UI.

Implementacao:

1. Mapear todos os eventos de status recebidos no webhook.
2. Normalizar status WAHA para status interno:
   - `SCAN_QR_CODE` -> `PENDING_QR`
   - `WORKING`/`CONNECTED`/`AUTHENTICATED` -> `CONNECTED`
   - `FAILED`/`ERROR` -> `ERROR`
   - `STOPPED`/`DISCONNECTED` -> `DISCONNECTED`
3. Garantir idempotencia e nao regressao:
   - se status atual e `CONNECTED`, evento atrasado de QR nao deve voltar para `PENDING_QR`;
   - evento de erro deve registrar `lastError` sem apagar dados uteis indevidamente.
4. Emitir evento Socket.IO para sala do tenant quando status mudar.
5. Atualizar UI sem refresh manual.
6. Melhorar `lastError` exibido na tela WhatsApp.

Criterios de aceite:

- Apos scan valido, status muda para conectado em ate 10 segundos.
- UI troca de QR para conectado sem refresh.
- Logs mostram status recebido e status persistido.

### 6.3 P1 - QR code nao atualiza

Hipotese principal:

- QR novo nao e emitido para frontend ou estado React fica com imagem antiga.

Implementacao:

1. Verificar se WAHA envia evento de QR expirado/novo QR.
2. Persistir cada novo QR no `WhatsappSession.qrCode`.
3. Emitir Socket.IO para tenant com payload contendo:

```txt
sessionId
sessionName
status
qrCode
lastStatusAt
```

4. Frontend deve manter listener ativo na tela WhatsApp.
5. Ao receber QR novo:
   - substituir imagem imediatamente;
   - remover `lastError` relacionado a QR antigo;
   - exibir estado "gerando novo QR" quando aplicavel.
6. Manter polling como fallback caso Socket.IO nao esteja ativo.

Criterios de aceite:

- QR expirado nao permanece na tela.
- Botao "Atualizar QR" continua funcionando.
- Novo QR aparece sem reload.

### 6.4 P1 - Excluir mensagens nao funciona

Decisao funcional pendente:

- Definir se exclusao remove apenas do historico interno PodePedir ou tambem chama API WAHA/WhatsApp.

Plano recomendado:

- Primeira entrega: exclusao logica/persistente no historico interno.
- Segunda entrega opcional: exclusao no WhatsApp via WAHA, se a API/tempo limite do WhatsApp permitir.

Implementacao:

1. Auditar se existe endpoint de exclusao.
2. Se nao existir, criar:

```txt
DELETE /tenant/whatsapp/messages/:id
```

3. Schema Zod para `params.id`.
4. Service deve usar `findFirst` com `tenantId` e `id`.
5. Preferir soft delete:
   - `deletedAt`
   - ou `status = DELETED`, se modelo ja suportar.
6. Frontend deve:
   - chamar service dedicado;
   - remover item do estado/lista;
   - invalidar query;
   - mostrar erro se falhar.
7. Se houver Socket.IO para conversa, emitir evento `whatsapp.message_deleted`.

Criterios de aceite:

- Mensagem excluida nao volta apos reload.
- Usuario ve erro claro se exclusao falhar.
- Nao e possivel excluir mensagem de outro tenant.

### 6.5 P2 - Delay na mensagem de iniciacao

Implementacao:

1. Criar configuracao global inicial:

```txt
WHATSAPP_AUTO_REPLY_DELAY_MS=2000
```

2. Ler em `env.ts` com limite seguro:
   - minimo 0
   - maximo sugerido 10000 ms
3. Antes de enviar mensagem inicial, aguardar delay de forma assincorna.
4. Nao bloquear resposta HTTP do webhook.
5. Registrar log de envio agendado.

Evolucao futura:

- Mover delay para configuracao por tenant no banco, caso restaurantes precisem tempos diferentes.

Criterios de aceite:

- Mensagem inicial respeita delay configurado.
- Outros webhooks continuam sendo processados durante a espera.

### 6.6 P2 - Remover "Aguardando conexao" do topo

Implementacao:

1. Localizar origem do texto na tela WhatsApp.
2. Remover exibicao fixa no `PageHeader`.
3. Mostrar status apenas no card de sessao.
4. Se mantido no topo, condicionar estritamente:
   - `PENDING_QR`
   - `DISCONNECTED`
   - `ERROR`
5. Nunca exibir quando status for `CONNECTED`.

Criterios de aceite:

- Quando sessao conectada, topo nao mostra "Aguardando conexao".
- Layout nao reserva espaco vazio.

## 7. Mudancas de banco previstas

Avaliar necessidade de migration para:

1. Deduplicacao de mensagem:

```txt
WhatsappMessage.externalId
unique(tenantId, sessionId, externalId)
```

2. Soft delete:

```txt
WhatsappMessage.deletedAt
```

3. Opcional para webhook/event processing:

```txt
WhatsappWebhookEvent
- id
- tenantId
- sessionName
- externalEventId
- eventType
- payloadHash
- processedAt
- createdAt
unique(sessionName, externalEventId)
```

Decisao:

- Se `WhatsappMessage.externalId` ja cobre deduplicacao, evitar tabela nova.
- Se payloads do WAHA nem sempre trazem ID confiavel, criar tabela de eventos.

## 8. Contratos e eventos

Endpoints existentes a preservar:

```txt
GET /tenant/whatsapp/session
POST /tenant/whatsapp/session
POST /tenant/whatsapp/session/qr
POST /tenant/whatsapp/session/stop
PATCH /tenant/whatsapp/session/settings
POST /tenant/whatsapp/messages/test
GET /tenant/whatsapp/templates
PATCH /tenant/whatsapp/templates/:id
DELETE /tenant/whatsapp/templates/:id
POST /public/webhooks/waha
```

Novos endpoints possiveis:

```txt
DELETE /tenant/whatsapp/messages/:id
```

Eventos Socket.IO propostos:

```txt
whatsapp.session_updated
whatsapp.qr_updated
whatsapp.message_received
whatsapp.message_deleted
```

Rooms:

```txt
tenant:{tenantId}
```

Regras:

- Emitir eventos somente apos persistencia.
- Nao enviar dados de outro tenant.
- Payload deve ser suficiente para UI atualizar sem reload.

## 9. Logs e observabilidade

Adicionar logs estruturados para:

- webhook recebido;
- sessionName;
- tenantId resolvido;
- event type;
- status WAHA bruto;
- status interno normalizado;
- externalId/messageId;
- decisao de deduplicacao;
- envio automatico agendado;
- envio automatico concluido/falhou;
- QR atualizado;
- webhook sem assinatura valida.

Nao logar:

- corpo completo de mensagens sensiveis;
- tokens;
- `WAHA_API_KEY`;
- `WAHA_WEBHOOK_SECRET`;
- JWT.

## 10. Plano de testes

### Backend

Rodar:

```bash
cd backend
npm run lint
npm run build
```

Casos manuais/API:

1. Criar sessao WhatsApp.
2. Atualizar QR.
3. Simular webhook `session.status` com `SCAN_QR_CODE`.
4. Simular webhook `session.status` com `WORKING`.
5. Simular webhook de mensagem recebida.
6. Repetir mesmo webhook 3 vezes.
7. Confirmar apenas uma resposta automatica.
8. Excluir mensagem e validar reload.

### Frontend

Rodar:

```bash
cd frontend
npm run build
```

Casos manuais:

1. Abrir tela WhatsApp sem sessao.
2. Criar sessao.
3. Ver QR.
4. Esperar atualizacao de QR.
5. Escanear QR.
6. Confirmar tela conectada sem reload.
7. Verificar ausencia de "Aguardando conexao" quando conectado.
8. Excluir mensagem, quando tela/lista existir.

### Producao controlada

1. Validar `/health`.
2. Validar webhook publico.
3. Monitorar logs por 30 minutos apos deploy.
4. Enviar 3 mensagens reais de teste.
5. Confirmar zero duplicidade.

## 11. Sequencia de implementacao

### Fase 1 - Auditoria e protecao contra duplicidade

1. Auditar modelo Prisma e service WhatsApp.
2. Implementar/validar chave idempotente.
3. Ajustar webhook para retorno rapido.
4. Adicionar logs estruturados.
5. Testar payload repetido.

Saida esperada:

- Mensagens triplicadas corrigidas.

### Fase 2 - Sessao, QR e tempo real

1. Revisar normalizacao de status WAHA.
2. Garantir nao regressao de status.
3. Emitir eventos Socket.IO para status/QR.
4. Frontend ouvir status/QR.
5. Manter polling como fallback.

Saida esperada:

- QR conecta e atualiza sem refresh.

### Fase 3 - UX e delay

1. Implementar delay configuravel.
2. Ajustar "Aguardando conexao".
3. Melhorar mensagens de erro.
4. Validar loading/empty/error states.

Saida esperada:

- Tela WhatsApp previsivel e sem falso status.

### Fase 4 - Exclusao de mensagens

1. Definir escopo da exclusao.
2. Criar endpoint/service/schema.
3. Ajustar frontend.
4. Adicionar evento/invalidation.
5. Testar persistencia apos reload.

Saida esperada:

- Exclusao funcional e segura por tenant.

### Fase 5 - Validacao final e release

1. Rodar builds.
2. Testar local.
3. Testar ambiente Railway/WAHA.
4. Validar QR real.
5. Validar mensagem recebida real.
6. Monitorar logs.
7. Documentar variaveis novas.

## 12. Riscos

- WAHA pode alterar nomes de eventos entre versoes.
- Retry do WAHA pode acontecer por timeout; se processamento nao for ack rapido, duplicidade pode voltar.
- Se houver multiplas replicas do backend, deduplicacao em memoria nao basta.
- QR e sessao dependem de volume persistente do WAHA.
- Logs excessivos podem expor dados sensiveis se mensagem completa for logada.

## 13. Rollback

Rollback recomendado:

1. Manter migration reversivel quando possivel.
2. Se nova deduplicacao bloquear mensagens validas, desativar apenas auto-reply via setting do tenant.
3. Reverter frontend para polling manual se Socket.IO falhar.
4. Preservar `POST /public/webhooks/waha` compativel com payload antigo.
5. Antes do deploy, registrar versao anterior do Railway/Vercel para rollback rapido.

## 14. Checklist de pronto

- [ ] Mensagem recebida nao gera duplicidade.
- [ ] QR conecta e muda para conectado sem refresh.
- [ ] QR expirado atualiza automaticamente.
- [ ] Delay configuravel aplicado.
- [ ] Exclusao de mensagem funciona e persiste apos reload.
- [ ] "Aguardando conexao" nao aparece quando conectado.
- [ ] Webhook valida segredo quando configurado.
- [ ] Queries filtram por `tenantId`.
- [ ] Logs nao vazam segredo ou conteudo sensivel.
- [ ] `backend npm run lint` passa.
- [ ] `backend npm run build` passa ou justificativa documentada.
- [ ] `frontend npm run build` passa.
- [ ] Documentacao/env vars atualizadas se houver nova variavel.

## 15. Execucao em 2026-07-08

Implementado:

- Idempotencia de mensagens recebidas usando `externalId` do WAHA ou hash estavel por sessao/chat/timestamp/corpo.
- Webhook WAHA com `ack` rapido e processamento assincorno para reduzir retries/duplicidade.
- Logs estruturados sem expor corpo da mensagem, token ou segredo.
- Normalizacao de status WAHA e protecao contra regressao de `CONNECTED` para `PENDING_QR` por evento atrasado.
- Persistencia/emissao de eventos para sessao, QR, mensagem recebida e mensagem excluida.
- Delay configuravel por `WHATSAPP_AUTO_REPLY_DELAY_MS`, default `2000`.
- Soft delete de mensagens via `deletedAt` e endpoint `DELETE /tenant/whatsapp/messages/:id`.
- Ajuste visual para nao mostrar "Aguardando conexao" no topo quando a sessao estiver conectada.
- Migration `20260708120000_add_whatsapp_message_deleted_at`.

Validado:

- `backend npm run lint`: passou.
- `backend npx prisma validate`: passou.
- `frontend npm run build`: passou.
- Build Docker no Railway: passou.
- Deploy Railway service `waha`: `SUCCESS`, instancia `RUNNING`.
- `GET https://waha-production-25e7.up.railway.app/health`: 200, database `ok`.
- CORS com `Origin: https://tenant-rust.vercel.app`: permitido.
- Deploy Vercel producao: publicado e alias `https://tenant-rust.vercel.app` atualizado.

Pendente de validacao manual real:

- Escanear QR em producao e confirmar troca para `CONNECTED` na tela.
- Enviar a mesma mensagem algumas vezes no WhatsApp e confirmar uma unica resposta automatica.
- Validar renovacao de QR expirado observando a tela sem reload.
- Validar exclusao na UI quando existir lista/historico de conversas consumindo o endpoint.
