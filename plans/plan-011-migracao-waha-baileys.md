# Plano 011 - Migracao da integracao WhatsApp WAHA para Baileys

## 1. Agente principal selecionado

Agente principal: **WhatsApp Integrations Agent**

Justificativa:

- A tarefa trata diretamente de sessoes WhatsApp, QR Code, pairing code, envio e recebimento de mensagens, deduplicacao, templates, automacoes e substituicao do gateway WAHA.
- Conforme `docs/agents/README.md`, mudancas em WhatsApp devem usar **WhatsApp Integrations Agent + Security Agent + QA Agent**.
- Como a migracao altera arquitetura, banco, deploy e fluxo de produto, o plano tambem incorpora responsabilidades de Tech Lead, Backend, Database, Frontend, Security, DevOps, QA, Release Manager e Documentation.

Agentes de apoio:

- **Tech Lead Agent**: decompor a migracao incremental, preservar contratos publicos e evitar reescrita desnecessaria.
- **Backend Agent**: implementar services, rotas, Zod, Socket.IO e regras de negocio no modulo `whatsapp`.
- **Database Agent**: modelar auth state Baileys em PostgreSQL/Prisma, migrations, indices e constraints de dedupe.
- **Security Agent**: revisar isolamento por `tenantId`, dados sensiveis de sessao, secrets, logs e permissoes.
- **Frontend Agent**: ajustar tela admin WhatsApp, services, estados de conexao, QR Code, pairing code e erros amigaveis.
- **DevOps Agent**: remover WAHA da operacao, revisar Docker/Railway/env vars, healthcheck, logs e estrategia de deploy.
- **QA Agent**: definir casos de teste para pareamento, reconexao, dedupe, envio, recebimento, rollback e regressao.
- **Release Manager Agent**: coordenar rollout por loja piloto, monitoramento e plano de rollback.
- **Documentation Agent**: atualizar docs, env examples, troubleshooting e operacao.

## 2. Referencias usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/whatsapp-integrations-agent.md`
- `docs/agents/tech-lead-agent.md`
- `docs/04-backend-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/07-api-tempo-real.md`
- `docs/08-seguranca-multitenancy.md`
- `docs/09-testes-qualidade.md`
- `docs/10-deploy-operacao.md`
- PRD anexado: "Migracao da Integracao WhatsApp: WAHA -> Baileys"

## 3. Tarefa interpretada

Criar um plano completo para migrar a integracao WhatsApp do PodePedir de WAHA para Baileys nativo (`@whiskeysockets/baileys`), removendo a camada HTTP/container WAHA e passando a gerenciar sessoes WhatsApp diretamente no backend Node.js/Express.

Como a solicitacao veio com placeholder (`[DESCREVA SUA TAREFA AQUI]`), este plano assume como escopo concreto o PRD anexado de migracao WAHA -> Baileys.

## 4. Objetivo

Ao final da execucao:

- O backend gerencia sessoes WhatsApp por tenant usando Baileys nativo.
- O auth state do WhatsApp fica persistido em PostgreSQL via Prisma, sem depender de disco efemero.
- Cada loja possui no maximo uma sessao ativa e isolada por `tenantId`.
- Pareamento funciona por QR Code e, preferencialmente, tambem por pairing code.
- Mensagens recebidas e enviadas passam por deduplicacao confiavel.
- Envios usam fila/rate limit para reduzir risco de bloqueio da conta.
- Reconexao automatica distingue logout real de queda transitoria.
- CRUD de templates/mensagens automaticas continua funcionando.
- Frontend exibe estados claros de conexao, QR, pairing code, erro e reconexao.
- WAHA pode ser desativado depois de uma fase piloto sem quebrar o fluxo WhatsApp.

## 5. Estado atual assumido

O projeto hoje usa:

```txt
backend/src/modules/whatsapp/
frontend/src/services/whatsapp.ts
frontend/src/pages/admin/whatsapp/
backend/prisma/schema.prisma
docker-compose.yml
backend/Dockerfile
backend/railway.json
```

Modelos existentes relevantes:

- `WhatsappSession`
- `WhatsappConversation`
- `WhatsappMessage`
- `WhatsappMessageTemplate`
- `WebhookEvent`

Rotas atuais relevantes:

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

Problemas que motivam a migracao:

- QR Code e sessao WAHA instaveis.
- Mensagens iniciais/automaticas duplicando ou triplicando.
- Deploy/operacao mais complexos por depender de container WAHA separado.
- Webhooks/retries do WAHA dificultam diagnostico e controle de idempotencia.

## 6. Decisoes tecnicas recomendadas

