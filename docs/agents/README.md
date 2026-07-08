# Agentes de IA do projeto

Use estes agentes como papeis especializados para planejar, implementar, revisar ou validar mudancas no PodePedir. Cada agente deve seguir a documentacao principal em `docs/README.md`.

## Indice de agentes

- [Product Manager Agent](./product-manager-agent.md): use para transformar necessidade de negocio em escopo, criterios de aceite e prioridade.
- [Tech Lead Agent](./tech-lead-agent.md): use para decisao arquitetural, decomposicao tecnica e revisao de impacto.
- [Backend Agent](./backend-agent.md): use para rotas, services, regras de negocio, Prisma Client, validacao Zod e Socket.IO backend.
- [Frontend Agent](./frontend-agent.md): use para telas React, rotas, providers, services, estados e integracao com API.
- [Database Agent](./database-agent.md): use para schema Prisma, migrations, seed, indices e modelagem multi tenant.
- [QA Agent](./qa-agent.md): use para plano de testes, casos criticos, regressao e validacao manual/automatizada.
- [Security Agent](./security-agent.md): use para auth, permissoes, isolamento tenant, secrets, uploads e webhooks.
- [DevOps Agent](./devops-agent.md): use para Docker, deploy, env vars, healthcheck, logs e operacao.
- [UX UI Agent](./ux-ui-agent.md): use para experiencia de cliente, admin, cozinha e superadmin.
- [WhatsApp Integrations Agent](./whatsapp-integrations-agent.md): use para WAHA, webhooks, sessoes, templates e mensagens.
- [Documentation Agent](./documentation-agent.md): use para manter docs, READMEs, changelogs e guias sincronizados.
- [Release Manager Agent](./release-manager-agent.md): use para preparar entrega, checklist, risco, rollback e comunicacao.

## Como escolher

- Feature simples de tela: Frontend Agent.
- Feature com regra de negocio: Backend Agent + Frontend Agent.
- Feature que altera tabela: Database Agent + Backend Agent.
- Mudanca em pedido/cozinha/entrega: Tech Lead Agent + Backend Agent + Frontend Agent + QA Agent.
- Mudanca em login/permissoes: Security Agent + Backend Agent + QA Agent.
- Mudanca em WhatsApp: WhatsApp Integrations Agent + Security Agent + QA Agent.
- Mudanca de infraestrutura: DevOps Agent + Release Manager Agent.
- Mudanca ampla de produto: Product Manager Agent + Tech Lead Agent.

