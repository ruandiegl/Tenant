# Testes e qualidade

## Estado atual

O projeto usa TypeScript e builds como validacao principal. Ainda e recomendado ampliar testes automatizados.

Comandos atuais:

```bash
cd backend
npm run lint
npm run build

cd frontend
npm run build
```

## Estrategia recomendada

Backend:

- testes de integracao HTTP;
- banco de teste com migrations reais;
- cobertura para auth, tenant, permissoes, pedidos, cardapio, delivery zones e WhatsApp;
- testes de services para regras complexas.

Frontend:

- testes de componentes criticos;
- testes de services/mappers;
- E2E para fluxo publico de pedido;
- E2E para admin e cozinha quando estabilizar.

Banco:

- validar migrations com `prisma validate`;
- testar seed idempotente;
- garantir que migrations sobem do zero.

## Casos minimos criticos

Auth:

- login valido;
- login invalido;
- usuario suspenso;
- token ausente;
- permissao insuficiente.

Multi tenant:

- usuario de um tenant nao acessa dados de outro;
- header `x-tenant-id` divergente bloqueia;
- rotas publicas resolvem tenant por slug.

Pedido:

- criar pedido delivery;
- validar produto inexistente;
- validar estoque;
- aplicar cupom;
- criar historico;
- criar ticket de cozinha;
- atualizar status.

Delivery zones:

- listar publicamente por tenant slug;
- criar por bairro/CEP/raio;
- calcular/configurar excedente quando aplicavel;
- nao listar zonas inativas no publico quando regra exigir.

WhatsApp:

- criar/iniciar sessao;
- atualizar configuracoes;
- renderizar template;
- processar webhook;
- nao duplicar conversa/mensagem.

Frontend:

- login e redirecionamento;
- cardapio publico por slug;
- carrinho e checkout;
- admin menu;
- delivery zones;
- superadmin tenants;
- tela WhatsApp.

## Qualidade de codigo

Antes de concluir uma tarefa:

- rode build/lint proporcional;
- abra o diff;
- confira se alterou apenas o escopo necessario;
- verifique estados de loading/erro no frontend;
- atualize docs se mudou arquitetura, endpoint, env ou fluxo.

## Bugs comuns a evitar

- esquecer `tenantId` em query Prisma;
- retornar `Decimal` sem mapear no frontend;
- invalidar cache errado no React Query;
- criar rota sem permissao;
- aceitar payload sem schema;
- quebrar rotas publicas por slug;
- misturar superadmin com admin tenant.

