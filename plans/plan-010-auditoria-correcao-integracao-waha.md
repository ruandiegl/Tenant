# Plano 010 - Auditoria e correcao da integracao WAHA

## 1. Agente principal selecionado

Agente principal: **WhatsApp Integrations Agent**

Justificativa:

- A tarefa trata diretamente de WAHA, sessoes WhatsApp, QR Code, webhooks, templates e mensagens automaticas.
- Conforme `docs/agents/README.md`, mudancas em WhatsApp devem usar **WhatsApp Integrations Agent + Security Agent + QA Agent**.
- O problema central nao e apenas UI ou infraestrutura; e confiabilidade do ciclo de vida da sessao WAHA, persistencia, eventos, mapeamento de status, templates e erros apresentados ao usuario.

Agentes de apoio:

- **Security Agent**: revisar webhook WAHA, segredo/HMAC, isolamento por `tenantId`, secrets, permissoes e mensagens de erro sem vazamento tecnico.
- **QA Agent**: definir testes manuais/automatizados para QR, reconexao, templates, envio, webhook, queda de sessao e regressao.
- **Backend Agent**: ajustar services, rotas, Zod, Prisma e cliente WAHA.
- **Frontend Agent**: ajustar tela admin WhatsApp, services, polling/websocket, estados de QR e mensagens amigaveis.
- **DevOps Agent**: validar volume persistente do WAHA, variaveis Railway, engine WAHA, rede privada, logs e healthcheck operacional.
- **Documentation Agent**: atualizar docs de operacao, ambiente e troubleshooting WAHA apos a correcao.

## 2. Referencias usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/whatsapp-integrations-agent.md`
- `docs/agents/security-agent.md`
- `docs/agents/qa-agent.md`
- `docs/07-api-tempo-real.md`
- `docs/08-seguranca-multitenancy.md`
- `docs/09-testes-qualidade.md`
- `docs/10-deploy-operacao.md`
- PRD anexado: "Auditoria e Correcao da Integracao WAHA (WhatsApp)"
- Arquivos atuais relevantes:
  - `backend/src/modules/whatsapp/waha.client.ts`
  - `backend/src/modules/whatsapp/whatsapp.service.ts`
  - `backend/src/modules/whatsapp/whatsapp.controller.ts`
  - `backend/src/modules/whatsapp/whatsapp.routes.ts`
  - `backend/src/modules/whatsapp/whatsapp.schemas.ts`
  - `backend/src/config/env.ts`
  - `backend/src/config/socket.ts`
  - `backend/prisma/schema.prisma`
  - `frontend/src/services/whatsapp.ts`
  - `frontend/src/pages/admin/whatsapp/index.tsx`
  - `frontend/src/pages/admin/whatsapp/styles.css`
  - `docker-compose.yml`

## 3. Tarefa interpretada

Planejar uma auditoria completa e as correcoes necessarias na integracao WhatsApp via WAHA para resolver tres frentes:

1. QR Code e ciclo de conexao da sessao WAHA nao confiaveis.
2. CRUD de mensagens/templates configuraveis do bot possivelmente incompleto.
3. Erros tecnicos do WAHA/backend vazando crus para o usuario final.

Como a solicitacao veio com placeholder (`[DESCREVA SUA TAREFA AQUI]`), este plano assume como escopo concreto o PRD anexado de auditoria e correcao WAHA.

## 4. Objetivo

Ao final da execucao:

- O restaurante consegue criar/reconectar a sessao WhatsApp por QR Code de forma confiavel.
- A tela admin reflete rapidamente a transicao `PENDING_QR`/`SCAN_QR_CODE` -> `CONNECTED`/`WORKING`.
- QR expirado nao fica preso na tela sem feedback.
- A sessao WAHA sobrevive a restart/redeploy quando o volume persistente estiver corretamente montado.
- Templates de mensagens automaticas podem ser listados, editados, desativados/reativados e testados com preview das variaveis.
- Erros tecnicos do WAHA ficam nos logs/backend, enquanto a UI exibe mensagens amigaveis e acionaveis.
- Webhooks WAHA continuam protegidos por segredo quando configurado e nao vazam dados entre tenants.