### 6.1 Migracao incremental

Nao trocar tudo em um unico corte. Implementar Baileys em paralelo ao WAHA, com um seletor por tenant/sessao:

```txt
provider: WAHA | BAILEYS
```

Isso permite:

- testar uma loja piloto;
- comparar comportamento real;
- voltar a loja para WAHA em caso de falha;
- descomissionar WAHA apenas apos estabilidade comprovada.

### 6.2 Baileys dentro do backend ou worker separado

Decisao inicial recomendada: rodar Baileys dentro do backend, mas isolado em um service proprio.

Justificativa:

- O PRD pede remover container WAHA e reduzir overhead.
- O volume inicial aparenta ser baixo/moderado.
- O backend ja possui Prisma, Socket.IO, regras de tenant, templates e conversas.

Ponto de revisao:

- Se houver muitas lojas simultaneas, mover Baileys para um worker separado no futuro, com fila entre API e worker.

### 6.3 Persistencia de auth state no Postgres

Nao usar `useMultiFileAuthState` em producao. Implementar store compativel com Baileys usando Prisma.

Modelo sugerido:

```txt
WhatsappAuthState
  id
  tenantId
  sessionId
  key
  value Json
  createdAt
  updatedAt

Unique:
  sessionId + key

Indexes:
  tenantId
  sessionId
```

Cuidados:

- `value` contem credenciais sensiveis e nunca deve ser logado.
- Operacoes de save devem ser transacionais quando gravarem varias chaves.
- Exclusao de auth state so deve ocorrer em logout real ou reset autorizado.

### 6.4 Sessao unica por tenant

Manter a regra de uma sessao WhatsApp ativa por tenant/loja nesta fase.

Se o sistema possuir filial (`Branch`) e o produto exigir WhatsApp por filial, isso deve virar decisao explicita antes da migration.

### 6.5 Dedupe como regra de primeira classe

Toda mensagem recebida deve ser deduplicada por:

```txt
sessionId + providerMessageId
```

Todo envio automatico deve ter idempotency key propria:

```txt
tenantId + trigger + conversationId + orderId/opcional + janela temporal/opcional
```

Isso evita repetir mensagem por:

- retry de conexao;
- duplo evento `messages.upsert`;
- redeploy no meio do processamento;
- clique duplo no frontend;
- retry interno de fila.

### 6.6 Fila de envio

Evitar envio direto em cadeia dentro do handler de mensagem.

Fluxo recomendado:

```txt
evento recebido -> persistir/dedupe -> decidir acao -> criar item de fila -> worker despacha -> salvar resultado
```

Comecar com fila simples em Postgres se nao houver Redis/BullMQ ja consolidado no projeto.

## 7. Escopo

### 7.1 Dentro do escopo

- Instalar e configurar `@whiskeysockets/baileys`.
- Criar client/service Baileys no backend.
- Persistir auth state via Prisma/Postgres.
- Gerenciar multiplas sessoes por tenant em memoria.
- Criar ciclo de vida de conexao/reconexao.
- Implementar QR Code e pairing code.
- Substituir envio e recebimento de mensagens do WAHA por Baileys.
- Deduplicar mensagens recebidas e envios automaticos.
- Criar fila/rate limit de envio.
- Adaptar templates e automacoes existentes.
- Atualizar frontend da tela WhatsApp.
- Atualizar env vars, Docker/Railway e docs.
- Manter rollout incremental com rollback.

### 7.2 Fora do escopo nesta fase

- Migrar historico antigo de conversas, salvo manter leitura do que ja existe.
- Criar inbox/CRM completo de atendimento humano.
- Envio em massa/campanhas.
- Multiplos numeros por tenant.
- Multiplas sessoes por filial sem decisao de produto.
- Migracao para API oficial da Meta.
- Escalar horizontalmente multiplas replicas gerenciando a mesma sessao sem lock distribuido robusto.

## 8. Arquitetura alvo

### 8.1 Componentes backend

```txt
backend/src/modules/whatsapp/
  baileys.client.ts
  baileys-auth-store.ts
  baileys-session-manager.ts
  whatsapp-provider.types.ts
  whatsapp-message-queue.service.ts
  whatsapp.service.ts
  whatsapp.controller.ts
  whatsapp.routes.ts
  whatsapp.schemas.ts
```

Responsabilidades:

- `baileys.client.ts`: cria socket Baileys com config padrao.
- `baileys-auth-store.ts`: implementa auth state persistido no Prisma.
- `baileys-session-manager.ts`: controla `Map<sessionId, WASocket>`, reconexao, QR e eventos.
- `whatsapp-provider.types.ts`: contrato comum entre WAHA legado e Baileys.
- `whatsapp-message-queue.service.ts`: fila, rate limit, idempotencia e despacho.
- `whatsapp.service.ts`: regra de negocio, templates, conversas e integracao com pedidos.

### 8.2 Fluxo de recebimento

```txt
Baileys messages.upsert
  -> normalizar mensagem
  -> resolver tenant/session
  -> dedupe por providerMessageId
  -> persistir WhatsappConversation/WhatsappMessage
  -> emitir Socket.IO se necessario
  -> avaliar automacao/template
  -> criar item na fila de envio
```

### 8.3 Fluxo de envio

```txt
acao do sistema
  -> montar template
  -> criar idempotency key
  -> inserir fila
  -> worker pega item elegivel
  -> verifica sessao conectada
  -> envia via sock.sendMessage
  -> persiste WhatsappMessage
  -> marca fila como sent/failed
```

### 8.4 Fluxo de conexao

```txt
admin inicia sessao
  -> criar/obter WhatsappSession
  -> iniciar socket Baileys
  -> connection.update gera QR ou pairing code
  -> frontend recebe estado via API/polling/Socket.IO
  -> usuario pareia
  -> connection open
  -> marcar CONNECTED
```

### 8.5 Estados internos

Manter estados internos estaveis:

```txt
DISCONNECTED
CONNECTING
PENDING_QR
PENDING_PAIRING_CODE
CONNECTED
RECONNECTING
LOGGED_OUT
ERROR
```

Mapear os eventos Baileys para estes estados, sem vazar detalhes tecnicos para a UI.

## 9. Plano passo a passo

### Fase 1 - Inventario e preparacao

1. Revisar codigo atual do modulo WhatsApp:
   - services;
   - routes;
   - schemas;
   - client WAHA;
   - webhooks;
   - templates;
   - auto reply;
   - cooldown/dedupe ja existentes.
2. Mapear todos os pontos que enviam mensagem WhatsApp:
   - mensagem inicial;
   - teste manual;
   - status de pedido;
   - automacoes futuras;
   - possiveis chamadas diretas ao WAHA.
3. Mapear todos os pontos que recebem mensagem/evento:
   - webhook WAHA;
   - criacao/atualizacao de conversa;
   - auto reply;
   - Socket.IO.
4. Levantar estrutura atual de banco:
   - `WhatsappSession`;
   - `WhatsappConversation`;
   - `WhatsappMessage`;
   - `WhatsappMessageTemplate`;
   - `WebhookEvent`.
5. Definir se a migracao sera por:
   - tenant inteiro;
   - sessao;
   - feature flag global.
6. Criar lista de lojas piloto.
7. Registrar baseline atual:
   - quantas mensagens duplicam;
   - logs de evento duplicado;
   - status de sessao;
   - tempo ate conectar QR.

Saida esperada:

- mapa de impacto;
- pontos de envio/recebimento conhecidos;
- estrategia de rollout por tenant definida.

### Fase 2 - Dependencia e contrato de provider

1. Adicionar dependencia Baileys no backend:

```bash
cd backend
npm install @whiskeysockets/baileys
```

2. Fixar versao no `package.json`.
3. Adicionar `pino` ou usar logger compativel caso ainda nao exista.
4. Criar contrato comum de provider:

```txt
startSession
stopSession
logoutSession
getSessionStatus
requestQr
requestPairingCode
sendTextMessage
sendMediaMessage/opcional
```

5. Adaptar WAHA legado para implementar o contrato, se necessario.
6. Implementar Baileys atras do mesmo contrato.
7. Garantir que `whatsapp.service.ts` dependa do contrato, nao diretamente do WAHA/Baileys.

Saida esperada:

- codigo preparado para rodar WAHA e Baileys lado a lado;
- reducao de risco no rollout.

### Fase 3 - Schema Prisma e auth state

1. Atualizar `backend/prisma/schema.prisma`.
2. Adicionar tabela de auth state Baileys.
3. Adicionar campo de provider na sessao, se ainda nao existir:

```txt
WhatsappSession.provider: WAHA | BAILEYS
```

4. Adicionar campos operacionais, se necessario:

```txt
lastConnectionAt
lastDisconnectAt
lastQrAt
lastPairingCodeAt
connectionAttempts
lockOwner/opcional
lockExpiresAt/opcional
```

5. Adicionar tabela de fila de envio, se nao houver fila existente adequada:

```txt
WhatsappMessageQueue
  id
  tenantId
  sessionId
  conversationId
  idempotencyKey
  to
  payload Json
  status
  attempts
  availableAt
  sentAt
  failedAt
  lastErrorCode
  lastErrorMessage
  createdAt
  updatedAt
```

6. Criar indices:
   - `tenantId`;
   - `sessionId`;
   - `status + availableAt`;
   - `idempotencyKey` unico.
7. Criar migration com nome claro:

```bash
cd backend
npx prisma migrate dev --name add_baileys_whatsapp_provider
```

8. Revisar SQL gerado.
9. Rodar:

```bash
npx prisma validate
npm run prisma:generate
```

Saida esperada:

- schema preparado para Baileys;
- persistencia segura de credenciais;
- estrutura de fila/dedupe.

### Fase 4 - Auth store Baileys com Prisma

1. Implementar `baileys-auth-store.ts`.
2. Criar funcoes equivalentes ao auth state esperado pelo Baileys:
   - carregar credentials;
   - salvar credentials;
   - carregar keys;
   - salvar/remover keys;
   - limpar auth state.
3. Serializar/deserializar tipos especiais do Baileys corretamente.
4. Garantir que nenhum valor sensivel seja logado.
5. Usar transacao para saves em lote.
6. Criar testes unitarios ou de service para:
   - criar auth vazio;
   - salvar creds;
   - recuperar creds;
   - salvar keys;
   - deletar keys;
   - limpar sessao.
7. Simular redeploy reiniciando processo e carregando auth do banco.

Saida esperada:

- auth state persistido e recuperavel;
- sessao sobrevive a restart do backend.

### Fase 5 - Session manager Baileys

1. Criar `baileys-session-manager.ts`.
2. Manter sockets ativos em:

```txt
Map<sessionId, ManagedBaileysSession>
```

3. Cada entrada deve conter:
   - socket;
   - tenantId;
   - sessionId;
   - status;
   - ultimo QR;
   - ultimo pairing code;
   - timer de reconexao;
   - contador de tentativas;
   - flag de parada manual.
4. Implementar `startSession`.
5. Implementar `stopSession` sem apagar auth state.
6. Implementar `logoutSession` apagando auth state apenas quando solicitado ou `loggedOut`.
7. Tratar `connection.update`:
   - `connecting`;
   - `open`;
   - `close`;
   - `qr`.
8. Em `close`, distinguir:
   - `loggedOut`: marcar `LOGGED_OUT`, limpar auth, exigir novo pareamento;
   - outros motivos: marcar `RECONNECTING` e aplicar backoff.
9. Configurar parametros explicitamente:
   - `connectTimeoutMs`;
   - `defaultQueryTimeoutMs`;
   - `keepAliveIntervalMs`;
   - `markOnlineOnConnect: false`.
10. Emitir Socket.IO para `tenant:{tenantId}` apos persistir status.
11. Garantir que sessao ja ativa nao cria segundo socket para o mesmo tenant.
12. Adicionar lock simples se houver risco de duas replicas do backend:
   - lock por sessao no banco;
   - TTL curto;
   - renovacao enquanto socket estiver ativo.

Saida esperada:

- uma sessao Baileys controlada por tenant;
- reconexao previsivel;
- estados persistidos e refletidos na UI.

### Fase 6 - QR Code e pairing code

1. Adaptar endpoints atuais para provider Baileys:
   - `POST /tenant/whatsapp/session`;
   - `POST /tenant/whatsapp/session/qr`;
   - `POST /tenant/whatsapp/session/stop`.
2. Criar endpoint para pairing code:

```txt
POST /tenant/whatsapp/session/pairing-code
```

3. Schema Zod para pairing code:

```txt
phoneNumber: string E.164 ou normalizado para Brasil
```

4. Fluxo QR:
   - iniciar sessao;
   - aguardar evento `qr`;
   - persistir QR temporario;
   - retornar QR atual ao frontend;
   - expirar QR quando ultrapassar janela segura.
5. Fluxo pairing code:
   - iniciar sessao sem QR se aplicavel;
   - chamar `sock.requestPairingCode(numero)`;
   - retornar codigo ao frontend;
   - persistir `lastPairingCodeAt`.
6. UI deve permitir:
   - escanear QR;
   - usar numero + codigo;
   - regenerar QR/codigo;
   - entender quando conectou.

Saida esperada:

- pareamento por QR e pairing code funcionando;
- onboarding mais amigavel para lojista.

### Fase 7 - Recebimento de mensagens

1. Implementar listener `messages.upsert`.
2. Ignorar mensagens sem conteudo util, se necessario:
   - status broadcast;
   - mensagens de grupo, caso fora do escopo;
   - mensagens `fromMe` quando nao forem relevantes.
