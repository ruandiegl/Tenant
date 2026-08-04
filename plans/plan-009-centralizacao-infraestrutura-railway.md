# Plano 009 - Centralizacao da infraestrutura no Railway

## 1. Agente principal selecionado

Agente principal: **DevOps Agent**

Justificativa:

- A tarefa e uma mudanca de infraestrutura: deploy, Railway, variaveis de ambiente, rede privada, healthcheck, logs, DNS e operacao.
- Conforme `docs/agents/README.md`, mudancas de infraestrutura devem envolver **DevOps Agent + Release Manager Agent**.
- O objetivo principal nao e reescrever produto, pedido, cardapio ou WhatsApp; e reorganizar onde frontend, API, WAHA e Postgres rodam.
- A mudanca afeta disponibilidade, secrets, webhooks e rollback, entao precisa ser planejada como operacao de deploy, nao como feature comum.

Agentes de apoio:

- **Release Manager Agent**: preparar cutover, checklist de release, janela de mudanca, rollback e comunicacao.
- **Security Agent**: revisar secrets, CORS, exposicao publica, webhooks, WAHA privado e Postgres privado.
- **Tech Lead Agent**: validar arquitetura final, impacto no monorepo e ajustes minimos de build/runtime.
- **Backend Agent**: revisar env vars da API, healthcheck, Prisma deploy, WAHA base URL e webhooks.
- **Frontend Agent**: revisar `VITE_API_BASE_URL`, build Vite, dominio publico e CORS.
- **QA Agent**: validar smoke tests e regressao dos fluxos criticos.
- **WhatsApp Integrations Agent**: validar WAHA, sessoes, webhook e envio/recebimento de mensagens.
- **Documentation Agent**: atualizar docs de deploy, ambiente e operacao apos a migracao.

## 2. Referencias usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/devops-agent.md`
- `docs/agents/release-manager-agent.md`
- `docs/agents/tech-lead-agent.md`
- `docs/agents/security-agent.md`
- `docs/02-arquitetura.md`
- `docs/03-ambiente-desenvolvimento.md`
- `docs/07-api-tempo-real.md`
- `docs/08-seguranca-multitenancy.md`
- `docs/09-testes-qualidade.md`
- `docs/10-deploy-operacao.md`
- PRD anexado: "Centralizacao da Infraestrutura no Railway"
- Arquivos atuais relevantes:
  - `docker-compose.yml`
  - `Dockerfile.railway`
  - `railway.json`
  - `railway-start.sh`
  - `backend/Dockerfile`
  - `backend/src/config/env.ts`
  - `backend/src/config/cors.ts`
  - `backend/src/config/socket.ts`
  - `backend/src/modules/whatsapp/whatsapp.service.ts`
  - `frontend/src/services/api.ts`
  - `frontend/package.json`
  - `backend/package.json`

## 3. Tarefa interpretada

Planejar a centralizacao da infraestrutura do PodePedir no Railway, migrando frontend e API para o mesmo projeto Railway onde ja ficam WAHA e Postgres.

Como a solicitacao veio com placeholder (`[DESCREVA SUA TAREFA AQUI]`), este plano assume que a tarefa concreta e a descrita no PRD anexado:

- Frontend sai da Vercel e passa a rodar no Railway.
- API sai do modelo Vercel/serverless e passa a rodar como servico long-running no Railway.
- WAHA permanece no Railway.
- Postgres permanece no Railway.
- API, WAHA e Postgres passam a se comunicar por rede privada Railway.
- Apenas frontend e API ficam publicos.
- WAHA e Postgres ficam privados.

## 4. Objetivo

Unificar a stack operacional em um unico projeto Railway, reduzindo latencia, egress, duplicidade de variaveis e superficie publica de ataque.

Ao final:

- O frontend publico responde pelo dominio de producao.
- A API publica responde pelo dominio de API.
- A API acessa Postgres pela variavel privada do Railway.
- A API acessa WAHA por `http://<servico>.railway.internal:<porta>` ou variavel de referencia equivalente.
- WAHA nao precisa de dominio publico para comunicacao interna.
- Postgres nao deve ser acessivel publicamente para a aplicacao.
- Vercel fica disponivel apenas temporariamente como rollback.

## 5. Estado atual considerado

### 5.1 Arquitetura do projeto

Conforme `docs/02-arquitetura.md`, a aplicacao e composta por:

- Frontend React/Vite em `frontend/`.
- Backend Express em `backend/`.
- Prisma Client acessando PostgreSQL.
- Integracao WAHA/WhatsApp via backend.
- REST e Socket.IO entre frontend e backend.

### 5.2 Deploy e operacao

Conforme `docs/10-deploy-operacao.md`, os pontos obrigatorios de deploy sao:

- Backend build passa.
- Frontend build passa.
- Migrations rodam com `npm run prisma:deploy`.
- Env vars configuradas.
- CORS aponta para o frontend correto.
- `PUBLIC_BACKEND_URL` e acessivel externamente para webhooks.
- WAHA e acessivel pelo backend.
- Healthcheck responde.

### 5.3 Variaveis criticas

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
ASAAS_API_URL
ASAAS_API_KEY
ASAAS_WEBHOOK_TOKEN
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
```

Frontend:

```txt
VITE_API_BASE_URL
VITE_DEMO_TENANT_SLUG
VITE_DEMO_EMAIL
VITE_DEMO_PASSWORD
VITE_DEMO_BRANCH_ID
VITE_SOCKET_URL
```

### 5.4 Pontos sensiveis

- CORS depende do dominio final do frontend.
- Webhook WAHA depende de `PUBLIC_BACKEND_URL`.
- Socket.IO depende do dominio publico da API ou variavel dedicada.
- Secrets nao podem ser commitados.
- Rotas publicas por tenant slug devem continuar funcionando.
- API em container long-running pode se comportar diferente de serverless.

## 6. Arquitetura alvo

Um unico projeto Railway por ambiente, com topologia equivalente em `staging` e `production`.

```txt
Railway project: podepedir

Environment: production

frontend
  - publico
  - build Vite
  - dominio: app.<dominio>
  - chama API publica

api
  - publico + privado
  - Node/Express long-running
  - roda migrations no deploy
  - chama Postgres privado
  - chama WAHA privado

waha
  - privado
  - sem dominio publico, salvo necessidade temporaria de manutencao
  - recebe chamadas internas da API
  - envia webhooks para a API publica ou endpoint interno se viavel

postgres
  - privado
  - fonte unica de verdade
  - sem public networking apos validacao
```

Fluxo desejado:

```txt
Usuario -> frontend publico -> api publica
api -> postgres via rede privada Railway
api -> waha via rede privada Railway
waha -> api webhook por URL configurada
```

## 7. Decisoes tecnicas recomendadas

### 7.1 Servicos separados no Railway

Criar servicos separados para `frontend`, `api`, `waha` e `postgres`, mesmo que frontend e backend estejam no mesmo repositorio.

Motivos:

- Deploy independente.
- Logs separados.
- Variaveis especificas por servico.
- Escala e restart isolados.
- Public networking controlado por servico.

### 7.2 Monorepo com root directory

Se Railway estiver conectado ao repositorio atual:

- Servico `api` deve apontar para root/backend ou usar Dockerfile apropriado.
- Servico `frontend` deve apontar para root/frontend ou usar Dockerfile/static build apropriado.
- Evitar duplicar repositorios.

### 7.3 API long-running

A API deve rodar como processo persistente:

```bash
npm run build
npm run start
```

Ou, em container:

```bash
npx prisma migrate deploy && node dist/src/server.js
```

Validar se `railway-start.sh`, `Dockerfile.railway` e `backend/Dockerfile` ainda refletem o runtime real.

### 7.4 Migrations

Usar somente:

```bash
npm run prisma:deploy
```

Nunca usar `migrate dev` em producao.

Decidir se migrations rodam:

- no comando de start da API;
- em etapa separada de release;
- ou em um job/manual deploy step.

Recomendacao inicial:

- staging: migrations automaticas no deploy da API.
- production: migrations revisadas e aplicadas com controle de release.

### 7.5 Rede privada Railway

Usar variaveis de referencia para evitar hardcode:

```txt
DATABASE_URL=${{Postgres.DATABASE_URL}}
WAHA_BASE_URL=http://${{waha.RAILWAY_PRIVATE_DOMAIN}}:${{waha.PORT}}
```

Observacoes:

- Usar `http://` para trafego interno Railway.
- Nao usar `https://` em `railway.internal`.
- Cada environment precisa das suas proprias referencias.