## 5. Estado atual observado no codigo

### 5.1 Backend WhatsApp

O modulo existe em:

```txt
backend/src/modules/whatsapp/
```

Arquivos principais:

- `waha.client.ts`: cliente HTTP para WAHA, timeout e mapeamento inicial de erros.
- `whatsapp.service.ts`: sessao, QR, templates, envio, webhook, conversas, mensagens e auto reply.
- `whatsapp.routes.ts`: rotas tenant e webhook publico.
- `whatsapp.schemas.ts`: validacoes Zod.
- `whatsapp.controller.ts`: camada HTTP.

Rotas atuais conforme `docs/07-api-tempo-real.md` e codigo:

```txt
GET /tenant/whatsapp/health
GET /tenant/whatsapp/session
POST /tenant/whatsapp/session
POST /tenant/whatsapp/session/qr
POST /tenant/whatsapp/session/stop
PATCH /tenant/whatsapp/session/settings
POST /tenant/whatsapp/messages/test
DELETE /tenant/whatsapp/messages/:id
GET /tenant/whatsapp/templates
PATCH /tenant/whatsapp/templates/:id
DELETE /tenant/whatsapp/templates/:id
POST /public/webhooks/waha
```

### 5.2 Banco de dados

Ja existem modelos Prisma para:

- `WhatsappSession`
- `WhatsappConversation`
- `WhatsappMessage`
- `WhatsappMessageTemplate`

Pontos positivos:

- `WhatsappSession.tenantId` e unico.
- `WhatsappSession.sessionName` e unico.
- Templates sao unicos por `sessionId + trigger`.
- Mensagens possuem `deletedAt`.
- Conversas sao unicas por `sessionId + chatId`.

Pontos a auditar:

- Se `WhatsappMessageTemplate` precisa de criacao manual alem dos templates padrao.
- Se `deleteTemplate` deve desativar ou apagar; atualmente a estrategia aparente e desativar.
- Se `WhatsappMessage` precisa de listagem/restauracao/CRUD completo ou apenas soft delete.

### 5.3 Frontend WhatsApp

Arquivos principais:

```txt
frontend/src/services/whatsapp.ts
frontend/src/pages/admin/whatsapp/index.tsx
frontend/src/pages/admin/whatsapp/styles.css
```

Comportamento atual observado:

- Busca sessao com `getSession`.
- Cria/reconecta com `createOrStartSession`.
- Atualiza QR com `refreshQr`.
- Para sessao com `stopSession`.
- Edita preferencias da sessao.
- Envia mensagem de teste.
- Lista, edita e desativa templates.
- Faz polling a cada 10 segundos quando status e `PENDING_QR`.

Pontos a auditar:

- A UI ainda exibe `lastError` cru vindo do backend.
- O QR depende muito de polling e botao manual; precisa validar se eventos Socket.IO ja atualizam a tela.
- Falta estado explicito de QR expirado/renovando.
- Falta helper unico para traducao de erros WAHA.
- Falta preview claro de templates com variaveis.

### 5.4 Operacao/Railway

Variaveis obrigatorias conforme `docs/10-deploy-operacao.md`:

```txt
WAHA_BASE_URL
WAHA_API_KEY
WAHA_WEBHOOK_SECRET
PUBLIC_BACKEND_URL
FRONTEND_URL
```

Pontos operacionais criticos:

- Confirmar engine WAHA (`WEBJS`, `NOWEB` ou `GOWS`).
- Confirmar versao da imagem WAHA.
- Confirmar volume persistente montado no path correto de sessoes.
- Confirmar se WAHA esta acessivel pela API via rede privada Railway.
- Confirmar se webhook do WAHA aponta para `PUBLIC_BACKEND_URL/public/webhooks/waha`.

## 6. Decisoes tecnicas recomendadas

### 6.1 Status interno vs status WAHA

Manter a normalizacao interna:

```txt
WAHA: SCAN_QR_CODE/STARTING -> app: PENDING_QR
WAHA: WORKING/CONNECTED/AUTHENTICATED -> app: CONNECTED
WAHA: FAILED/ERROR -> app: ERROR
WAHA: STOPPED/DISCONNECTED/404 -> app: DISCONNECTED
```

Mas registrar tambem o status bruto do WAHA nos logs e, se necessario, no `lastError` tecnico ou metadado operacional.

### 6.2 QR Code orientado por evento + fallback por polling

Recomendacao:

- Usar webhook WAHA `session.status` para atualizar a sessao e buscar QR ativamente via `/api/{session}/auth/qr`. Nao configurar evento `qr` sem confirmar suporte da versao, pois a versao em producao rejeita esse evento com HTTP 400.
- Emitir Socket.IO para o tenant quando chegar novo QR ou novo status.
- Manter polling no frontend como fallback, mas com intervalo e mensagens adequadas.
- Sempre rebuscar QR quando o evento/status indicar `SCAN_QR_CODE`.
- Nunca confiar indefinidamente em QR antigo renderizado na tela.

### 6.3 Persistencia de sessao WAHA

Antes de qualquer ajuste fino de UI, validar volume persistente:

- O WAHA precisa manter dados de sessao entre restarts/deploys.
- Sem volume, todo deploy pode invalidar a sessao e causar nova leitura de QR.
- Documentar explicitamente o path montado no Railway e no Docker Compose.

### 6.4 Tratamento de erro em camadas

Padrao recomendado:

- `waha.client.ts`: capturar erro tecnico, classificar `code`, preservar detalhes seguros para log.
- `whatsapp.service.ts`: traduzir erro tecnico em `AppError` com `code` estavel e mensagem segura.
- Frontend: usar helper unico, por exemplo `getWhatsappFriendlyError(error)`, sem expor stack/JSON cru.
- Logs: manter o erro tecnico original, mascarando telefone, token, secret e body sensivel.

### 6.5 Templates

Manter templates por trigger como fonte principal para automacoes:

- `WELCOME`
- `ORDER_PLACED`
- `ORDER_ACCEPTED`
- `ORDER_PREPARING`
- `ORDER_READY`
- `ORDER_DISPATCHED`
- `ORDER_DELIVERED`
- `ORDER_COMPLETED`
- `ORDER_CANCELLED`
- `ORDER_REJECTED`

Decisao a confirmar durante auditoria:

- O PRD pede CRUD de mensagens/templates. O modelo atual suporta editar/desativar templates padrao, mas nao ha rota explicita de `POST /tenant/whatsapp/templates` para criar templates extras. Se o produto precisar de templates custom por evento livre, sera necessario adicionar criacao. Se o produto quiser apenas templates fixos por trigger, o CRUD aceitavel e listar/editar/desativar/reativar.

## 7. Escopo

### 7.1 Dentro do escopo

- Auditar ambiente WAHA em producao/local.
- Confirmar engine, versao, volume, env vars e webhook.
- Auditar fluxo completo de QR Code.
- Corrigir QR expirado/reemissao/status preso quando aplicavel.
- Garantir atualizacao da UI via Socket.IO ou polling robusto.
- Auditar e completar templates/mensagens configuraveis.
- Padronizar mensagens de erro amigaveis no frontend.
- Preservar logs tecnicos no backend.
- Criar checklist de testes e rollback.
- Atualizar documentacao operacional quando necessario.

### 7.2 Fora do escopo inicial

- Trocar provedor WAHA por outro gateway.
- Criar inbox/CRM completo de atendimento humano, salvo ajustes minimos em mensagens existentes.
- Reescrever todo o modulo de pedidos.
- Reestruturar banco inteiro de WhatsApp sem evidencia de necessidade.
- Enviar mensagens de marketing/campanhas em massa.
- Alterar dominios finais ou arquitetura Railway fora do necessario para WAHA.

## 8. Plano passo a passo

### Fase 1 - Inventario tecnico do WAHA