3. Normalizar:
   - `chatId`;
   - telefone;
   - nome do contato;
   - tipo de mensagem;
   - texto;
   - provider message id;
   - timestamp.
4. Resolver tenant pela sessao Baileys ativa.
5. Persistir conversa por `sessionId + chatId`.
6. Persistir mensagem por `sessionId + providerMessageId`.
7. Tratar erro de unicidade como evento duplicado e sair sem acao.
8. Emitir Socket.IO para o tenant apos persistir.
9. Chamar motor de automacao apenas depois do dedupe.
10. Garantir cooldown de mensagem inicial no banco, nao apenas em memoria.

Saida esperada:

- cada mensagem recebida processada uma unica vez;
- fim da duplicacao por eventos repetidos.

### Fase 8 - Envio, fila e rate limit

1. Criar service de fila se nao existir.
2. Todo envio deve gerar `idempotencyKey`.
3. Inserir item com status `PENDING`.
4. Worker interno processa itens elegiveis:
   - busca sessao;
   - verifica `CONNECTED`;
   - aplica delay/rate limit;
   - envia via `sock.sendMessage`;
   - persiste mensagem enviada;
   - marca `SENT`.
5. Em falha:
   - incrementar attempts;
   - salvar erro seguro;
   - reagendar com backoff;
   - marcar `FAILED` apos limite.
6. Adicionar variaveis de ambiente:

```txt
WHATSAPP_PROVIDER=WAHA|BAILEYS
WHATSAPP_SEND_MIN_DELAY_MS
WHATSAPP_SEND_MAX_DELAY_MS
WHATSAPP_SEND_MAX_ATTEMPTS
WHATSAPP_AUTO_REPLY_COOLDOWN_MS
```

7. Manter floor minimo para cooldown de auto reply.
8. Bloquear envio automatico se:
   - sessao nao conectada;
   - tenant sem permissao/config ativa;
   - template desativado;
   - idempotencyKey ja enviada.

Saida esperada:

- envio controlado, auditavel e idempotente;
- reducao do risco de spam/ban.

### Fase 9 - Templates e automacoes

1. Reutilizar `WhatsappMessageTemplate`.
2. Confirmar triggers existentes:
   - welcome;
   - pedido criado;
   - pedido aceito;
   - preparo;
   - pronto;
   - saiu para entrega;
   - entregue;
   - cancelado/rejeitado.
3. Adaptar renderizacao de templates para provider-agnostic.
4. Garantir que auto reply inicial use:
   - dedupe de mensagem recebida;
   - cooldown atomico no banco;
   - fila de envio;
   - idempotency key.
5. Garantir que mudanca de status de pedido crie item de fila, nao envie direto.
6. Manter CRUD atual de templates:
   - listar;
   - editar;
   - ativar/desativar;
   - testar.
7. Se produto exigir templates extras, planejar `POST /tenant/whatsapp/templates` em fase separada.

Saida esperada:

- automacoes atuais continuam funcionando;
- mensagens configuraveis passam pelo novo provider.

### Fase 10 - Frontend admin WhatsApp

1. Atualizar `frontend/src/services/whatsapp.ts` para novos contratos.
2. Adicionar suporte a provider/status:
   - `WAHA`;
   - `BAILEYS`;
   - estados internos novos.
3. Atualizar tela admin:
   - botao iniciar/conectar;
   - QR Code;
   - pairing code;
   - parar sessao;
   - desconectar/resetar;
   - status de reconexao.
4. Adicionar mensagens amigaveis para:
   - aguardando pareamento;
   - codigo expirado;
   - sessao desconectada no celular;
   - reconectando;
   - falha temporaria;
   - necessidade de novo pareamento.
5. Evitar exibir stack/JSON tecnico.
6. Garantir que loading/error states nao travem o fluxo.
7. Validar UI mobile e desktop.

Saida esperada:

- lojista consegue parear e entender o status sem suporte tecnico.

### Fase 11 - Seguranca e multi tenancy

1. Garantir que toda rota tenant usa:

```txt
authMiddleware
tenantMiddleware
requirePermission(...)
```

2. Garantir que queries de sessao sempre filtram por `tenantId`.
3. Nunca aceitar `tenantId` vindo do body para sessao WhatsApp.
4. Tratar auth state como segredo:
   - sem logs;
   - sem retorno HTTP;
   - sem exposicao no frontend.
5. Mascarar telefone/chatId em logs quando possivel.
6. Validar permissoes para:
   - conectar;
   - parar;
   - resetar;
   - alterar templates;
   - enviar teste.