### 7.6 Public networking

Manter publico:

- `frontend`
- `api`

Manter privado:

- `postgres`
- `waha`, salvo necessidade temporaria e documentada.

### 7.7 CORS e URLs publicas

Configurar na API:

```txt
CORS_ORIGIN=https://app.<dominio>
FRONTEND_URL=https://app.<dominio>
PUBLIC_BACKEND_URL=https://api.<dominio>
```

Configurar no frontend:

```txt
VITE_API_BASE_URL=https://api.<dominio>
VITE_SOCKET_URL=https://api.<dominio>
```

Durante staging:

```txt
CORS_ORIGIN=https://staging-app.<dominio-ou-railway>
FRONTEND_URL=https://staging-app.<dominio-ou-railway>
PUBLIC_BACKEND_URL=https://staging-api.<dominio-ou-railway>
```

### 7.8 WAHA e webhooks

Configurar a API para falar com WAHA via rede privada.

Validar em `backend/src/modules/whatsapp/whatsapp.service.ts`:

- composicao do webhook URL;
- uso de `PUBLIC_BACKEND_URL`;
- uso de `WAHA_BASE_URL`;
- timeout via `WAHA_REQUEST_TIMEOUT_MS`;
- segredo via `WAHA_WEBHOOK_SECRET`.

Decisao a confirmar:

- WAHA chama webhook da API pelo dominio publico da API.
- Se WAHA e API estiverem no mesmo Railway e WAHA aceitar URL interna, avaliar `http://api.railway.internal:<porta>/public/webhooks/waha`, mas priorizar simplicidade e observabilidade publica inicialmente.

## 8. Escopo

### 8.1 Dentro do escopo

- Criar plano de migracao Railway para frontend e API.
- Mapear servicos Railway e variaveis por ambiente.
- Definir estrategia de rede privada.
- Definir cutover, rollback e validacao.
- Definir checklist de seguranca e QA.
- Apontar arquivos que provavelmente precisam ajuste.
- Atualizar documentacao ao final da implementacao.

### 8.2 Fora do escopo inicial

- Reescrever funcionalidades de produto.
- Migrar dados do Postgres, ja que o banco ja esta no Railway.
- Trocar registrador de dominio.
- Refatorar modulo de WhatsApp alem do necessario para URLs/env vars.
- Criar observabilidade avancada fora do Railway no primeiro ciclo.
- Desativar Vercel imediatamente no dia do cutover.

## 9. Plano passo a passo

### Fase 1 - Inventario e desenho final

1. Mapear servicos existentes:
   - Vercel frontend.
   - Vercel API/serverless.
   - Railway WAHA.
   - Railway Postgres.
2. Exportar env vars atuais da Vercel e Railway.
3. Classificar env vars por destino:
   - frontend;
   - api;
   - waha;
   - shared variables;
   - production only;
   - staging only.
4. Identificar dominios atuais:
   - frontend atual;
   - API atual;
   - Railway generated domains;
   - dominios custom.
5. Confirmar se ha cron, serverless-only behavior ou limits especificos da Vercel.
6. Confirmar se uploads ou arquivos estaticos dependem do filesystem local.
7. Confirmar estrategia de staging:
   - Postgres separado;
   - WAHA separado;
   - ou ambiente staging com integracoes limitadas.

