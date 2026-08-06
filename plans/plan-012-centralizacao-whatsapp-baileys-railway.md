# Plano 012 - Centralizacao e Migracao WhatsApp WAHA para Baileys Nativo (Railway & UI/UX Pro)

## 1. Agente principal selecionado

Agente principal: **WhatsApp Integrations Agent**

Justificativa:
- A tarefa foca na centralizacao da conexao do bot de WhatsApp exclusivamente com a biblioteca Baileys (`@whiskeysockets/baileys`), descontinuando o QR Code/WAHA HTTP gateway.
- De acordo com `docs/agents/README.md`, alteracoes em WhatsApp exigem atuacao conjunta de **WhatsApp Integrations Agent + Security Agent + QA Agent + Frontend Agent + DevOps Agent**.

Agentes de apoio e suas atribuicoes:
- **Security Agent (Ofensivo e Defensivo)**: Realizar auditoria de vulnerabilidades ofensivas (ataques de forca bruta em pairing code, vazamento de auth state/session keys no banco, sequestro de sessao entre tenants) e implementar contramedidas defensivas (rate limit, sanitizacao, isolamento estrito por `tenantId`, mascaramento de logs e limpeza de credenciais).
- **Backend Agent**: Implementar os motores internos do Baileys (`baileys.manager.ts`, `baileys.auth-state.ts`, `whatsapp.queue.ts`), eliminando chamadas ao `waha.client.ts` e ajustando as rotas/controllers.
- **Frontend Agent (UX/UI Pro + Shadcn)**: Reformular a interface `/admin/whatsapp` removendo exibicao e polling de QR Code, criando um fluxo moderno e acessivel de Pareamento por Pairing Code (8 digitos), com Shadcn UI, timer regressivo, feedback de estado em tempo real e responsividade.
- **DevOps Agent**: Adequar scripts de build, `docker-compose.yml`, `backend/.env.example` e configuracoes do Railway (replicas: 1, remocao de containers e envs legadas do WAHA) para deploy continuo.
- **QA Agent**: Definir matriz de testes de pareamento por pairing code, reconexao apos reboot do processo no Railway, tratamento de desconexao e entrega de mensagens automáticas.

---

## 2. Referencias Usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/whatsapp-integrations-agent.md`
- `docs/agents/security-agent.md`
- `docs/agents/frontend-agent.md`
- `docs/agents/devops-agent.md`
- `docs/04-backend-guidelines.md`
- `docs/05-frontend-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/07-api-tempo-real.md`
- `docs/08-seguranca-multitenancy.md`
- `docs/10-deploy-operacao.md`

---

## 3. Objetivo e Escopo

### Objetivo:
Substituir integralmente a integracao WAHA por Baileys embutido no processo Node.js backend. Remover completamente o fluxo e exibicao de QR Code, estabelecendo o **Pairing Code de 8 digitos** como unico metodo de vinculo de numero de WhatsApp. Garantir que o repositorio fique 100% pronto para commit e deploy no Railway.

### Escopo de Mudancas:
1. **Backend Engine**:
   - `baileys.auth-state.ts`: Adaptador de persistencia do auth state em PostgreSQL (`WhatsappAuthState`).
   - `baileys.manager.ts`: Singleton em memoria para gerenciar sockets ativas Baileys, reconexao automatica e emissao de pairing code.
   - `whatsapp.queue.ts`: Worker interno de mensageria com idempotencia e retry exponencial.
   - Refatoracao de `whatsapp.service.ts`, `whatsapp.controller.ts` e `whatsapp.routes.ts`.
2. **Seguranca (Ofensiva & Defensiva)**:
   - Sanitizacao e mascaramento de logs (nenhuma credencial ou corpo sensivel exposto em stdout/Railway logs).
   - Bloqueio de forca bruta no endpoint `POST /session/pairing-code` (max 3 tentativas por hora por tenant).
   - Garantia de isolamento multi-tenant estrito nas queries do Prisma `WhatsappAuthState` e `WhatsappSession`.