1. Listar configuracao atual do WAHA no Railway:
   - imagem/tag;
   - engine configurada;
   - porta;
   - variaveis;
   - volume;
   - dominio publico, se houver;
   - logs recentes.
2. Confirmar `WAHA_BASE_URL` usado pela API:
   - local;
   - production Railway;
   - staging, se existir.
3. Confirmar `WAHA_API_KEY`:
   - existe na API;
   - existe no WAHA;
   - valores batem, sem expor secret.
4. Confirmar `WAHA_WEBHOOK_SECRET`:
   - existe na API;
   - esta configurado no webhook criado pelo backend;
   - validacao HMAC/query continua funcionando.
5. Confirmar path do volume persistente:
   - Railway WAHA;
   - `docker-compose.yml`.
6. Consultar WAHA:
   - `GET /api/sessions`;
   - sessao esperada por tenant;
   - status bruto;
   - `me`;
   - erros de QR.
7. Registrar achados em checklist antes de alterar codigo.

Saida esperada:

- diagnostico de engine/versao/volume;
- lista de env vars corretas/incorretas;
- status real da sessao WAHA;
- causa provavel do QR nao conectar.

### Fase 2 - Auditoria do fluxo de sessao e QR Code no backend

1. Revisar `createOrStartSession` em `whatsapp.service.ts`.
2. Confirmar se a criacao de sessao WAHA envia webhooks corretos:
   - `session.status`;
   - QR via endpoint de autenticacao, nao via webhook `qr` salvo se a versao/engine confirmar suporte;
   - `message`;
   - `message.any`, se necessario para capturar todos os eventos.
3. Revisar `refreshSessionQr`:
   - caminho usado para buscar QR;
   - suporte a `GET /api/{session}/auth/qr`;
   - fallback com `POST`;
   - tratamento de `WORKING`/`CONNECTED`;
   - tratamento de `SCAN_QR_CODE`;
   - tratamento de QR expirado.
4. Revisar `processWebhook`:
   - deteccao de `event`/`type`;
   - leitura de `sessionName`;
   - extracao de QR em payload;
   - atualizacao de status;
   - emissao Socket.IO.
5. Confirmar que cada sessao pertence a apenas um tenant.
6. Confirmar que `updateSessionFromWahaStatus` nao sobrescreve `CONNECTED` com QR obsoleto.
7. Adicionar logs seguros para:
   - sessao criada;
   - sessao ja existente;
   - QR recebido;
   - status alterado;
   - QR expirado/ausente;
   - WAHA inacessivel;
   - status preso em `SCAN_QR_CODE`.
8. Se a engine atual for `WEBJS` e reproduzir bug de status preso:
   - documentar evidencia;
   - implementar workaround controlado, como sync/restart/re-fetch;
   - avaliar engine alternativa em staging antes de trocar producao.

Saida esperada:

- fluxo backend robusto para criar, iniciar, sincronizar, parar e reconectar sessao;
- eventos WAHA processados de forma idempotente;
- QR renovado quando evento novo chega.

### Fase 3 - Auditoria da tela de WhatsApp no frontend

1. Revisar `frontend/src/pages/admin/whatsapp/index.tsx`.
2. Confirmar se a tela assina eventos Socket.IO:
   - `whatsapp.session_updated`;
   - `whatsapp.qr_updated`;
   - `whatsapp.message_received`;
   - `whatsapp.message_deleted`.
3. Se nao assinar, adicionar assinatura no provider/hook correto.
4. Manter polling como fallback enquanto status for `PENDING_QR`, mas:
   - evitar spam;
   - mostrar estado visual de "gerando novo QR";
   - informar expiracao aproximada;
   - permitir atualizar manualmente.
5. Ajustar UI para estados:
   - sem sessao;
   - criando sessao;
   - aguardando QR;
   - QR disponivel;
   - QR expirado/recarregando;
   - conectado;
   - desconectado;
   - erro recuperavel;
   - erro operacional.
6. Remover exibicao direta de `lastError` cru.
7. Substituir por mensagem amigavel, mantendo opcao discreta para suporte copiar codigo/diagnostico se necessario.
8. Confirmar que a tela nao trava se `qrCode` vier nulo durante `PENDING_QR`.