Saida esperada:

- matriz de env vars;
- diagrama final validado;
- lista de riscos especificos do ambiente atual.

### Fase 2 - Preparacao do repositorio

1. Revisar `Dockerfile.railway`, `railway.json`, `railway-start.sh` e `backend/Dockerfile`.
2. Decidir se a API vai usar:
   - Dockerfile;
   - Nixpacks;
   - ou Railway config por root directory.
3. Garantir que o backend rode em `0.0.0.0` e porta definida por `PORT`.
4. Garantir que o healthcheck `/health` nao depende de dados externos alem do Postgres.
5. Revisar `backend/src/config/env.ts` para aceitar todas as env vars de producao.
6. Revisar `backend/src/config/cors.ts` para multiplas origens quando necessario.
7. Revisar `frontend/src/services/api.ts` para confirmar que `VITE_API_BASE_URL` controla todas as chamadas HTTP.
8. Revisar `frontend/src/services/socket.ts` para alinhar socket com a API Railway.
9. Garantir que build de backend e frontend nao dependa de `.env` local commitado.
10. Atualizar docs se houver mudanca de comando de deploy.

Saida esperada:

- repositorio pronto para deploy separado de frontend e API no Railway;
- comandos de build/start definidos;
- sem secrets no codigo.

### Fase 3 - Criacao do ambiente staging no Railway

1. Criar ou clonar environment `staging`.
2. Criar servico `api`.
3. Criar servico `frontend`.
4. Criar ou anexar Postgres de staging.
5. Criar WAHA de staging ou definir modo de teste sem afetar WhatsApp real.
6. Configurar root directory de cada servico.
7. Configurar public networking:
   - ligado para `frontend`;
   - ligado para `api`;
   - desligado para `postgres`;
   - desligado para `waha`, se a estrategia permitir.
8. Configurar healthcheck da API.
9. Configurar deploy trigger por branch de staging.

Saida esperada:

- staging deployado no Railway;
- frontend e API acessiveis;
- WAHA e Postgres internos.

### Fase 4 - Variaveis de ambiente no Railway

1. Criar Shared Variables quando fizer sentido:
   - `NODE_ENV`;
   - limites de rate limit comuns;
   - URLs publicas do ambiente quando compartilhadas.
2. Configurar variaveis da API:

```txt
NODE_ENV=production
PORT=${{PORT}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<secret do ambiente>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=<frontend publico do ambiente>
FRONTEND_URL=<frontend publico do ambiente>
PUBLIC_BACKEND_URL=<api publica do ambiente>
WAHA_BASE_URL=http://${{waha.RAILWAY_PRIVATE_DOMAIN}}:${{waha.PORT}}
WAHA_API_KEY=<secret do ambiente>
WAHA_WEBHOOK_SECRET=<secret do ambiente>
ASAAS_API_URL=<sandbox ou production>
ASAAS_API_KEY=<secret do ambiente, se aplicavel>
ASAAS_WEBHOOK_TOKEN=<secret do ambiente, se aplicavel>
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

3. Configurar variaveis do frontend:

```txt
VITE_API_BASE_URL=<api publica do ambiente>
VITE_SOCKET_URL=<api publica do ambiente>
VITE_DEMO_TENANT_SLUG=<slug valido do ambiente>
```

4. Configurar variaveis do WAHA:

```txt
WAHA_API_KEY=<secret do ambiente>
WAHA_DASHBOARD_USERNAME=<usuario operacional>
WAHA_DASHBOARD_PASSWORD=<senha forte>
WHATSAPP_DEFAULT_ENGINE=WEBJS
```

5. Confirmar que nenhum valor local/demo e usado em producao:
   - `JWT_SECRET=local-development-secret-change-in-production`
   - senhas demo;
   - URLs `localhost`;
   - URLs Vercel antigas.

Saida esperada:

- env vars completas por servico;
- secrets isolados por ambiente;
- zero dependencia de Vercel para API/frontend.

### Fase 5 - Deploy e smoke test em staging

1. Executar deploy de staging.
2. Confirmar logs de build do backend.
3. Confirmar migrations:

```bash
npm run prisma:deploy
```

4. Confirmar logs de start:
   - API rodando.
   - Prisma conecta.
   - Socket.IO inicializa.
5. Testar healthcheck:

```txt
GET /health
```

6. Testar Swagger:

```txt
GET /docs
```

7. Testar login tenant:

```txt
POST /auth/login
```

8. Testar rotas publicas:

```txt
GET /tenants/:slug/public
GET /public/:tenantSlug/menu
GET /public/:tenantSlug/delivery-zones
```

9. Testar rotas protegidas:

```txt
GET /tenant/menu/products
GET /tenant/orders
GET /tenant/whatsapp/session
```

10. Testar frontend:
   - login;
   - cardapio publico;
   - carrinho;
   - checkout;
   - admin cardapio;
   - cozinha;
   - WhatsApp settings.
11. Testar CORS com origem real do frontend staging.
12. Testar WAHA:
   - API consegue chamar WAHA por rede privada;
   - QR/session endpoint responde;
   - webhook chega na API;
   - segredo de webhook e validado.
13. Testar Socket.IO:
   - conexao autenticada;
   - subscribe em rooms;
   - evento de pedido/cozinha.

Saida esperada:

- staging funcional;
- lista de ajustes antes de producao;
- evidencia de que rede privada API -> WAHA/Postgres funciona.

### Fase 6 - Hardening antes de producao

1. Desativar public networking do Postgres.
2. Desativar public networking do WAHA, se a operacao permitir.
3. Confirmar que API nao usa URL publica para WAHA ou Postgres.
4. Confirmar que logs nao exibem:
   - `DATABASE_URL`;
   - `JWT_SECRET`;
   - `WAHA_API_KEY`;
   - `WAHA_WEBHOOK_SECRET`;
   - tokens Asaas;
   - dados sensiveis de cliente.
5. Confirmar rate limit em rotas publicas sensiveis.
6. Confirmar CORS restrito ao dominio do frontend.
7. Confirmar que `PUBLIC_BACKEND_URL` e HTTPS.
8. Confirmar que webhooks externos apontam para API nova.
9. Confirmar que backups do Postgres existem antes do cutover.
10. Definir monitoramento minimo:
    - 5xx da API;
    - latencia;
    - falha Prisma;
    - falha WAHA;
    - webhook invalido;
    - erro CORS;
    - queda do Postgres.

Saida esperada:

- checklist de seguranca aprovado;
- ambiente de producao pronto para corte.

### Fase 7 - Preparacao do cutover

1. Congelar deploys na Vercel durante a janela de migracao.
2. Fazer backup do Postgres de producao.
3. Confirmar que Railway production esta na mesma versao de commit aprovada.
4. Rodar build final:

```bash
cd backend
npm run lint
npm run build

