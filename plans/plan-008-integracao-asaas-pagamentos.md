# Plano 008 - Integracao Asaas para checkout e pagamentos

## 1. Agente principal selecionado

Agente principal: **Tech Lead Agent**

Justificativa:

- A tarefa cruza checkout publico, contratos HTTP, persistencia financeira, webhook, idempotencia e multi tenancy.
- Conforme `docs/agents/README.md`, mudancas em fluxo de pedido exigem coordenacao entre backend, frontend, QA e seguranca.
- O projeto ja possui base de dominio para pagamentos em `PaymentMethod`, `Payment`, `PaymentAttempt` e `WebhookEvent`, entao a melhor abordagem e incremental e arquitetural.
- A fonte de verdade de cobranca e conciliacao precisa ficar no backend; o frontend deve apenas refletir estado confirmado pelo servidor.

Agentes de apoio:

- **Backend Agent**: modulo Asaas, services, rotas, webhooks, Zod, transacoes e persistencia em `Order`, `Payment` e `PaymentAttempt`.
- **Frontend Agent**: adaptacao do checkout publico, novos estados de pagamento, polling e recuperacao de pedido pendente.
- **Database Agent**: revisar schema Prisma, indices, migrations, compatibilidade do enum `PaymentStatus` e modelagem de configuracao da integracao.
- **Security Agent**: secrets, webhook token, rate limit, logs redigidos, isolamento tenant e decisao entre checkout hospedado e captura direta de cartao.
- **QA Agent**: matriz de cenarios de sucesso, falha, expiracao, duplicidade, replay e regressao do checkout.
- **Product Manager Agent**: fechar MVP, criterio de entrada do pedido na operacao e regras de retentativa.
- **DevOps Agent**: variaveis de ambiente, whitelist de IPs, HTTPS, observabilidade e reconciliacao operacional.