Saida esperada:

- UI de conexao previsivel e compreensivel;
- sem erro tecnico cru;
- usuario sabe quando atualizar/reconectar.

### Fase 4 - CRUD de templates/mensagens automaticas

1. Auditar modelo `WhatsappMessageTemplate`.
2. Auditar rotas existentes:
   - `GET /tenant/whatsapp/templates`;
   - `PATCH /tenant/whatsapp/templates/:id`;
   - `DELETE /tenant/whatsapp/templates/:id`.
3. Confirmar ausencia/presenca de `POST /tenant/whatsapp/templates`.
4. Definir com produto uma destas abordagens:
   - **Templates fixos por gatilho**: CRUD funcional = listar, editar, desativar e reativar templates existentes.
   - **Templates customizados extras**: adicionar criar/remover definitivamente/ordenar templates.
5. Se manter templates fixos:
   - garantir `ensureDefaultTemplates` idempotente;
   - garantir reativacao via `enabled=true`;
   - documentar que "excluir" significa desativar.
6. Se adicionar criacao:
   - criar schema Zod;
   - criar service `createTemplate`;
   - criar rota `POST /tenant/whatsapp/templates`;
   - validar `trigger`, titulo, body, limite e `tenantId`;
   - decidir unicidade por trigger ou permitir multiplos por trigger.
7. Adicionar preview no frontend:
   - `{restaurante}`;
   - `{cardapio}`;
   - `{codigo}`;
   - `{rastreamento}`;
   - `{total}`;
   - `{cliente}`, se suportado no `WELCOME`.
8. Validar placeholders:
   - destacar variaveis desconhecidas;
   - nao quebrar renderizacao se variavel estiver vazia;
   - limitar tamanho do corpo da mensagem.
9. Confirmar que alteracao reflete no proximo envio:
   - auto reply;
   - notificacao de status do pedido;
   - mensagem de teste, se aplicavel.

Saida esperada:

- comportamento de templates definido e completo;
- preview de variaveis;
- validacao antes de salvar;
- ausencia de cache obsoleto.

### Fase 5 - Padronizacao de erros amigaveis

1. Mapear codigos existentes em `waha.client.ts`:
   - `WAHA_UNREACHABLE`;
   - `WAHA_UNAUTHORIZED`;
   - `WAHA_SESSION_NOT_FOUND`;
   - `WAHA_SESSION_NOT_READY`;
   - `WAHA_SEND_REJECTED`.
2. Expandir codigos se necessario:
   - `WAHA_QR_EXPIRED`;
   - `WAHA_QR_UNAVAILABLE`;
   - `WAHA_WEBHOOK_INVALID_SIGNATURE`;
   - `WAHA_INVALID_PHONE`;
   - `WAHA_RATE_LIMITED`;
   - `WAHA_ENGINE_STUCK_SCAN_QR`.
3. Criar helper frontend:

```txt
frontend/src/services/whatsapp-errors.ts
```

4. Mapear mensagens amigaveis:

| Codigo/erro | Mensagem amigavel |
|---|---|
| `WAHA_UNREACHABLE` | "Nao conseguimos falar com o servico do WhatsApp agora. Tente novamente em instantes." |
| `WAHA_UNAUTHORIZED` | "A chave de acesso do WhatsApp esta incorreta. Chame o suporte para revisar a configuracao." |
| `WAHA_SESSION_NOT_FOUND` | "Nao encontramos essa sessao. Gere um novo QR Code para reconectar." |
| `WAHA_SESSION_NOT_READY` | "O WhatsApp ainda nao esta conectado. Escaneie o QR Code antes de enviar mensagens." |
| `WAHA_QR_EXPIRED` | "Este QR Code expirou. Estamos gerando um novo para voce." |
| `WAHA_INVALID_PHONE` | "Esse numero nao parece valido ou nao esta disponivel no WhatsApp." |
| `WAHA_SEND_REJECTED` | "Nao foi possivel enviar a mensagem agora. Confira a conexao e tente novamente." |
| erro 5xx generico | "Estamos com instabilidade na conexao com o WhatsApp. Tente novamente em alguns minutos." |