cd ../frontend
npm run build
```

5. Aplicar migrations de producao, se houver.
6. Validar healthcheck da API Railway.
7. Validar frontend Railway com dominio temporario.
8. Configurar DNS com TTL reduzido antes da janela, se possivel.
9. Preparar rollback:
   - DNS antigo da Vercel documentado;
   - Vercel mantida ativa;
   - variaveis antigas preservadas;
   - criterio claro de abortar.

Saida esperada:

- go/no-go de producao;
- janela de corte definida;
- rollback pronto.

### Fase 8 - Cutover de producao

1. Apontar dominio da API para Railway.
2. Apontar dominio do frontend para Railway.
3. Atualizar `CORS_ORIGIN` da API para o dominio final do frontend.
4. Atualizar `VITE_API_BASE_URL` no frontend para o dominio final da API.
5. Atualizar webhooks WAHA para `PUBLIC_BACKEND_URL` novo.
6. Validar DNS propagado.
7. Rodar smoke tests em producao:
   - `/health`;
   - login;
   - cardapio publico;
   - pedido teste controlado;
   - admin cardapio;
   - cozinha;
   - WhatsApp session/status;
   - webhook WAHA.
8. Monitorar logs em tempo real por pelo menos 60 minutos.
9. Manter Vercel ativa sem trafego.

Saida esperada:

- producao servida pelo Railway;
- stack operacional em um unico projeto;
- sem regressao critica nos fluxos centrais.

### Fase 9 - Pos-cutover e estabilizacao

1. Monitorar por 1 a 2 semanas.
2. Comparar metricas:
   - latencia API -> Postgres;
   - latencia API -> WAHA;
   - erros WAHA;
   - egress;
   - 5xx;
   - cold starts eliminados.
3. Revisar custos Railway.
4. Validar que Vercel nao recebe mais trafego relevante.
5. Atualizar documentacao:
   - `docs/10-deploy-operacao.md`;
   - `docs/03-ambiente-desenvolvimento.md`, se comandos mudarem;
   - README operacional, se existir.
6. Remover env vars duplicadas da Vercel somente apos periodo de estabilidade.
7. Desativar projetos Vercel quando rollback por DNS nao for mais necessario.

Saida esperada:

- operacao consolidada;
- documentacao atualizada;
- Vercel descomissionada com seguranca.

## 10. Arquivos provaveis de alteracao

### Backend

```txt
backend/src/config/env.ts
backend/src/config/cors.ts
backend/src/config/socket.ts
backend/src/modules/whatsapp/whatsapp.service.ts
backend/package.json
backend/Dockerfile
```

### Frontend

```txt
frontend/src/services/api.ts
frontend/src/services/socket.ts
frontend/package.json
frontend/vite.config.ts
```

### Infra

```txt
Dockerfile.railway
railway.json
railway-start.sh
docker-compose.yml
```

### Docs

```txt
docs/03-ambiente-desenvolvimento.md
docs/10-deploy-operacao.md
plans/plan-009-centralizacao-infraestrutura-railway.md
```

## 11. Matriz de variaveis por servico

### API

| Variavel | Ambiente | Origem | Observacao |
|---|---|---|---|
| `DATABASE_URL` | staging/prod | Railway Postgres reference | Deve ser privada |
| `JWT_SECRET` | staging/prod | secret manual | Valor diferente por ambiente |
| `CORS_ORIGIN` | staging/prod | dominio frontend | Lista apenas origens confiaveis |
| `FRONTEND_URL` | staging/prod | dominio frontend | Usado em links publicos |
| `PUBLIC_BACKEND_URL` | staging/prod | dominio API | Usado por webhooks e URLs externas |
| `WAHA_BASE_URL` | staging/prod | Railway private reference | Usar `http://` |
| `WAHA_API_KEY` | staging/prod | secret manual | Mesmo valor configurado no WAHA |
| `WAHA_WEBHOOK_SECRET` | staging/prod | secret manual | Validar webhook |
| `ASAAS_API_URL` | staging/prod | manual | Sandbox em staging |
| `ASAAS_API_KEY` | staging/prod | secret manual | Nunca no frontend |
| `ASAAS_WEBHOOK_TOKEN` | staging/prod | secret manual | Se integracao estiver ativa |

### Frontend

| Variavel | Ambiente | Origem | Observacao |
|---|---|---|---|
| `VITE_API_BASE_URL` | staging/prod | dominio API | Nunca `localhost` |
| `VITE_SOCKET_URL` | staging/prod | dominio API | Alinhar com Socket.IO |
| `VITE_DEMO_TENANT_SLUG` | staging/prod | slug valido | Evitar dado demo em prod se nao fizer sentido |

### WAHA

| Variavel | Ambiente | Origem | Observacao |
|---|---|---|---|
| `WAHA_API_KEY` | staging/prod | secret manual | Deve bater com API |
| `WAHA_DASHBOARD_USERNAME` | staging/prod | secret/manual | Nao usar admin/admin |
| `WAHA_DASHBOARD_PASSWORD` | staging/prod | secret/manual | Senha forte |
| `WHATSAPP_DEFAULT_ENGINE` | staging/prod | config | Manter padrao atual se ja funciona |

