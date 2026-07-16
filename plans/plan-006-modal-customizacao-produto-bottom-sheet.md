# Plano 006 - Modal de customizacao de produto mobile como bottom sheet

## 1. Agente principal selecionado

Agente principal: **Tech Lead Agent**

Justificativa:

- A tarefa atravessa checkout publico, catalogo/cardapio, payload de pedido, persistencia backend e exibicao na cozinha.
- Conforme `docs/agents/README.md`, mudancas em pedido/cozinha devem envolver `Tech Lead Agent + Backend Agent + Frontend Agent + QA Agent`.
- O PRD tambem pode exigir revisao de modelagem, porque os ingredientes retirados precisam chegar estruturados ate o pedido e a cozinha.
- O modal e mobile-first e exige decisao de UX, logo o `UX UI Agent` entra como apoio.

Agentes de apoio:

- **Product Manager Agent**: confirmar escopo, regras de conflito entre retirar ingrediente e adicionar complemento, e criterios de aceite.
- **UX UI Agent**: desenhar bottom sheet, hierarquia das secoes, estados mobile, rodape fixo e acessibilidade.
- **Frontend Agent**: implementar React, estado do customizador, carrinho, services e estilos.
- **Backend Agent**: ajustar schemas Zod, orders service, criacao do pedido e retorno para cozinha.
- **Database Agent**: avaliar e implementar persistencia estruturada de ingredientes removidos.
- **QA Agent**: definir regressao para pedido publico, cozinha, mobile e multi tenant.

## 2. Referencias usadas

- `docs/README.md`
- `docs/04-backend-guidelines.md`
- `docs/05-frontend-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/09-testes-qualidade.md`
- `docs/11-fluxos-dominio.md`
- `docs/agents/README.md`
- `docs/agents/product-manager-agent.md`
- `docs/agents/tech-lead-agent.md`
- `docs/agents/frontend-agent.md`
- `docs/agents/backend-agent.md`
- `docs/agents/database-agent.md`
- `docs/agents/ux-ui-agent.md`
- `docs/agents/qa-agent.md`
- PRD anexado: **Modal de Customizacao de Produto (Mobile) como Bottom Sheet + Secao de Retirada de Ingredientes**

Observacao: o caminho solicitado `agents/README.md` nao existe na raiz do projeto. A documentacao principal aponta para `docs/agents/README.md`, entao este plano usa essa referencia.

## 3. Tarefa interpretada

Transformar o modal publico de customizacao de produto em um bottom sheet mobile-first, reorganizando o conteudo para:

1. mostrar ingredientes padrao do produto;
2. permitir retirada estruturada de ingredientes;
3. mostrar complementos;
4. mover observacoes para o fim;
5. manter rodape fixo com total e botao adicionar.

A informacao de ingredientes retirados deve sair do texto livre e chegar estruturada no pedido e na cozinha.

## 4. Contexto tecnico atual

### Frontend

- O modal atual esta em `frontend/src/pages/customer/menu/index.tsx`.
- Hoje ele usa `.modal-backdrop` + `.modal-card.product-customizer-modal`, centralizado/flutuante.
- Os ingredientes aparecem como um `OptionGroup` chamado `Ingredientes`.
- O fluxo atual trata ingredientes como "Lanche completo" e orienta o cliente a usar observacoes para retirada.
- O carrinho esta em `frontend/src/app/providers/customer-flow-provider.tsx`.
- O payload publico de pedido esta em `frontend/src/services/orders.ts`.

### Backend e banco

- Produtos usam `OptionGroup` e `OptionItem`.
- `OptionGroup` ja permite representar grupos como `Ingredientes` e `Complementos`.
- `OrderItem` tem `notes`.
- `OrderItemOption` persiste opcoes selecionadas, mas nao distingue claramente "complemento adicionado" de "ingrediente removido".
- `KitchenTicketItem` referencia `OrderItem`, entao a cozinha pode exibir dados que vierem junto do item do pedido.

## 5. Objetivo

Melhorar a experiencia mobile de customizacao e reduzir erro operacional na cozinha:

- o cliente escolhe retiradas por toque, sem depender de texto livre;
- a cozinha recebe "Sem: queijo, molho" de forma padronizada;
- o bottom sheet fica consistente com padroes mobile do app;
- observacoes continuam existindo, mas como excecao para pedidos especificos.

## 6. Escopo funcional

### 6.1 Bottom sheet mobile

1. Substituir o modal centralizado do customizador por bottom sheet no mobile.
2. O sheet deve abrir a partir da base da tela.
3. Altura alvo: 90% a 95% da viewport em mobile.
4. Deve ter handle visual no topo.
5. Header fixo:
   - categoria ou nome do produto;
   - titulo `Como deseja seu pedido?`;
   - botao `X`.
6. Conteudo com scroll interno.
7. Rodape fixo:
   - preco total;
   - botao `Adicionar`.
8. Desktop/tablet pode manter modal centralizado se o padrao atual estiver melhor para telas largas, mas mobile deve usar bottom sheet.

### 6.2 Ordem das secoes

1. Header.
2. Ingredientes padrao inclusos.
3. Retirar ingredientes.
4. Complementos.
5. Observacoes.
6. Rodape fixo de acao.

### 6.3 Ingredientes padrao

1. Usar o grupo `Ingredientes` existente no produto.
2. Exibir lista em bloco informativo.
3. Manter texto simples, sem instruir o usuario a usar observacoes para retirar itens.
4. Se nao houver grupo de ingredientes, esconder o bloco.

### 6.4 Retirar ingredientes

1. Gerar opcoes a partir dos itens do grupo `Ingredientes`.
2. Cada ingrediente vira uma linha `Retirar [nome]`.
3. Estado desligado:
   - icone `+`;
   - linha neutra.
4. Estado ligado:
   - destaque visual;
   - icone de removido/selecionado, conforme padrao do app.
5. Produtos sem ingredientes estruturados nao exibem a secao.
6. O estado deve ser independente por produto customizado.
7. Ao adicionar ao carrinho, salvar `removedIngredients` no item do carrinho.

### 6.5 Complementos

1. Manter grupos diferentes de `Ingredientes`.
2. Preservar regra de `minSelection` e `maxSelection`.
3. Manter preco incremental no total.
4. Validar se algum complemento conflita com ingrediente removido.
5. Regra inicial recomendada para MVP:
   - nao bloquear conflito automaticamente;
   - exibir tudo estruturado para cozinha;
   - adicionar pergunta aberta para produto decidir se deve bloquear casos como "retirar queijo" + "queijo extra".

### 6.6 Observacoes

1. Mover o textarea para o final do conteudo.
2. Manter limite de 180 caracteres, salvo se o produto pedir outro limite.
3. Atualizar placeholder para algo que nao duplique retirada estruturada:
   - exemplo: `Ex: molho separado, ponto da carne, embalagem extra...`
4. Observacoes nao devem receber automaticamente os ingredientes retirados.

### 6.7 Payload e persistencia

1. Enviar removidos no payload do pedido como dado estruturado.
2. Sugestao de shape frontend:

```ts
removedIngredients?: Array<{
  optionItemId: string;
  name: string;
}>;
```

3. Sugestao de payload publico:

```ts
items: Array<{
  productId: string;
  quantity: number;
  notes?: string;
  options?: Array<{ optionItemId: string; quantity: number }>;
  removedIngredients?: Array<{ optionItemId: string }>;
}>;
```

4. Backend deve validar se cada `optionItemId`:
   - pertence ao tenant;
   - pertence ao produto;
   - pertence ao grupo `Ingredientes`;
   - esta ativo.

### 6.8 Cozinha

1. Exibir ingredientes retirados no card e no modal de detalhes do pedido.
2. Formato recomendado:
   - `Sem: queijo, molho, cebola`.
3. Nao misturar removidos com observacoes.
4. Manter observacoes em bloco separado.

## 7. Decisao de modelagem recomendada

### Opcao preferida

Criar entidade especifica para ingredientes removidos:

```prisma
model OrderItemRemovedIngredient {
  id                     String      @id @default(cuid())
  tenantId               String
  orderItemId            String
  orderItem              OrderItem   @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  optionItemId           String?
  optionItem             OptionItem? @relation(fields: [optionItemId], references: [id])
  ingredientNameSnapshot String
  createdAt              DateTime    @default(now())

  @@index([tenantId, orderItemId])
}
```