5. Aplicar helper em:
   - iniciar/reconectar;
   - atualizar QR;
   - parar sessao;
   - salvar preferencias;
   - enviar teste;
   - salvar template;
   - excluir/desativar template.
6. Manter logs tecnicos no backend usando `logWhatsapp`.
7. Mascarar:
   - telefone;
   - chatId;
   - token;
   - secret;
   - texto completo quando sensivel.

Saida esperada:

- nenhuma tela WAHA exibe JSON/stack/status cru;
- suporte ainda consegue diagnosticar pelos logs.

### Fase 6 - Webhooks, seguranca e multi tenancy

1. Revisar `verifyWebhookSecret`.
2. Confirmar formatos suportados:
   - query secret;
   - `x-webhook-hmac`;
   - `x-waha-signature`;
   - `x-webhook-hmac-sha256`;
   - `x-hub-signature-256`;
   - `x-signature`.
3. Confirmar que o raw body esta disponivel no Express para validar HMAC.
4. Confirmar que `POST /public/webhooks/waha` nao aceita evento sem sessao valida como dado operacional.
5. Confirmar que evento de uma sessao so atualiza o tenant dono daquela sessao.
6. Confirmar idempotencia:
   - `webhookEvent.externalId`;
   - `WhatsappMessage.externalId`;
   - tratamento de duplicidade Prisma `P2002`.
7. Confirmar rate limit/limites de payload para webhook publico.
8. Confirmar que logs de webhook nao vazam payload completo sensivel.

Saida esperada:

- webhook protegido e idempotente;
- sem vazamento cross-tenant;
- eventos duplicados ignorados com seguranca.

### Fase 7 - Testes automatizados e manuais

1. Backend build:

```bash
cd backend
npm run build
```

2. Frontend build:

```bash
cd frontend
npm run build
```

3. Testes manuais locais com Docker:
   - subir Postgres;
   - subir WAHA;
   - subir API;
   - subir frontend;
   - criar sessao;
   - escanear QR;
   - validar status conectado.
4. Testes manuais Railway:
   - WAHA health;
   - API `/tenant/whatsapp/health`;
   - criar/reconectar sessao;
   - atualizar QR;
   - escanear QR;
   - confirmar webhook `session.status`;
   - confirmar Socket.IO/UI.
5. Testes de templates:
   - listar templates padrao;
   - editar template;
   - desativar;
   - reativar;
   - preview;
   - envio com template alterado.
6. Testes de erro:
   - WAHA desligado/inacessivel;
   - API key invalida;
   - sessao inexistente;
   - QR expirado;
   - numero invalido;
   - sessao desconectada ao enviar teste.
7. Testes de seguranca:
   - webhook sem secret deve falhar quando secret configurado;
   - webhook com secret invalido deve falhar;
   - usuario sem `tenant.settings.write` nao pode alterar sessao/templates;
   - usuario de outro tenant nao acessa sessao alheia.

Saida esperada:

- evidencia de fluxo feliz;
- evidencia de erros amigaveis;
- checklist de regressao concluido.

### Fase 8 - Rollout e monitoramento

1. Fazer backup antes de qualquer migration, se houver alteracao Prisma.
2. Aplicar em staging primeiro, se disponivel.
3. Validar QR real em staging/numero de teste.
4. Aplicar em producao em janela controlada.
5. Monitorar por pelo menos 60 minutos:
   - logs WAHA;
   - logs API `[whatsapp]`;
   - `POST /public/webhooks/waha`;
   - erros 401/403/409/502;
   - transicoes de status;
   - envios duplicados.
6. Ter rollback pronto:
   - reverter commit;
   - redeployar versao anterior;
   - manter volume WAHA intacto;
   - nao apagar sessoes sem backup/confirmacao.

Saida esperada:

- deploy seguro;
- monitoramento inicial concluido;
- plano de rollback conhecido.