7. Revisar se `POST /public/webhooks/waha` permanece apenas para WAHA legado durante transicao.
8. Remover ou desabilitar webhook publico WAHA depois do corte final.

Saida esperada:

- nenhuma sessao ou mensagem atravessa tenants;
- credenciais WhatsApp protegidas.

### Fase 12 - DevOps e configuracao

1. Atualizar env examples:

```txt
WHATSAPP_PROVIDER
WHATSAPP_SEND_MIN_DELAY_MS
WHATSAPP_SEND_MAX_DELAY_MS
WHATSAPP_SEND_MAX_ATTEMPTS
WHATSAPP_AUTO_REPLY_COOLDOWN_MS
```

2. Manter WAHA vars durante transicao:

```txt
WAHA_BASE_URL
WAHA_API_KEY
WAHA_WEBHOOK_SECRET
```

3. Remover WAHA vars apenas apos descomissionamento.
4. Atualizar `docker-compose.yml` para modo transicao:
   - backend;
   - postgres;
   - waha opcional.
5. Revisar `backend/Dockerfile`:
   - dependencias nativas se Baileys exigir;
   - build TypeScript;
   - start.
6. Revisar Railway:
   - remover service WAHA apenas depois do rollout;
   - garantir memoria suficiente para sockets ativos;
   - configurar healthcheck;
   - configurar logs.
7. Avaliar se uma unica replica deve rodar enquanto nao houver lock distribuido completo.

Saida esperada:

- deploy previsivel;
- WAHA removivel sem quebrar producao;
- risco de duas replicas gerenciando mesma sessao controlado.

### Fase 13 - Testes

1. Validacoes backend:

```bash
cd backend
npx prisma validate
npm run build
```

2. Validacoes frontend:

```bash
cd frontend
npm run build
```

3. Testes de auth store:
   - salva creds;
   - recupera creds;
   - salva keys;
   - remove keys;
   - limpa no logout.
4. Testes de sessao:
   - iniciar;
   - gerar QR;
   - gerar pairing code;
   - conectar;
   - parar sem logout;
   - logout com limpeza;
   - reconectar apos restart.
5. Testes de recebimento:
   - mensagem simples;
   - mensagem duplicada;
   - mensagem `fromMe`;
   - grupo ignorado, se fora do escopo;
   - conversa criada no tenant correto.
6. Testes de envio:
   - mensagem teste;
   - template welcome;
   - status de pedido;
   - retry controlado;
   - falha apos limite;
   - idempotency key repetida nao envia duas vezes.
7. Testes de frontend:
   - QR aparece;
   - pairing code aparece;
   - status muda sem reload;
   - erro amigavel;
   - templates continuam editaveis.
8. Testes de seguranca:
   - usuario de outro tenant nao acessa sessao;
   - usuario sem permissao nao altera WhatsApp;
   - auth state nunca sai na API;
   - logs nao vazam credenciais.
9. Teste piloto de estabilidade:
   - uma loja conectada por 7 dias;
   - mensagens sem duplicacao;
   - redeploy sem novo QR;
   - reconexao apos queda de rede.

Saida esperada:

- evidencia de confiabilidade antes de remover WAHA.

### Fase 14 - Rollout

1. Deployar codigo com suporte dual provider.
2. Manter todos os tenants em WAHA inicialmente.
3. Migrar uma loja piloto para Baileys.
4. Validar:
   - conexao;
   - envio;
   - recebimento;
   - templates;
   - dedupe;
   - redeploy.
5. Monitorar logs por 24h.
6. Expandir para mais lojas em lotes pequenos.
7. Congelar novas sessoes WAHA apos estabilidade.
8. Desativar webhook WAHA legado.
9. Remover service/container WAHA do deploy.
10. Remover codigo legado WAHA em PR separado, depois de periodo de seguranca.

Saida esperada:

- migracao sem corte brusco;
- rollback possivel em cada lote.

### Fase 15 - Descomissionamento WAHA

1. Confirmar que nenhum tenant ativo usa provider `WAHA`.
2. Confirmar que nenhum webhook WAHA chega na API.
3. Remover variaveis WAHA de ambiente.
4. Remover service WAHA do Docker Compose/Railway.
5. Remover `waha.client.ts` e rotas legadas, se nao houver necessidade historica.
6. Atualizar docs:
   - `docs/07-api-tempo-real.md`;
   - `docs/08-seguranca-multitenancy.md`;
   - `docs/09-testes-qualidade.md`;
   - `docs/10-deploy-operacao.md`.