Motivos:

- nao mistura removidos com `OrderItemOption`, que hoje representa itens adicionados/selecionados;
- preserva historico via snapshot mesmo se o ingrediente mudar de nome;
- facilita exibicao na cozinha;
- evita sobrecarregar `notes`.

### Alternativa

Adicionar campos a `OrderItemOption`, como `kind = ADDITION | REMOVED_INGREDIENT`.

Risco:

- pode impactar toda leitura atual de opcoes;
- exige migracao de dados existentes;
- aumenta chance de regressao em totais de pedido.

Recomendacao: usar tabela separada para menor risco.

## 8. Arquivos provaveis

### Frontend

- `frontend/src/pages/customer/menu/index.tsx`
- `frontend/src/pages/customer/menu/styles.css`
- `frontend/src/app/providers/customer-flow-provider.tsx`
- `frontend/src/services/orders.ts`
- `frontend/src/types/database.ts`
- Possivel extracao:
  - `frontend/src/components/menu/product-customizer-sheet/index.tsx`
  - `frontend/src/components/menu/product-customizer-sheet/styles.css`

### Backend

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `backend/src/modules/orders/orders.schemas.ts`
- `backend/src/modules/orders/orders.service.ts`
- `backend/src/modules/orders/orders.controller.ts`, se o mapper de resposta precisar mudar.
- `backend/src/modules/kitchen/kitchen.service.ts`
- `backend/src/modules/kitchen/kitchen.controller.ts`, se houver mapper especifico.

### Docs

- `docs/11-fluxos-dominio.md`, se o contrato do pedido publico for atualizado.
- `docs/07-api-tempo-real.md`, se a resposta de cozinha/pedido ganhar novo campo documentado.

## 9. Plano de execucao passo a passo

### Passo 1 - Auditoria do fluxo atual

1. Revisar `frontend/src/pages/customer/menu/index.tsx`.
2. Mapear estados atuais:
   - `customizingProduct`;
   - `selectedOptions`;
   - `customizationNotes`.
3. Confirmar como `CatalogProvider` monta grupo `Ingredientes`.
4. Revisar `CustomerCartItem` e `createCartItem`.
5. Revisar `ordersService.createPublicOrder`.
6. Revisar `orders.schemas.ts` para contrato publico.
7. Revisar `orders.service.ts` para criacao de `OrderItem` e `OrderItemOption`.
8. Revisar `kitchen.service.ts` para retorno de itens.

### Passo 2 - Definir contrato de dados

1. Criar tipo frontend `CustomerRemovedIngredient`.
2. Adicionar `removedIngredients` em `CustomerCartItem`.
3. Adicionar `removedIngredients` em `PublicOrderPayload.items`.
4. Definir retorno backend para `OrderItem`:

```ts
removedIngredients: Array<{
  id: string;
  optionItemId: string | null;
  name: string;
}>;
```

5. Atualizar tipos compartilhados do frontend em `types/database.ts`.
6. Garantir compatibilidade com pedidos antigos sem removidos.

### Passo 3 - Banco de dados

1. Atualizar `backend/prisma/schema.prisma`.
2. Adicionar relacao em `OrderItem`.
3. Criar migration com nome claro:
   - `add_order_item_removed_ingredients`.
4. Revisar SQL gerado.
5. Rodar:
   - `npx prisma validate`;
   - `npm run prisma:generate`, se disponivel.
6. Nao alterar dados historicos existentes.

### Passo 4 - Backend de pedidos

1. Atualizar Zod em `orders.schemas.ts`.
2. Validar payload publico:
   - array opcional;
   - ids nao vazios;
   - limite defensivo de quantidade de removidos por item.
3. Em `orders.service.ts`, durante criacao do pedido:
   - buscar produtos/opcoes do tenant;
   - validar cada ingrediente removido;
   - criar `OrderItemRemovedIngredient` em transacao junto do pedido.
4. Usar snapshot do nome do ingrediente.
5. Nao alterar total do pedido por retirada.
6. Retornar removidos em `GET /public/:tenantSlug/orders/:publicCode` e `GET /tenant/orders`.