3. **Frontend Admin (Shadcn + UI/UX Pro)**:
   - Reformulacao visual da tela `/admin/whatsapp`.
   - Remocao completa do componente de QR Code.
   - Criacao do formulario de solicitação de Pairing Code com mascara de telefone brasileiro.
   - Card de exibicao do codigo de 8 digitos formatado (`XXXX-XXXX`) com botao de copiar, contador regressivo (60s) e instrucoes de pareamento passo a passo.
4. **DevOps & Railway**:
   - Remocao do servico `podepedir-waha` do `docker-compose.yml`.
   - Limpeza das env vars do WAHA no `.env.example`.
   - Instrucao de configuracao no Railway (1 replica no backend para evitar conflitos de socket em memoria).

---

## 4. Analise de Seguranca (Ofensiva vs. Defensiva)

### Perspectiva Ofensiva (Vetor de Ataque):
1. **Enumeracao e Forca Bruta no Pairing Code**: Um atacante poderia tentar requisitar multiplos pairing codes para travar o numero do restaurante ou exaurir a API.
   - *Mitigacao Defensiva*: Aplicar rate limiting severo no endpoint `POST /session/pairing-code` e registrar tentativas falhas em auditoria (`AuditLog`).
2. **Vazamento de Auth State via SQL Injection / API**: O estado de autenticacao do Baileys contem chaves privadas e tokens de conexao WhatsApp.
   - *Mitigacao Defensiva*: O `WhatsappAuthState` nunca e exposto em nenhum DTO/endpoint HTTP. As queries usam obrigatoriamente Prisma Client parametrizado com filtro por `tenantId`.
3. **Intercepcao de Credenciais nos Logs do Railway**: Print de objetos de erro ou eventos de socket contendo auth creds.
   - *Mitigacao Defensiva*: Mascarar ou omitir payloads em `console.info`/`console.error` usando o padrao de log configurado.

---

## 5. Plano de Execucao Passo a Passo

### Passo 1: Backend - Adaptador AuthState (`baileys.auth-state.ts`)
- Criar a integracao entre as chaves do Baileys (`initAuthCreds`, `BufferJSON`) e o modelo Prisma `WhatsappAuthState`.
- Implementar `readKey` e `writeKey` atomicos com `upsert` e `deleteMany`.

### Passo 2: Backend - Gerenciador Baileys (`baileys.manager.ts`)
- Criar a classe/singleton `BaileysManager` que mantem um `Map<sessionId, WASocket>` em memoria.
- Implementar metodos `connect`, `disconnect`, `requestPairingCode` e `sendText`.
- Lidar com eventos `connection.update`:
  - `connection: 'open'` -> Atualizar status para `CONNECTED` no banco e emitir evento Socket.IO.
  - `connection: 'close'` -> Verificar `lastDisconnect?.error`. Se for `DisconnectReason.loggedOut`, marcar status como `LOGGED_OUT` e limpar `WhatsappAuthState`. Se for queda de rede, acionar reconexao automatica com backoff.

### Passo 3: Backend - Fila de Mensagens (`whatsapp.queue.ts`)
- Implementar o worker `WhatsappQueueWorker` para processar registros `PENDING` da tabela `WhatsappMessageQueue`.
- Garantir intervalo configuravel (`WHATSAPP_SEND_MIN_DELAY_MS` e `WHATSAPP_SEND_MAX_DELAY_MS`) para simular digitacao humana e prevenir bloqueios pelo WhatsApp.

### Passo 4: Backend - Service, Controller e Routes
- Refatorar `whatsapp.service.ts`:
  - Remover todas as referencias ao `waha.client.ts`.
  - Remover `refreshSessionQr` e webhooks do WAHA.
  - Adicionar `requestPairingCode(tenantId, phone)`.