7. Remover referencias antigas em README/env examples.
8. Criar nota de release.

Saida esperada:

- arquitetura final sem WAHA;
- documentacao coerente com producao.

## 10. Arquivos provaveis de alteracao

### Backend

```txt
backend/package.json
backend/package-lock.json
backend/src/config/env.ts
backend/src/config/socket.ts
backend/src/modules/whatsapp/baileys.client.ts
backend/src/modules/whatsapp/baileys-auth-store.ts
backend/src/modules/whatsapp/baileys-session-manager.ts
backend/src/modules/whatsapp/whatsapp-provider.types.ts
backend/src/modules/whatsapp/whatsapp-message-queue.service.ts
backend/src/modules/whatsapp/whatsapp.service.ts
backend/src/modules/whatsapp/whatsapp.controller.ts
backend/src/modules/whatsapp/whatsapp.routes.ts
backend/src/modules/whatsapp/whatsapp.schemas.ts
backend/prisma/schema.prisma
backend/prisma/migrations/*
```

### Frontend

```txt
frontend/src/services/whatsapp.ts
frontend/src/pages/admin/whatsapp/index.tsx
frontend/src/pages/admin/whatsapp/styles.css
frontend/src/app/providers/*
frontend/src/types/*
```

### Infra e documentacao

```txt
docker-compose.yml
backend/Dockerfile
backend/railway.json
backend/.env.example
docs/07-api-tempo-real.md
docs/08-seguranca-multitenancy.md
docs/09-testes-qualidade.md
docs/10-deploy-operacao.md
```

## 11. Checklist de validacao

### Provider e sessao

- [ ] `WHATSAPP_PROVIDER` suporta `WAHA` e `BAILEYS` durante transicao.
- [ ] Sessao Baileys inicia por tenant.
- [ ] Nao ha dois sockets ativos para a mesma sessao.
- [ ] QR Code e gerado corretamente.
- [ ] Pairing code funciona com numero valido.
- [ ] Sessao conecta e muda para `CONNECTED`.
- [ ] Sessao sobrevive a redeploy/restart.
- [ ] Logout real limpa auth state e exige novo pareamento.
- [ ] Queda transitoria reconecta com backoff.

### Banco

- [ ] Migration Prisma criada e revisada.
- [ ] Auth state salvo em Postgres.
- [ ] Credenciais nao aparecem em logs/API.
- [ ] Indices por `tenantId`, `sessionId` e fila existem.
- [ ] Constraints de dedupe existem.
- [ ] `prisma validate` passa.

### Mensagens

- [ ] Mensagem recebida duplicada nao gera segundo processamento.
- [ ] Mensagem inicial respeita cooldown atomico.
- [ ] Envio automatico usa fila.
- [ ] Idempotency key impede envio duplicado.
- [ ] Falhas de envio sao registradas e reagendadas.
- [ ] Templates existentes continuam funcionando.
- [ ] Mensagem de teste funciona com Baileys.

### Frontend

- [ ] Tela mostra provider/status corretos.
- [ ] QR aparece e atualiza.
- [ ] Pairing code aparece e orienta o lojista.
- [ ] Status muda sem reload manual quando possivel.
- [ ] Erros sao amigaveis.
- [ ] Templates continuam editaveis.
- [ ] UI funciona em desktop e mobile.

### Seguranca

- [ ] Rotas protegidas usam auth, tenant e permissao.
- [ ] Usuario de um tenant nao ve sessao de outro.
- [ ] Auth state nao e retornado por endpoint.
- [ ] Logs mascaram informacoes sensiveis.
- [ ] Reset/logout de sessao exige permissao adequada.

### Operacao

- [ ] Backend build passa.
- [ ] Frontend build passa.
- [ ] Railway sobe sem WAHA obrigatorio para tenants Baileys.
- [ ] Logs identificam tenant/session sem vazar segredo.
- [ ] Uma loja piloto fica 7 dias sem duplicacao.
- [ ] Rollback para WAHA foi testado antes do rollout amplo.

## 12. Riscos e mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Baileys tem breaking changes | Sessao/envio podem quebrar apos update | Fixar versao e testar upgrades isoladamente |
| Auth state serializado incorretamente | Sessao nao sobrevive a redeploy | Testes especificos de save/load e restart |
| Duas replicas gerenciam a mesma sessao | Eventos duplicados e conflito de conexao | Rodar uma replica ou implementar lock por sessao |
| Mensagem automatica duplica novamente | Spam ao cliente | Dedupe por providerMessageId + idempotency key de envio |
| WhatsApp bloqueia numero por automacao | Perda operacional da conta | Rate limit, delays, sem campanhas, `markOnlineOnConnect: false` |
| Pairing code/QR muda em versoes Baileys | Onboarding falha | Teste piloto e fallback entre QR/pairing code |
| Logs vazam credenciais WhatsApp | Incidente de seguranca | Redacao/mascara e revisao Security Agent |
| Migracao em lote grande falha | Restaurantes ficam sem WhatsApp | Rollout por piloto/lotes e rollback por tenant |
| Remover WAHA cedo demais | Perda de fallback | Descomissionar apenas apos estabilidade comprovada |

