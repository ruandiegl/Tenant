# Workflow de contribuicao

## Antes de iniciar

1. Leia o README de docs.
2. Identifique area afetada: backend, frontend, banco, infra, UX ou fluxo completo.
3. Rode `git status --short`.
4. Preserve mudancas existentes que nao sao suas.
5. Planeje o menor escopo que resolve a tarefa.

## Durante a implementacao

- Siga os padroes do modulo existente.
- Evite criar abstracao sem necessidade real.
- Mantenha regras de negocio no backend.
- Mantenha chamadas HTTP em `frontend/src/services`.
- Atualize tipos quando o contrato mudar.
- Crie migration quando o schema mudar.
- Atualize docs quando a mudanca alterar comportamento, env, rota, arquitetura ou fluxo.

## Commits

Padrao recomendado:

```txt
tipo: resumo curto
```

Tipos sugeridos:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`

Exemplos:

```txt
feat: add delivery zone distance mode
fix: preserve tenant context on public checkout
docs: add project guidelines
```

## Checklist antes de entregar

- O fluxo pedido funciona para tenant correto?
- Rotas protegidas tem permissao?
- Query Prisma filtra por tenant?
- Frontend tem estado de loading e erro?
- Build/lint relevante foi executado?
- Docs foram atualizadas?
- O diff nao inclui alteracoes acidentais?

## Quando pedir revisao especializada

- Mudou Prisma ou migration: envolver agente de banco.
- Mudou auth/permissao: envolver agente de seguranca.
- Mudou UI importante: envolver agente UX/UI e frontend.
- Mudou pedido/cozinha/entrega: envolver backend, frontend e QA.
- Mudou deploy/env: envolver DevOps.
- Mudou WhatsApp/webhook: envolver agente de integracoes.