## 2. Referencias usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/tech-lead-agent.md`
- `docs/agents/backend-agent.md`
- `docs/agents/frontend-agent.md`
- `docs/agents/database-agent.md`
- `docs/agents/security-agent.md`
- `docs/agents/qa-agent.md`
- `docs/08-seguranca-multitenancy.md`
- `docs/09-testes-qualidade.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/orders/orders.service.ts`
- `backend/src/modules/orders/orders.schemas.ts`
- `frontend/src/pages/customer/cart/index.tsx`
- `frontend/src/app/providers/customer-flow-provider.tsx`
- Context7 + documentacao oficial Asaas consultadas em **16 de julho de 2026**:
  - [Chaves de API](https://docs.asaas.com/docs/chaves-de-api.md)
  - [Cadastro de clientes](https://docs.asaas.com/docs/criando-um-cliente.md)
  - [Cobrancas via Pix](https://docs.asaas.com/docs/cobrancas-via-pix.md)
  - [Cobrancas via cartao de credito](https://docs.asaas.com/docs/cobrancas-via-cartao-de-credito.md)
  - [Asaas Checkout](https://docs.asaas.com/docs/checkout-asaas.md)
  - [Receba eventos do Asaas no seu endpoint de Webhook](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook.md)
  - [Como implementar idempotencia em Webhooks](https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks.md)
  - [Whitelist de IPs](https://docs.asaas.com/docs/whitelist-de-ips.md)
  - [PCI-DSS](https://docs.asaas.com/docs/pci-dss-1.md)
  - OWASP via Context7: `Third_Party_Payment_Gateway_Integration_Cheat_Sheet`, `REST_Security_Cheat_Sheet`, `Multi_Tenant_Security_Cheat_Sheet`, `Business_Logic_Security_Cheat_Sheet`

## 3. Tarefa interpretada

Planejar a integracao do Asaas para que a aplicacao deixe de tratar pagamento apenas como texto em `notes` e passe a operar um fluxo real de cobranca, confirmacao e conciliacao.

O plano precisa cobrir:

- criacao ou reconciliacao de cliente no Asaas;
- criacao de cobranca por pedido;
- exibicao segura do passo de pagamento no checkout;
- persistencia local de tentativas, status e eventos;
- recebimento de webhooks com idempotencia;
- segregacao por tenant;
- boas praticas de seguranca no frontend e no backend;
- rollout incremental com baixo risco operacional.

## 4. Objetivo

Transformar o checkout publico em um fluxo de pagamento confiavel, auditavel e compativel com multi tenancy, garantindo que:

- o pedido continue sendo a entidade principal do dominio;
- o pagamento tenha rastreabilidade propria em banco;
- o frontend nao confirme pagamento por conta propria;
- o backend seja a unica fonte de verdade para `paymentStatus`;
- a integracao entre pedido, cobranca e webhook seja resiliente a falhas, duplicidades e eventos fora de ordem.

## 5. Estado atual observado

### 5.1 Backend

1. O schema Prisma ja possui:
   - `PaymentMethod`
   - `Payment`
   - `PaymentAttempt`
   - `Refund`
   - `WebhookEvent`
2. `Order` ja possui `paymentStatus`, hoje com enum:

```txt
PENDING
AUTHORIZED
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
CANCELLED
```

3. `createPublicOrder` em `backend/src/modules/orders/orders.service.ts` cria o pedido com `paymentStatus: "PENDING"`, mas nao cria `Payment`.
4. O backend hoje nao recebe um bloco estruturado de pagamento no contrato publico de criacao de pedido.
5. `WebhookEvent` ja existe e pode ser reaproveitado para persistir eventos Asaas:

```txt
tenantId?
provider
eventType
externalId?
payload
processedAt?
status
error?
```

### 5.2 Frontend

1. O checkout atual permite escolher `PIX`, `CREDIT_CARD` ou `CASH`.
2. O formulario ainda coleta dados de cartao localmente na tela de checkout.
3. Ao finalizar, o frontend chama `placeOrder()` e navega para confirmacao de pedido, sem depender de cobranca real.
4. A tela final descreve o pagamento a partir da escolha local do cliente, nao a partir de um status confirmado do backend.

### 5.3 Implicacao pratica

Hoje o sistema registra pedido e tipo de pagamento, mas nao opera um meio online real. O maior gap nao e apenas schema; e contrato, orquestracao do fluxo e definicao de fonte de verdade.

## 6. Diretriz de arquitetura recomendada

### 6.1 Estrategia principal

Adotar uma abordagem incremental:

1. Criar pedido local.
2. Criar pagamento local vinculado ao pedido.
3. Criar cliente e cobranca no Asaas.
4. Devolver ao frontend apenas os dados necessarios para UX.
5. Confirmar o pagamento por webhook e reconciliacao.

### 6.2 Decisao de seguranca recomendada

Padrao preferencial: **Asaas Checkout hospedado** ou fluxo em que o cliente informa os dados do cartao diretamente na interface do Asaas.

Motivos:

- reduz a exposicao de PAN e CVV;
- reduz o escopo de PCI-DSS no frontend e no backend;
- evita vazamento de dado de cartao em logs, traces e ferramentas de observabilidade;
- simplifica rollout inicial.

Captura direta de cartao pelo frontend da aplicacao deve ser tratada como excecao, com trilha especifica de compliance e risco.

### 6.3 MVP recomendado

Entrega 1:

- suportar **PIX via Asaas**;
- criar `Payment` e `PaymentAttempt`;
- mostrar QR Code Pix ou dados normalizados de cobranca;
- confirmar por webhook;
- manter meios offline funcionando.

Entrega 2:

- adicionar cartao online, preferencialmente via checkout hospedado;
- refinar experiencia de retentativa, expiracao e painel operacional;
- considerar recorrencia, split ou estorno apenas depois da base estabilizada.

## 7. Escopo funcional proposto

### 7.1 Fluxo PIX online

1. Cliente monta o carrinho normalmente.
2. Cliente escolhe `PIX`.
3. Backend cria o pedido.
4. Backend cria `Payment` local com `provider = "ASAAS"` e `status = PENDING`.
5. Backend cria cobranca no Asaas e consulta dados de Pix.
6. Frontend exibe:
   - valor;
   - QR Code;
   - copia e cola;
   - expiracao;
   - estado `Aguardando pagamento`.
7. Webhook confirma pagamento e sincroniza `Payment.status` e `Order.paymentStatus`.
8. Frontend atualiza a tela por polling e, se viavel, por socket.

### 7.2 Fluxo cartao online

1. Preferir checkout hospedado ou `invoiceUrl` do Asaas.
2. Frontend recebe apenas URL/ID do checkout.
3. Frontend redireciona ou abre fluxo seguro hospedado.
4. O backend nao deve confiar em `successUrl` como confirmacao final.
5. Confirmacao oficial vem de webhook e reconciliacao.

### 7.3 Fluxos offline

- `CASH` e demais meios locais continuam funcionando.
- O plano deve prever melhoria futura para persistir `Payment` tambem em fluxos offline, mas isso nao bloqueia o MVP online.

## 8. Fora de escopo inicial

- split de pagamento;
- assinaturas e recorrencia;
- estorno operacional completo no admin;
- one-click payment e tokenizacao propria para reuso;
- migrar todos os pagamentos offline para o gateway no mesmo ciclo;
- conciliacao contabil completa da plataforma;
- captura direta de cartao sem exigencia comercial formal.

## 9. Decisoes tecnicas propostas

### 9.1 Contrato publico do checkout

Evoluir `POST /public/:tenantSlug/orders` para aceitar um bloco `payment` estruturado.

Exemplo sugerido:

```json
{
  "payment": {
    "type": "PIX",
    "mode": "ONLINE",
    "methodId": "optional-local-method-id"
  }
}
```

Regras:

- manter compatibilidade temporaria com payloads antigos;
- parar de depender de `notes` como fonte de verdade de pagamento;
- responder com resumo normalizado do pagamento, sem expor payload cru do Asaas.

Exemplo de resposta:

```json
{
  "payment": {
    "status": "PENDING",
    "provider": "ASAAS",
    "providerPaymentId": "pay_x",
    "pixCopyPaste": "000201...",
    "pixQrCode": "base64-or-url",
    "expiresAt": "2026-07-16T18:00:00.000Z"
  }
}
```

### 9.2 Fonte de verdade de estado

- `paymentStatus` deve sempre vir do backend.
- O frontend nunca envia `paymentStatus`, `paid=true` ou equivalente.
- O redirect do checkout hospedado pode melhorar a UX, mas nao substitui webhook.

### 9.3 Modelagem incremental

Revisar schema para avaliar necessidade de adicionar:

- em `Payment`:
  - `providerStatus`
  - `expiresAt`
  - `lastWebhookAt`
  - `idempotencyKey`
- em `PaymentAttempt`:
  - `operation` ou campo equivalente para distinguir criacao de cobranca, consulta, retentativa e reparo orientado por webhook

Observacao:

- O enum atual de `PaymentStatus` talvez seja suficiente para o MVP.
- Se o time quiser estados como `PROCESSING`, `OVERDUE` ou `REQUIRES_ACTION`, isso exigira migracao explicita e revisao de todo o frontend e admin.

### 9.4 Persistencia de cliente Asaas

- Criar ou localizar o cliente Asaas antes da cobranca.
- Salvar o `customerId` do Asaas inicialmente em `Payment.metadata` ou campo dedicado, conforme a frequencia de uso.
- Priorizar `externalReference` em cliente e cobranca para conciliacao futura.

### 9.5 Idempotencia

Na criacao de cobranca:

- gerar uma chave local por `orderId + acao`;
- persistir a tentativa antes de reprocessar;
- evitar criar nova cobranca em retry cego apos timeout.

No webhook:

- salvar `WebhookEvent` com `provider = "ASAAS"` e `externalId = id do evento`;
- responder `200` para eventos duplicados ja conhecidos;
- processar de forma monotona, sem voltar status para tras sem reconciliacao.

### 9.6 Webhook Asaas

Com base na documentacao consultada em 16 de julho de 2026:

- o webhook deve usar `authToken` configurado no Asaas;
- o backend deve validar o header `asaas-access-token`;
- nao foi confirmada assinatura HMAC do body nas referencias consultadas, entao o plano deve assumir segredo compartilhado por header, salvo validacao posterior.

### 9.7 Segregacao de credenciais por tenant

Decisao a fechar na Fase 1:

1. **Uma conta Asaas por plataforma**
   - mais simples operacionalmente;
   - menor flexibilidade por tenant.
2. **Conta ou subconta por tenant**
   - melhor isolamento financeiro;
   - maior complexidade de configuracao e operacao.

Recomendacao:

- documentar o modelo explicitamente;
- nunca resolver token por input do cliente;
- sempre obter credencial efetiva no backend a partir do tenant do pedido.

### 9.8 Armazenamento de secrets

Padrao desejado:

- cofre de segredos por ambiente;
- chave apenas no backend;
- rotacao prevista;
- whitelist de IPs no Asaas quando possivel.

Fallback temporario aceitavel para MVP, se nao houver secret store maduro:

- entidade dedicada de integracao do tenant com criptografia em repouso;
- evitar usar `PaymentMethod.config` como deposito ad hoc de segredo por muito tempo.

## 10. Arquivos provaveis

Backend:

```txt
backend/src/modules/orders/orders.routes.ts
backend/src/modules/orders/orders.controller.ts
backend/src/modules/orders/orders.service.ts
backend/src/modules/orders/orders.schemas.ts
backend/src/modules/payments/
backend/src/modules/asaas/
backend/src/shared/middlewares/rate-limit.middleware.ts
backend/src/config/env.ts
backend/prisma/schema.prisma
backend/prisma/migrations/
```

Frontend:

```txt
frontend/src/pages/customer/cart/index.tsx
frontend/src/app/providers/customer-flow-provider.tsx
frontend/src/services/orders.ts
frontend/src/types/database.ts
frontend/src/services/socket.ts
frontend/src/pages/customer/order-tracking/index.tsx
```

Operacao e docs:

```txt
docs/08-seguranca-multitenancy.md
docs/09-testes-qualidade.md
docs/10-deploy-operacao.md
```

## 11. Plano passo a passo

### Fase 1 - Auditoria e decisoes de produto

1. Confirmar se o MVP sera apenas Pix ou Pix + cartao.
2. Confirmar se a loja recebe pedido antes ou depois do pagamento confirmado.
3. Confirmar se cartao seguira checkout hospedado ou captura direta.
4. Confirmar modelo de credencial:
   - plataforma unica;
   - por tenant;
   - por subconta.
5. Confirmar como o admin vai habilitar ou desabilitar o meio online por tenant ou filial.

Saida esperada:

- decisao de escopo do MVP;
- decisao de arquitetura de seguranca;
- contrato publico inicial aprovado.

### Fase 2 - Contrato e modelagem

1. Evoluir schema Zod do pedido publico para receber `payment`.
2. Revisar `frontend/src/types/database.ts` e `orders.ts`.
3. Definir DTO normalizado de resposta de pagamento.
4. Decidir se `PaymentStatus` atual basta para o MVP ou se precisa migracao.
5. Definir se novos campos entram em `Payment`, `PaymentAttempt` e `WebhookEvent`.

Saida esperada:

- contrato publico versionado de forma incremental;
- lista de ajustes de schema e migration.

### Fase 3 - Infra backend Asaas

1. Criar client HTTP do Asaas com timeout, mapper de erro e headers padronizados.
2. Criar service para resolver credencial por tenant.
3. Criar service de cliente Asaas:
   - buscar ou reconciliar;
   - criar quando necessario.
4. Criar service de cobranca:
   - Pix;
   - checkout hospedado ou cartao, se entrar no MVP.

Saida esperada:

- camada isolada de integracao;
- baixo acoplamento do modulo de pedidos ao provider.

### Fase 4 - Persistencia e fluxo do pedido

1. Criar `Payment` local ao iniciar pagamento online.
2. Criar `PaymentAttempt` para cada chamada relevante ao Asaas.
3. Salvar `providerPaymentId`, `provider`, `metadata` minima e `externalReference`.
4. Decidir estrategia de rollback logico:
   - pedido mantido e pagamento marcado como falho;
   - ou cancelamento automatico do pedido antes da resposta, se a cobranca falhar cedo.
5. Garantir que meios offline continuem sem regressao.

Saida esperada:

- pedido e pagamento ligados de forma rastreavel;
- tentativa, falha e sucesso auditaveis.

### Fase 5 - Checkout e UX publica

1. Ajustar `CustomerFlowProvider` para enviar `payment` estruturado.
2. Parar de confirmar o pedido localmente como se o pagamento ja estivesse concluido.
3. Criar estado intermedio de pagamento:
   - Pix pendente;
   - cartao processando;
   - expirado;
   - falho;
   - pago.
4. Para Pix:
   - exibir QR Code;
   - exibir copia e cola;
   - exibir expiracao;
   - permitir `Ja paguei, verificar agora`.
5. Persistir apenas identificadores seguros no cliente, como `publicCode` e `tenantSlug`.
6. Recuperar pedido pendente apos refresh.

Saida esperada:

- frontend guiado por estado do servidor;
- UX clara para pagamento assincrono.

### Fase 6 - Webhook e idempotencia

1. Criar rota publica de webhook Asaas.
2. Validar `asaas-access-token`.
3. Persistir `WebhookEvent` antes do processamento.
4. Processar evento de forma assincrona e idempotente.
5. Atualizar `Payment.status`, `paidAt`, `failedAt` e `Order.paymentStatus`.
6. Publicar atualizacao para frontend via endpoint publico e, se viavel, socket.

Saida esperada:

- confirmacao confiavel de pagamento;
- tolerancia a replay e evento fora de ordem.

### Fase 7 - Reconciliacao e operacao

1. Criar job de reconciliacao para pagamentos recentes ou pendentes.
2. Detectar divergencia entre estado local e estado do Asaas.
3. Registrar alertas para:
   - webhook invalido;
   - fila travada;
   - eventos nao processados;
   - pagamentos pendentes alem do esperado.
4. Preparar runbook de:
   - rotacao de chave;
   - replay controlado;
   - reprocessamento;
   - incidente de segredo.

Saida esperada:

- operacao menos dependente de sucesso perfeito do webhook;
- capacidade de reparar divergencias.

### Fase 8 - QA e rollout

1. Cobrir testes unitarios, integrados e E2E.
2. Validar mobile e desktop.
3. Validar regressao de checkout de entrega e retirada.
4. Liberar por tenant piloto ou feature flag.
5. Observar metricas e ajustar UX antes do rollout amplo.

Saida esperada:

- rollout controlado;
- risco reduzido em producao.

## 12. Seguranca aplicada ao plano

### 12.1 Frontend

- Nunca expor `ASAAS_API_KEY` no frontend.
- Nao persistir PAN, CVV, token de cartao ou segredo de webhook no browser.
- Nao confiar em valor, tenant, desconto, split ou status vindo do cliente.
- Se houver analytics ou session replay, mascarar integralmente campos de pagamento e PII.
- Exigir HTTPS e CSP restritiva.

### 12.2 Backend

- Backend e o unico responsavel por chamar o Asaas.
- Toda operacao financeira deve validar tenant, ownership do pedido e payload.
- Aplicar rate limit nas rotas publicas de criacao de pedido com pagamento online.
- Redigir logs para nao expor CPF ou CNPJ completo, telefone, email, API key, token ou dados de cartao.
- Nao depender de callback do frontend para mudar estado financeiro.

### 12.3 Webhook

- Validar `asaas-access-token` em comparacao segura.
- Persistir evento antes do `200`.
- Aceitar campos extras no payload sem quebrar.
- Tratar webhook como input nao confiavel.
- Ignorar duplicidade por `externalId` ja processado.

### 12.4 Multi tenancy

- Toda consulta e escrita financeira deve carregar `tenantId`.
- O webhook deve mapear evento ao tenant correto antes de mutar `Order` ou `Payment`.
- Nunca reutilizar chave do tenant A para operacao do tenant B.
- Cobrir cenarios cross-tenant em teste automatizado.

## 13. Riscos principais

1. Pedido criado com sucesso e cobranca falhando no meio do fluxo.
2. Escolha de captura direta de cartao ampliar demais o escopo PCI.
3. Webhook sem validacao de token permitir falsificacao.
4. Duplicidade de cobranca por retry cego.
5. Evento fora de ordem alterar status incorretamente.
6. Chave de producao usada em ambiente errado.
7. Vazamento de segredo ou payload sensivel em logs.
8. Divergencia entre checkout ou redirecionamento e estado real de pagamento.
9. Vazamento cross-tenant em conciliacao ou webhook.
10. Tela final continuar dizendo que o pedido esta confirmado sem pagamento real.

Mitigacoes:

- checkout hospedado como padrao;
- webhook + reconciliacao como fonte oficial;
- idempotencia em criacao e processamento;
- feature flag ou rollout por tenant piloto;
- DTO normalizado do backend para o frontend;
- testes de isolamento multi-tenant;
- observabilidade com redaction;
- runbook operacional.

## 14. Perguntas em aberto para fechar antes da implementacao

1. O pedido entra na cozinha antes ou depois do pagamento confirmado?
2. Pix expirado gera nova cobranca no mesmo pedido ou exige nova tentativa completa?
3. Cartao recusado permite retentativa no mesmo pedido?
4. O tenant vai usar conta unica da plataforma, conta propria ou subconta?
5. O admin vai configurar credencial por tenant dentro do sistema ou fora dele?
6. Havera polling apenas no frontend ou socket para pedido publico tambem?
7. O enum atual de `PaymentStatus` basta para o MVP?

## 15. Criterios de aceite

### 15.1 Backend

- [ ] `POST /public/:tenantSlug/orders` aceita `payment` estruturado.
- [ ] Pagamentos online criam `Payment` local vinculado ao pedido.
- [ ] `PaymentAttempt` registra request, response e falha relevante.
- [ ] `providerPaymentId` e `externalReference` ficam persistidos.
- [ ] O backend valida tenant e ownership em toda operacao financeira.
- [ ] Webhook Asaas valida `asaas-access-token`.
- [ ] `WebhookEvent` persiste o evento bruto antes do processamento.
- [ ] O processamento de webhook e idempotente.
- [ ] Existe protecao contra criacao duplicada de cobranca em retry.
- [ ] `Order.paymentStatus` e atualizado apenas pelo backend.

### 15.2 Frontend

- [ ] O frontend nao trata redirect ou submit como confirmacao final de pagamento.
- [ ] O estado exibido na tela de pagamento vem do backend.
- [ ] Pedido pendente pode ser recuperado apos refresh.
- [ ] Pix mostra QR Code, copia e cola e expiracao.
- [ ] Mensagens de erro sao claras e nao exibem JSON bruto.
- [ ] Checkout atual de entrega e retirada continua funcionando.

### 15.3 Seguranca e operacao

- [ ] Nenhuma chave Asaas aparece no frontend, logs ou codigo publico.
- [ ] Producao usa HTTPS e, quando possivel, whitelist de IPs no Asaas.
- [ ] Logs sensiveis estao redigidos.
- [ ] Existe reconciliacao periodica de pagamentos.
- [ ] Existe runbook de rotacao de chave e reprocessamento de eventos.
- [ ] Existe teste de isolamento cross-tenant para fluxo de pagamento.

### 15.4 QA

- [ ] Pix pendente -> pago atualiza corretamente por webhook.
- [ ] Pix expirado e tratado sem perder rastreabilidade.
- [ ] Cartao hospedado atualiza status sem depender do frontend.
- [ ] Duplo clique nao gera duplicidade sem tratamento.
- [ ] Webhook duplicado nao reprocessa o pedido.
- [ ] Webhook com token invalido e rejeitado.
- [ ] Regressao de carrinho, endereco, cupom e entrega foi validada.

## 16. Recomendacao final

Executar em duas entregas:

1. **Entrega 1 - PIX online**
   - pedido + `Payment` + `PaymentAttempt`
   - cobranca Pix
   - QR Code no checkout
   - webhook idempotente
   - reconciliacao basica

2. **Entrega 2 - Cartao online**
   - preferencialmente checkout hospedado
   - estados refinados no frontend
   - retentativa, expiracao e operacao administrativa

Essa divisao reduz risco, preserva o checkout atual e coloca o projeto em uma base segura para evoluir billing e pagamentos sem improviso.