## 9. Arquivos provaveis de alteracao

### Backend

```txt
backend/src/modules/whatsapp/waha.client.ts
backend/src/modules/whatsapp/whatsapp.service.ts
backend/src/modules/whatsapp/whatsapp.controller.ts
backend/src/modules/whatsapp/whatsapp.routes.ts
backend/src/modules/whatsapp/whatsapp.schemas.ts
backend/src/config/env.ts
backend/src/config/socket.ts
backend/prisma/schema.prisma
backend/prisma/migrations/*
```

### Frontend

```txt
frontend/src/services/whatsapp.ts
frontend/src/services/whatsapp-errors.ts
frontend/src/pages/admin/whatsapp/index.tsx
frontend/src/pages/admin/whatsapp/styles.css
frontend/src/app/providers/*
```

### Infra/docs

```txt
docker-compose.yml
backend/.env.example
docs/07-api-tempo-real.md
docs/08-seguranca-multitenancy.md
docs/09-testes-qualidade.md
docs/10-deploy-operacao.md
```

## 10. Checklist de validacao

### Sessao e QR

- [ ] WAHA engine e versao documentadas.
- [ ] Volume persistente confirmado no Railway.
- [ ] API consegue listar sessoes WAHA.
- [ ] Criar sessao gera QR valido.
- [ ] QR expirado e renovado automaticamente ou com feedback claro.
- [ ] Escanear QR altera status para `CONNECTED`.
- [ ] UI atualiza sem reload manual.
- [ ] Sessao continua conectada apos restart/redeploy WAHA.
- [ ] Sessao desconectada mostra acao clara de reconectar.

### Templates/mensagens

- [ ] Templates padrao sao criados de forma idempotente.
- [ ] Listar templates funciona.
- [ ] Editar titulo/body/enabled funciona.
- [ ] Desativar template funciona.
- [ ] Reativar template funciona.
- [ ] Preview de variaveis funciona.
- [ ] Variaveis desconhecidas sao destacadas ou tratadas.
- [ ] Envio usa o texto atualizado.

### Erros amigaveis

- [ ] WAHA inacessivel nao mostra stack/JSON bruto.
- [ ] API key invalida mostra mensagem amigavel.
- [ ] Sessao inexistente orienta gerar novo QR.
- [ ] Sessao nao conectada orienta escanear QR.
- [ ] Numero invalido mostra mensagem clara.
- [ ] Erro tecnico original aparece nos logs, nao na UI.

### Seguranca

- [ ] Webhook valida segredo quando configurado.
- [ ] Webhook invalido retorna 401.
- [ ] Eventos sem sessao nao atualizam tenant errado.
- [ ] Rotas tenant usam `authMiddleware`, `tenantMiddleware` e permissao.
- [ ] Queries Prisma possuem `tenantId` quando necessario.
- [ ] Logs mascaram telefone/secrets/texto sensivel.

### Operacao

- [ ] `WAHA_BASE_URL` correto em local/producao.
- [ ] `WAHA_API_KEY` configurado em API e WAHA.
- [ ] `WAHA_WEBHOOK_SECRET` configurado.
- [ ] `PUBLIC_BACKEND_URL` aponta para API publica correta.
- [ ] API `/tenant/whatsapp/health` retorna diagnostico util.
- [ ] Railway logs permitem diagnosticar status/QR/webhook.

## 11. Riscos e mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| WAHA sem volume persistente | Sessao cai a cada redeploy | Confirmar volume antes de testes de QR |
| Engine `WEBJS` presa em `SCAN_QR_CODE` | Usuario escaneia, mas UI nunca conecta | Reproduzir, documentar, aplicar workaround ou testar `NOWEB`/`GOWS` |
| QR expirado exibido na tela | Usuario nao consegue conectar | Rebuscar QR em evento/status e sinalizar expiracao |
| Webhook nao chega na API | Status nao atualiza em tempo real | Validar `PUBLIC_BACKEND_URL`, logs e secret |
| Erro tecnico escondido demais | Suporte perde diagnostico | UI amigavel + logs tecnicos estruturados |
| Evento duplicado do WAHA | Mensagens/auto replies duplicadas | Usar `externalId`, constraints e tratamento `P2002` |
| Falha cross-tenant | Incidente de dados | Todas queries por `tenantId`/`sessionName` unico |
| Troca de engine quebra sessao atual | WhatsApp desconecta | Testar em staging e documentar rollback |