## 12. Checklist de validacao

### Build e runtime

- [ ] `npm run lint` passa no backend.
- [ ] `npm run build` passa no backend.
- [ ] `npm run build` passa no frontend.
- [ ] API sobe com `NODE_ENV=production`.
- [ ] API usa `PORT` fornecido pelo Railway.
- [ ] `/health` responde 200.
- [ ] Prisma conecta no Postgres privado.
- [ ] Migrations rodam com `prisma migrate deploy`.

### Frontend

- [ ] Frontend abre pelo dominio Railway/custom.
- [ ] `VITE_API_BASE_URL` aponta para API Railway.
- [ ] Login funciona.
- [ ] Cardapio publico carrega.
- [ ] Carrinho e checkout carregam dados reais.
- [ ] Admin abre apos login.
- [ ] Erros de API aparecem de forma legivel.

### Backend e API

- [ ] CORS aceita somente o frontend esperado.
- [ ] Swagger `/docs` responde, se habilitado em producao.
- [ ] Auth funciona.
- [ ] Rotas protegidas exigem JWT.
- [ ] Rotas tenant respeitam `tenantId`.
- [ ] Rotas publicas usam `tenantSlug`.
- [ ] Logs nao vazam secrets.

### WAHA

- [ ] API chama WAHA por rede privada.
- [ ] Sessao atual permanece valida ou ha processo documentado para reconectar.
- [ ] QR code/session endpoints respondem.
- [ ] Webhook WAHA chega na API nova.
- [ ] Segredo do webhook e validado.
- [ ] Envio de mensagem teste funciona.

### Operacao

- [ ] Postgres sem public networking.
- [ ] WAHA sem public networking ou excecao documentada.
- [ ] API e frontend com public networking.
- [ ] Dominios custom configurados.
- [ ] DNS validado.
- [ ] Logs e metricas monitorados.
- [ ] Backup antes do cutover concluido.

## 13. Plano de rollback

### Antes do DNS mudar

Rollback simples:

- manter Vercel ativa;
- nao remover env vars antigas;
- manter dominios antigos documentados;
- nao alterar Postgres como fonte de verdade sem backup.

### Durante o cutover

Se houver falha critica:

1. Reverter CNAME do frontend para Vercel.
2. Reverter CNAME da API para Vercel.
3. Restaurar webhooks para URL antiga, se tiverem sido alterados.
4. Manter Postgres no Railway como fonte unica.
5. Congelar novos deploys ate diagnostico.

### Depois do cutover

Durante 1 a 2 semanas:

- Vercel permanece ativa, sem trafego.
- Rollback ainda e possivel por DNS.
- Nao apagar configuracoes antigas antes de confirmar estabilidade.

### Criterios para acionar rollback

- Login indisponivel em producao.
- Cardapio publico indisponivel.
- Criacao de pedido indisponivel.
- API sem conexao com Postgres.
- WAHA sem comunicacao com API por periodo maior que a tolerancia definida.
- Erro 5xx sustentado apos cutover.
- Falha de DNS sem resolucao rapida.

## 14. Riscos e mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| CORS errado apos troca de dominio | Frontend nao consegue chamar API | Configurar `CORS_ORIGIN` antes do cutover e testar preflight |
| `VITE_API_BASE_URL` apontando para Vercel/local | Frontend chama API antiga | Validar build output e requests no Network |
| WAHA privado inacessivel pela API | WhatsApp para de funcionar | Testar `WAHA_BASE_URL` privado em staging |
| Webhook WAHA apontando para API antiga | Eventos caem no backend errado | Atualizar `PUBLIC_BACKEND_URL` e validar logs |
| Migration quebra producao | Indisponibilidade ou schema inconsistente | Aplicar em staging e ter backup antes de prod |
| Secrets duplicados ou divergentes | Falhas intermitentes | Criar matriz de variaveis por servico |
| Public networking do Postgres ligado | Superficie de ataque maior | Desligar apos confirmar acesso privado |
| Diferenca serverless vs long-running | Bugs de lifecycle/timeout | Smoke tests de webhooks, sockets e pedidos |
| DNS com propagacao lenta | Usuarios em ambientes mistos | TTL baixo e Vercel ativa temporariamente |
| Logs vazando secrets | Incidente de seguranca | Redaction e revisao de logs |