### Passo 5 - Backend/cozinha

1. Ajustar query de cozinha para incluir `removedIngredients`.
2. Mapear resposta para o frontend da cozinha.
3. Garantir que o card e modal de detalhes recebam os dados.
4. Preservar `notes` separado.
5. Conferir eventos Socket.IO, se o payload de pedido/cozinha for emitido em tempo real.

### Passo 6 - Frontend: estado do customizador

1. Adicionar estado:

```ts
const [removedIngredients, setRemovedIngredients] = useState<Record<string, CustomerRemovedIngredient>>({});
```

2. Resetar estado ao fechar/adicionar produto.
3. Criar helper para obter grupo `Ingredientes`.
4. Criar helper para grupos de complemento:
   - todos os grupos exceto `Ingredientes`.
5. Criar `toggleRemovedIngredient`.
6. Passar removidos para `addProduct`.
7. Atualizar `createCartItem` para armazenar removidos.

### Passo 7 - Frontend: bottom sheet

1. Refatorar modal em `customer/menu` ou extrair componente.
2. Estrutura sugerida:

```txt
product-customizer-sheet
  header fixo
  body scrollavel
    ingredientes padrao
    retirar ingredientes
    complementos
    observacoes
  footer fixo
```

3. CSS mobile:
   - backdrop fixo;
   - sheet colado no bottom;
   - border-radius no topo;
   - `max-height: 94dvh`;
   - animacao de entrada vertical;
   - body com `overflow-y: auto`.
4. CSS desktop:
   - manter modal centralizado ou sheet limitado, conforme melhor consistencia atual.
5. Garantir que teclado mobile nao corte textarea/rodape.
6. Fechar por `X`.
7. Se ja houver hook/componente de drag em outro modal, reaproveitar; se nao houver, deixar drag como melhoria futura em vez de criar gestual fragil agora.

### Passo 8 - Frontend: secao Retirar ingredientes

1. Inserir secao depois do bloco de ingredientes padrao.
2. Para cada ingrediente:
   - renderizar `Retirar ${item.name}`;
   - botao de linha inteira;
   - icone `+` quando nao selecionado;
   - estado selecionado claro.
3. Esconder secao quando nao houver ingredientes.
4. Nao deixar a secao depender de observacoes.
5. Considerar texto curto:
   - `Selecione o que deseja remover do pedido`.

### Passo 9 - Frontend: cart e checkout

1. Verificar se o carrinho exibe detalhes do item.
2. Exibir removidos no carrinho:
   - `Sem: queijo, molho`.
3. Enviar `removedIngredients` no payload final.
4. Garantir que localStorage do fluxo publico suporte o novo campo sem quebrar itens antigos.
5. Atualizar mapper do pedido retornado se necessario.

### Passo 10 - Cozinha UI

1. Atualizar `frontend/src/pages/kitchen/queue/index.tsx`.
2. Atualizar `frontend/src/pages/kitchen/queue/styles.css`.
3. Exibir removidos no card expandido e no modal de detalhes.
4. Priorizar legibilidade:
   - badge ou linha vermelha/discreta `Sem: ...`.
5. Validar em status Novo, Preparando, Saiu para entrega e Concluido.

### Passo 11 - Validacao e qualidade

1. Rodar backend:
   - `npm run lint`;
   - `npm run build`, se existir.
2. Rodar frontend:
   - `npm run build`.
3. Rodar Prisma:
   - `npx prisma validate`.
4. Testar manualmente:
   - produto com ingredientes;
   - produto sem ingredientes;
   - produto com complementos;
   - produto com retirada + observacao;
   - pedido chegando na cozinha.

## 10. Criterios de aceite

1. No mobile, o customizador abre como bottom sheet a partir da base.
2. O sheet ocupa quase toda a tela, mas preserva header e rodape fixos.
3. O conteudo interno rola sem deslocar o botao `Adicionar`.
4. A ordem das secoes e:
   - ingredientes padrao;
   - retirar ingredientes;
   - complementos;
   - observacoes.