## 12. Criterios de aceite

- [ ] Escanear QR Code conecta a sessao de forma confiavel.
- [ ] Status muda para `CONNECTED` em poucos segundos apos autenticacao.
- [ ] Frontend nao precisa de reload manual para refletir status/QR novo.
- [ ] QR expirado nao permanece silenciosamente na tela.
- [ ] Sessao sobrevive a redeploy/restart do WAHA com volume persistente.
- [ ] CRUD definido de templates esta completo conforme decisao de produto.
- [ ] Templates alterados impactam o proximo envio.
- [ ] Tela WhatsApp nao mostra erro tecnico cru.
- [ ] Logs backend mantem informacao tecnica suficiente para debug.
- [ ] Webhook WAHA valida segredo e preserva isolamento tenant.
- [ ] Builds de backend e frontend passam.
- [ ] Checklist manual de WhatsApp passa em local ou staging antes de producao.

## 13. Plano de rollback

Se a correcao causar regressao:

1. Reverter commit da aplicacao.
2. Redeployar API/frontend na versao anterior.
3. Nao remover nem recriar volume WAHA sem backup/decisao explicita.
4. Se uma sessao ficar corrompida, parar/iniciar apenas a sessao afetada.
5. Se webhook novo falhar, restaurar configuracao anterior do webhook.
6. Se troca de engine tiver sido testada e falhar, voltar engine anterior e documentar perda/necessidade de reconectar.

Criterios para rollback:

- Login/admin indisponivel.
- API com erro 5xx sustentado.
- WAHA deixa de responder para todos os tenants.
- Webhook passa a falhar 401/5xx de forma sustentada.
- Mensagens duplicadas em producao.
- Falha de isolamento entre tenants.

## 14. Perguntas em aberto

1. Qual engine WAHA esta atualmente em producao?
2. Qual versao/tag exata da imagem WAHA esta em uso?
3. O volume persistente esta montado no path correto de sessoes?
4. O produto espera criar templates extras ou apenas editar/desativar templates padrao por gatilho?
5. Existe numero WhatsApp de staging/teste para validar QR sem afetar producao?
6. Qual tolerancia operacional para reiniciar sessao WAHA em producao?
7. O dashboard WAHA deve continuar publico ou apenas acessivel internamente/suporte?
8. Quais mensagens automaticas sao obrigatorias no MVP?

## 15. Ordem recomendada de execucao

1. Confirmar engine, versao, volume e env vars WAHA.
2. Reproduzir problema do QR com logs de API + WAHA.
3. Corrigir backend para eventos/QR/status com logs seguros.
4. Corrigir frontend para Socket.IO/polling robusto e estados claros.
5. Definir escopo final de CRUD de templates.
6. Completar templates/preview/validacoes.
7. Padronizar erros amigaveis.
8. Rodar testes locais/staging.
9. Deployar em producao com monitoramento.
10. Atualizar documentacao.

## 16. Recomendacao final

Executar em duas entregas:

1. **Entrega 1 - Confiabilidade de sessao e QR**
   - Auditoria Railway/WAHA.
   - Volume e env vars validados.
   - QR/eventos/status corrigidos.
   - UI com estados claros e mensagens amigaveis basicas.

2. **Entrega 2 - Templates, erros e hardening**
   - CRUD/preview de templates fechado.
   - Mapeamento completo de erros WAHA.
   - Testes de webhook, idempotencia e multi tenant.
   - Documentacao de troubleshooting.

Essa divisao prioriza o ponto mais critico do PRD: sem sessao conectada por QR, templates e automacoes nao conseguem ser validados de ponta a ponta.