## 15. Criterios de aceite

### Infraestrutura

- [ ] Existe um unico projeto Railway para a stack de producao.
- [ ] Existem servicos separados para frontend, API, WAHA e Postgres.
- [ ] `frontend` e `api` possuem dominio publico.
- [ ] `waha` e `postgres` nao possuem public networking, salvo excecao documentada.
- [ ] API acessa Postgres por variavel privada Railway.
- [ ] API acessa WAHA por rede privada Railway.
- [ ] Vercel nao recebe trafego de producao apos cutover.

### Aplicacao

- [ ] Login funciona no dominio final.
- [ ] Cardapio publico carrega no dominio final.
- [ ] Checkout publico consegue criar pedido.
- [ ] Admin consegue listar e editar cardapio.
- [ ] Cozinha recebe pedido.
- [ ] Socket.IO funciona para eventos relevantes.
- [ ] WhatsApp envia e recebe eventos via WAHA.

### Seguranca

- [ ] Nenhum secret foi commitado.
- [ ] `JWT_SECRET`, `WAHA_API_KEY`, `WAHA_WEBHOOK_SECRET` e tokens Asaas ficam no Railway.
- [ ] CORS restringe origens ao frontend esperado.
- [ ] Webhook WAHA valida segredo.
- [ ] Logs nao exibem secrets.

### Operacao

- [ ] Healthcheck da API responde.
- [ ] Logs de API, WAHA e Postgres estao acessiveis no Railway.
- [ ] Backup pre-cutover foi feito.
- [ ] Plano de rollback foi testado em mesa.
- [ ] Docs de deploy foram atualizadas.

## 16. Perguntas em aberto

1. Quais serao os dominios finais de frontend e API?
2. Havera ambiente staging completo com WAHA separado ou staging usara WhatsApp limitado?
3. O cutover sera feito em horario de baixo trafego?
4. Quem aprova o go/no-go de producao?
5. O Postgres atual do Railway ja e o banco de producao definitivo?
6. Existem jobs, crons ou funcoes especificas da Vercel que nao aparecem no codigo?
7. O WAHA precisa manter dashboard publico temporariamente para suporte?
8. Qual sera o periodo minimo de rollback com Vercel ativa?

## 17. Ordem recomendada de execucao

1. Fechar respostas das perguntas em aberto.
2. Preparar staging Railway.
3. Ajustar repo apenas onde for necessario para build/runtime/env.
4. Deployar API e frontend em staging.
5. Validar rede privada API -> Postgres e API -> WAHA.
6. Rodar smoke tests de login, cardapio, pedido, cozinha e WhatsApp.
7. Preparar production Railway.
8. Fazer backup.
9. Executar cutover DNS.
10. Monitorar e estabilizar.
11. Atualizar documentacao.
12. Descomissionar Vercel apos periodo de estabilidade.

## 18. Recomendacao final

Executar a migracao em duas entregas:

1. **Entrega 1 - Staging Railway completo**
   - Servicos criados.
   - Env vars organizadas.
   - Rede privada validada.
   - Smoke tests executados.
   - Ajustes de repo aplicados.

2. **Entrega 2 - Cutover de producao**
   - Backup pre-cutover.
   - Deploy production.
   - DNS para Railway.
   - Validacao em producao.
   - Monitoramento e rollback pronto.

Essa divisao reduz risco, preserva a Vercel como saida de emergencia e permite validar a maior mudanca tecnica da tarefa: a API rodando como servico persistente no Railway e falando com WAHA/Postgres pela rede privada.