5. Ingredientes cadastrados no admin aparecem automaticamente na secao de retirada.
6. Produtos sem ingredientes nao exibem secao vazia.
7. O cliente consegue marcar e desmarcar ingredientes para retirada.
8. Observacoes ficam no final e nao sao usadas para representar retiradas estruturadas.
9. O carrinho preserva os ingredientes retirados.
10. O payload publico envia removidos como dado estruturado.
11. Backend valida tenant, produto e option item antes de criar o pedido.
12. Cozinha exibe `Sem: ...` separado das observacoes.
13. Pedidos antigos sem removidos continuam abrindo normalmente.
14. Build do frontend passa.
15. Lint/build do backend e validacao Prisma passam quando schema/backend forem alterados.

## 11. Checklist manual de QA

### Mobile customizer

1. Abrir `/:tenantSlug/menu` em viewport mobile.
2. Tocar em produto com ingredientes.
3. Confirmar abertura como bottom sheet.
4. Confirmar handle/topo, header e `X`.
5. Rolar conteudo e confirmar rodape fixo.
6. Marcar dois ingredientes para retirada.
7. Adicionar complemento pago.
8. Escrever observacao.
9. Adicionar ao carrinho.

### Carrinho e checkout

1. Conferir item no carrinho com:
   - complementos;
   - ingredientes retirados;
   - observacao.
2. Finalizar pedido delivery.
3. Finalizar pedido retirada na loja.
4. Confirmar que total nao muda por retirada.

### Cozinha

1. Abrir fila da cozinha.
2. Conferir card novo.
3. Expandir pedido.
4. Conferir `Sem: ...`.
5. Conferir observacao separada.
6. Trocar status e garantir que a informacao permanece.

### Regressao

1. Produto sem ingredientes deve abrir sem secao de retirada.
2. Produto sem complementos deve abrir sem lista vazia.
3. Produto com apenas complementos deve funcionar.
4. Tenant A nao pode enviar option item de tenant B.
5. Pedido criado antes da migration continua listando.

## 12. Riscos e mitigacoes

Risco: confundir ingredientes padrao com complementos porque ambos usam `OptionGroup`.

Mitigacao: identificar grupo `Ingredientes` por nome normalizado no MVP e avaliar futuro campo semantico `OptionGroup.type`.

Risco: usar `OrderItemOption` para removidos e quebrar calculo de totais.

Mitigacao: criar tabela separada para removidos.

Risco: bottom sheet ficar ruim com teclado aberto no textarea.

Mitigacao: usar `dvh`, scroll interno, rodape fixo e testar em viewport mobile.

Risco: conflito produto "retirar queijo" + complemento "queijo extra".

Mitigacao: nao bloquear no MVP; registrar pergunta aberta para decisao de produto.

Risco: payload aceitar ingredientes de outro produto/tenant.

Mitigacao: validacao backend obrigatoria por tenant, produto e grupo.

## 13. Perguntas abertas

1. Deve bloquear conflito entre retirar ingrediente e adicionar complemento equivalente?
2. O gesto de arrastar para baixo e obrigatorio agora ou pode ser fase 2?
3. A cozinha deve destacar retiradas com cor forte ou apenas texto/badge?
4. Ingredientes removidos devem aparecer tambem no acompanhamento do pedido do cliente?
5. O admin precisa configurar quais ingredientes podem ser removidos ou todos os ingredientes do produto entram por padrao?

## 14. Fora de escopo inicial

- Redesenhar o cadastro admin de produto.
- Criar um fluxo separado estilo "GRILL" completo.
- Alterar regra de preco por retirada de ingrediente.
- Criar motor de conflitos entre ingredientes e complementos.
- Criar testes E2E completos se a base ainda nao estiver preparada.

## 15. Ordem recomendada de implementacao

1. Implementar modelagem/persistencia dos ingredientes removidos.
2. Ajustar schemas e service de pedidos.
3. Atualizar tipos e service do frontend.
4. Atualizar estado do carrinho.
5. Refatorar customizador para bottom sheet.
6. Adicionar secao de retirada.
7. Atualizar carrinho e cozinha para exibir removidos.
8. Rodar validacoes.
9. Fazer QA manual mobile.
10. Atualizar docs de fluxo/contrato se a implementacao confirmar novo payload publico.
