# PodePedir - Documentacao do Projeto

Este diretorio concentra as guidelines, padroes e contexto tecnico do PodePedir para que qualquer pessoa consiga entender, manter e evoluir a aplicacao.

## Stack e tipo

- Stack principal: React, TypeScript, Vite, Node.js, Express, Prisma, PostgreSQL, Socket.IO, Docker, WAHA/WhatsApp.
- Tipo de projeto: WEB + API.
- Dominio: plataforma multi tenant para pedidos, cardapio, cozinha, entregas, WhatsApp, administracao de tenants e operacao de restaurantes.

## Como usar esta documentacao

Leia primeiro os documentos nesta ordem:

1. [Visao geral do produto](./01-visao-geral.md)
2. [Arquitetura](./02-arquitetura.md)
3. [Ambiente de desenvolvimento](./03-ambiente-desenvolvimento.md)
4. [Guidelines de backend](./04-backend-guidelines.md)
5. [Guidelines de frontend](./05-frontend-guidelines.md)
6. [Guidelines de banco de dados](./06-banco-de-dados.md)
7. [API, contratos e tempo real](./07-api-tempo-real.md)
8. [Seguranca e multi tenancy](./08-seguranca-multitenancy.md)
9. [Testes e qualidade](./09-testes-qualidade.md)
10. [Deploy e operacao](./10-deploy-operacao.md)
11. [Fluxos de dominio](./11-fluxos-dominio.md)
12. [Workflow de contribuicao](./12-workflow-contribuicao.md)

Depois, use o indice de agentes em [agents/README.md](./agents/README.md) para escolher qual agente de IA deve atuar em cada tipo de tarefa.

## Mapa rapido do repositorio

```txt
backend/
  src/
    app.ts
    server.ts
    config/
    modules/
    shared/
  prisma/
    schema.prisma
    seed.ts
    migrations/

frontend/
  src/
    app/
    components/
    hooks/
    pages/
    routes/
    services/
    types/
    utils/

docs/
  README.md
  *.md
  agents/
```

## Regras de ouro

- Todo dado operacional sensivel deve ser isolado por `tenantId`.
- Rotas protegidas devem validar autenticacao, tenant e permissao.
- Schemas de entrada devem ser validados com Zod no backend.
- O frontend deve consumir API por `services/`, nao direto em paginas.
- Mudancas no Prisma devem vir com migration e revisao de impactos.
- Fluxos de pedido, cozinha, entrega e WhatsApp devem preservar historico/auditoria.
- UI administrativa deve ser densa, clara e operacional; UI publica deve priorizar compra rapida.
- Documentacao deve ser atualizada junto com mudancas relevantes de arquitetura, rotas ou dominio.