## 13. Criterios de aceite

- [ ] Loja piloto pareia WhatsApp via QR Code ou pairing code.
- [ ] Loja piloto envia e recebe mensagens sem duplicacao por 7 dias corridos.
- [ ] Redeploy do backend nao exige novo QR.
- [ ] Queda transitoria reconecta automaticamente.
- [ ] Logout no celular marca sessao como desconectada/logged out.
- [ ] Mensagem inicial nao spamma a cada mensagem do cliente.
- [ ] Templates configuraveis continuam funcionando.
- [ ] Tela admin mostra estados claros e erros amigaveis.
- [ ] Auth state fica em Postgres e nao em disco.
- [ ] Builds de backend e frontend passam.
- [ ] WAHA pode ser removido sem afetar tenants migrados.

## 14. Plano de rollback

Rollback por tenant durante transicao:

1. Alterar provider da sessao/tenant de `BAILEYS` para `WAHA`.
2. Parar socket Baileys da sessao afetada.
3. Reativar sessao WAHA existente, se ainda estiver disponivel.
4. Confirmar envio e recebimento pelo WAHA.
5. Preservar auth state Baileys no banco para diagnostico, sem apagar automaticamente.

Rollback de deploy:

1. Reverter commit da aplicacao.
2. Redeployar versao anterior.
3. Manter banco sem rollback destrutivo.
4. Se migration adicionou apenas tabelas/campos novos, deixar dados intactos.
5. Se necessario, desabilitar worker Baileys por env var.

Criterios para rollback:

- API com 5xx sustentado.
- Sessoes Baileys caindo em massa.
- Mensagens duplicadas em producao.
- Falha de isolamento entre tenants.
- Auth state corrompido em loja piloto.
- Frontend impossibilita reconexao da loja.

## 15. Perguntas em aberto

1. O WhatsApp deve ser por tenant ou por filial (`Branch`)?
2. Existe ambiente de staging com numero WhatsApp dedicado?
3. Quantas lojas simultaneas devem ficar conectadas no MVP?
4. O backend Railway roda com uma ou multiplas replicas?
5. O produto quer pairing code como fluxo principal e QR como fallback?
6. O historico atual de conversas precisa aparecer igual apos migrar provider?
7. Qual janela minima aceitavel para testar a loja piloto antes de ampliar rollout?
8. WAHA deve ser mantido como fallback por quantos dias apos migracao?

## 16. Ordem recomendada de execucao

1. Auditar modulo WhatsApp atual e pontos de envio/recebimento.
2. Criar contrato de provider e manter WAHA legado atras dele.
3. Adicionar schema Prisma para provider, auth state e fila/dedupe.
4. Implementar auth store Baileys com Prisma.
5. Implementar session manager Baileys.
6. Implementar QR Code e pairing code.
7. Implementar recebimento com dedupe.
8. Implementar fila de envio com idempotencia e rate limit.
9. Adaptar templates e automacoes.
10. Atualizar frontend da tela WhatsApp.
11. Rodar builds e testes de seguranca/multi-tenant.
12. Migrar loja piloto.
13. Monitorar por 7 dias.
14. Migrar demais lojas em lotes.
15. Descomissionar WAHA.
16. Atualizar documentacao final.

## 17. Recomendacao final

Executar em tres entregas:

1. **Base tecnica Baileys em paralelo**
   - Provider abstraction.
   - Schema Prisma.
   - Auth store.
   - Session manager.
   - QR/pairing code em ambiente de teste.

2. **Mensageria confiavel**
   - Recebimento com dedupe.
   - Fila de envio.
   - Rate limit.
   - Templates e auto reply sem spam.
   - Frontend admin ajustado.

3. **Rollout e retirada do WAHA**
   - Loja piloto.
   - Monitoramento.
   - Migracao por lotes.
   - Remocao de webhook/container/env vars WAHA.
   - Documentacao operacional atualizada.

Essa divisao reduz o risco principal: trocar o motor de WhatsApp sem perder a capacidade de voltar atras se a loja piloto revelar instabilidade.