- Atualizar `whatsapp.controller.ts` e `whatsapp.routes.ts`:
  - Remover rota `POST /session/qr`.
  - Adicionar rota `POST /session/pairing-code` com validacao de permissao `tenant.settings.write` e rate limit.
- Atualizar `server.ts`:
  - Inicializar o `BaileysManager` e restaurar sessoes com status `CONNECTED` ou `CONNECTING` na inicializacao da API.
  - Adicionar hook de shutdown gracioso (`SIGTERM`/`SIGINT`) para fechar sockets Baileys ativas.

### Passo 5: Frontend - UI/UX Pro e Componentes Shadcn (`/admin/whatsapp`)
- Atualizar `frontend/src/services/whatsapp.ts`:
  - Remover metodo `refreshQr`.
  - Adicionar metodo `requestPairingCode(phone: string)`.
- Redesenhar a interface do WhatsApp Admin:
  - **Badge de Status**: Exibir pill de status com cores (Verde para Conectado, Amarelo para Conectando, Cinza para Desconectado, Vermelho para Erro).
  - **Formulario de Pairing Code**: Input com mascara de telefone (`(XX) XXXXX-XXXX`), validacao Zod/HTML5 e botao "Gerar Codigo de Conexao".
  - **Display de Codigo de 8 Digitos**: Card com tipografia monoespacada grande, acao de clique para copiar, indicador de progresso e tutorial passo a passo ("1. Abra o WhatsApp no celular > 2. Dispositivos Conectados > 3. Conectar com numero de telefone > 4. Digite o codigo acima").

### Passo 6: DevOps e Ajustes para Deploy no Railway
- Atualizar `docker-compose.yml`: Remover servico `podepedir-waha` e volume `waha_sessions`.
- Atualizar `backend/.env.example`: Garantir que `WHATSAPP_PROVIDER=BAILEYS` e remover envs `WAHA_*`.
- Garantir compilacao limpa do TypeScript (`npm run build` no backend e frontend).

---

## 6. Arquivos a serem Criados/Modificados

- `[NEW]` `backend/src/modules/whatsapp/baileys.auth-state.ts`
- `[NEW]` `backend/src/modules/whatsapp/baileys.manager.ts`
- `[NEW]` `backend/src/modules/whatsapp/whatsapp.queue.ts`
- `[MODIFY]` `backend/src/modules/whatsapp/whatsapp.service.ts`
- `[MODIFY]` `backend/src/modules/whatsapp/whatsapp.controller.ts`
- `[MODIFY]` `backend/src/modules/whatsapp/whatsapp.routes.ts`
- `[MODIFY]` `backend/src/modules/whatsapp/whatsapp.schemas.ts`
- `[MODIFY]` `backend/src/server.ts`
- `[MODIFY]` `docker-compose.yml`
- `[MODIFY]` `backend/.env.example`
- `[MODIFY]` `frontend/src/services/whatsapp.ts`
- `[MODIFY]` `frontend/src/pages/admin/whatsapp/index.tsx`
- `[MODIFY]` `frontend/src/types/database.ts`

---

## 7. Criterios de Aceite e Testes

1. **Compilacao**: `npm run build` roda com sucesso sem erros TypeScript no backend e frontend.
2. **Geracao de Pairing Code**: Ao requisitar um codigo de conexao via painel admin informando um numero de celular, a API retorna o codigo de 8 digitos formatado.
3. **Pareamento e Persistencia**: Apos inserir o codigo no WhatsApp do celular, o status muda automaticamente para `CONNECTED` e os tokens de sessao sao salvos em `WhatsappAuthState` no PostgreSQL.
4. **Reconexao no Railway**: Reiniciar o processo do backend nao exige novo pareamento; a sessao Baileys reconecta automaticamente utilizando as credenciais salvas no banco de dados.
5. **Envio de Mensagem Teste**: Envio de mensagem teste no painel entrega com sucesso no WhatsApp destino.
