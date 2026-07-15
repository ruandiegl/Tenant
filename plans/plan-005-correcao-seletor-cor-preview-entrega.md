# Plano 005 - Correcao do seletor de cor e preview de bairro em entregas

## 1. Agente principal selecionado

Agente principal: **Frontend Agent**

Justificativa:

- A tarefa e majoritariamente de UI React, componentes, estado local e composicao visual.
- Conforme `docs/agents/README.md`, feature simples de tela deve usar `Frontend Agent`.
- O escopo nao pede nova tabela, nova rota ou nova regra de negocio de calculo de taxa.
- O PRD exige reaproveitamento de componentes shadcn/Select e melhoria de experiencia no painel admin.

Agentes de apoio:

- **UX UI Agent**: redesenhar a paleta, estados visuais, preview e alinhamentos.
- **QA Agent**: validar criterios de aceite, regressao visual e comportamento do preview.
- **Tech Lead Agent**: atuar somente se a implementacao revelar necessidade de extrair componente compartilhado usado tambem no checkout.

Skills/referencias recomendadas:

- **frontend-design**: para manter a tela admin operacional, clara e escaneavel.
- **shadcn**: para compor `Select`, estados de foco, badges, popover/grid se necessario e consistencia visual.

## 2. Referencias usadas

- `docs/README.md`
- `docs/05-frontend-guidelines.md`
- `docs/11-fluxos-dominio.md`
- `docs/agents/README.md`
- `docs/agents/frontend-agent.md`
- `docs/agents/ux-ui-agent.md`
- `docs/agents/qa-agent.md`
- PRD anexado: **Correcao do Seletor de Cor e do Preview no Cadastro de Area de Entrega**

## 3. Tarefa interpretada

Corrigir dois pontos especificos do modal de area de entrega em `/admin/entregas`:

1. Redesenhar o campo **Cor no mapa** para deixar as cores predefinidas em uma grade clara, com estado selecionado obvio, indicacao de cores ja usadas e campo customizado hex separado visualmente.
2. Trocar o preview estatico do modo **Bairro manual** por uma previa realista do select de bairros que o cliente vera no checkout, incluindo o bairro em digitacao e bairros ja cadastrados.

## 4. Objetivo

Melhorar confianca e clareza para o admin ao cadastrar areas de entrega:

- a cor selecionada precisa ser inequívoca;
- cores ja usadas devem ser avisadas sem bloquear a selecao;
- o preview de bairro manual deve mostrar o comportamento real do checkout;
- a implementacao deve evitar duplicacao visual entre admin e cliente.

## 5. Escopo funcional

### 5.1 Seletor de cor

1. Substituir o layout atual do campo `Cor no mapa` por um componente organizado.
2. Exibir uma grade fixa de swatches predefinidos.
3. Aumentar a paleta para 10 a 12 cores com bom contraste no mapa.
4. Cada swatch deve ter:
   - cor de fundo;
   - nome/hex acessivel por `aria-label` ou `title`;
   - estado selecionado com anel claro;
   - icone visual de check quando selecionado.
5. Cores usadas por outras areas da filial/tenant devem aparecer com aviso visual:
   - opacidade ou marcador discreto;
   - tooltip/titulo indicando uso;
   - nao bloquear selecao.
6. Campo customizado:
   - deve ficar separado da grade;
   - deve ser compacto;
   - deve aceitar hex `#RRGGBB`;
   - deve mostrar preview da cor custom;
   - deve exibir erro visual quando invalido.
7. Ao selecionar swatch ou digitar hex valido:
   - atualizar `zoneForm.color`;
   - atualizar preview do mapa em tempo real;
   - atualizar swatch/legenda quando aplicavel.

### 5.2 Preview de bairro manual

1. Remover preview textual estatico:
   - `Bairro ainda nao informado`;
   - `Este bairro ficara disponivel no select do checkout`.
2. Renderizar uma previa do select real do checkout usando o mesmo componente base de `Select` ja usado no projeto.
3. Popular a lista com:
   - bairros ja cadastrados em areas `NEIGHBORHOOD`;
   - bairro sendo digitado no formulario atual, antes de salvar;
   - bairro da area em edicao.
4. Evitar duplicidades por comparacao normalizada:
   - trim;
   - case insensitive;
   - acentos ignorados se houver helper disponivel.
5. Ordenar os bairros de forma previsivel:
   - alfabetica para itens salvos;
   - item em edicao/digitacao destacado, mantendo legibilidade.
6. O item digitado deve mostrar badge `Novo` quando ainda nao estiver salvo.
7. Em edicao, o item atual deve mostrar badge `Editando`.
8. Estado vazio:
   - select com placeholder `Selecione seu bairro`;
   - mensagem curta pedindo para digitar o bairro.
9. A previa deve parecer aberta/expandida por padrao, porque o objetivo e visualizacao, nao interacao real de cliente.

## 6. Arquivos provaveis

### Frontend

- `frontend/src/pages/admin/deliveries/index.tsx`
- `frontend/src/pages/admin/deliveries/styles.css`
- `frontend/src/components/ui/select/`

Possivel extracao se a implementacao ficar grande:

- `frontend/src/components/deliveries/delivery-color-picker/index.tsx`
- `frontend/src/components/deliveries/delivery-color-picker/styles.css`
- `frontend/src/components/deliveries/neighborhood-select-preview/index.tsx`
- `frontend/src/components/deliveries/neighborhood-select-preview/styles.css`

### Backend

Nao previsto no escopo inicial.

Revisar somente se a cor nao estiver persistindo ou se a lista de bairros nao estiver disponivel no payload ja carregado por `deliveryZonesService`.

## 7. Plano de execucao passo a passo

### Passo 1 - Levantamento do estado atual

1. Ler `frontend/src/pages/admin/deliveries/index.tsx`.
2. Identificar:
   - estrutura atual de `zoneForm.color`;
   - fonte de `visibleDeliveryZones`;
   - calculo de `usedRadiusColors`;
   - bloco atual de `delivery-color-field`;
   - bloco atual de preview do modo `NEIGHBORHOOD`.
3. Ler `frontend/src/pages/admin/deliveries/styles.css`.
4. Mapear classes atuais que podem ser reaproveitadas ou removidas.

### Passo 2 - Modelar dados derivados

1. Criar lista `usedColorEntries` com:
   - cor normalizada;
   - nome da area;
   - id da area;
   - ignorando area em edicao.
2. Criar helper `isColorUsed(color)`.
3. Criar lista `neighborhoodPreviewOptions` a partir de `visibleDeliveryZones`.
4. Incluir `zoneForm.neighborhood` na lista quando preenchido.
5. Marcar cada opcao como:
   - `saved`;
   - `draft`;
   - `editing`.

### Passo 3 - Implementar seletor de cor

1. Criar funcao/componente local `renderColorPicker` ou componente extraido.
2. Renderizar grade de swatches.
3. Usar `Check` ou icone Lucide equivalente no swatch selecionado.
4. Marcar cores ja usadas com indicador visual.
5. Campo hex:
   - usar `input type="text"` para controle fino do valor;
   - validar regex `^#[0-9A-Fa-f]{6}$`;
   - aceitar digitacao sem quebrar o formulario;
   - so aplicar no preview se valido.
6. Considerar manter `input type="color"` como botao pequeno auxiliar, mas nao como campo principal.

### Passo 4 - Implementar preview do bairro manual

1. Criar componente visual de preview com header:
   - `Como o cliente vai ver no checkout`.
2. Renderizar trigger do `Select` com placeholder.
3. Renderizar lista expandida abaixo do trigger, com as mesmas classes/estilo do design system.
4. Destacar item novo/editando.
5. Exibir mensagem vazia quando nao houver bairro digitado nem bairros cadastrados.
6. Garantir que o preview atualize a cada digitacao em `zoneForm.neighborhood`.

### Passo 5 - Ajustes visuais e responsividade

1. Garantir que o modal nao fique espremido.
2. Paleta:
   - grid limpo em desktop;
   - quebra responsiva em mobile;
   - nenhum input gigante.
3. Preview:
   - lista com altura maxima e scroll interno se houver muitos bairros;
   - texto sem sobrepor controles;
   - layout consistente com admin.

### Passo 6 - Integracao com fluxo existente

1. Validar `Nova area` em modo `Raio em km`.
2. Validar `Editar area` em modo `Raio em km`.
3. Validar `Nova area` em modo `Bairro manual`.
4. Validar `Editar area` em modo `Bairro manual`.
5. Confirmar que payload continua enviando `color` quando aplicavel.
6. Confirmar que nenhuma chamada HTTP nova e necessaria.

### Passo 7 - Validacao tecnica

1. Rodar frontend:
   - `npm run build` em `frontend`.
2. Rodar backend typecheck, se arquivos compartilhados/tipos forem alterados:
   - `npm run lint` em `backend`.
3. Fazer checklist visual manual no navegador.

## 8. Criterios de aceite

1. O admin identifica imediatamente qual cor esta selecionada.
2. A grade de cores fica alinhada, sem swatches embolados com o seletor custom.
3. O campo custom hex e compacto e nao herda largura de inputs comuns.
4. Cor invalida exibe erro visual e nao quebra o preview.
5. Cor usada por outra area mostra aviso, mas continua selecionavel.
6. Preview de raio atualiza o mapa/legenda ao mudar cor.
7. Preview de bairro manual mostra lista de bairros como o checkout.
8. Bairro em digitacao aparece na previa antes de salvar.
9. Bairro em digitacao aparece destacado com badge `Novo`.
10. Area em edicao aparece destacada com badge `Editando`.
11. A tela continua responsiva e sem sobreposicao.
12. `npm run build` do frontend passa.

## 9. Checklist manual de QA

### Seletor de cor

1. Abrir `/admin/entregas`.
2. Criar area por raio.
3. Selecionar cada cor padrao e conferir:
   - estado selecionado;
   - preview no mapa;
   - legenda.
4. Digitar hex valido customizado.
5. Digitar hex invalido e conferir erro visual.
6. Criar duas areas com cores diferentes.
7. Abrir edicao de uma area e conferir indicacao de cor ja usada pela outra.
8. Selecionar cor ja usada e confirmar que nao bloqueia.

### Preview bairro manual

1. Trocar modalidade para `Bairro manual`.
2. Abrir `Nova area`.
3. Digitar bairro novo.
4. Conferir se aparece no preview com badge `Novo`.
5. Salvar area.
6. Abrir nova area novamente.
7. Conferir se bairro salvo aparece na lista do preview.
8. Editar bairro existente.
9. Conferir badge `Editando`.
10. Validar comportamento com lista grande de bairros.

### Regressao

1. Criar/editar/excluir area por raio.
2. Criar/editar/excluir area por bairro.
3. Abrir checkout publico e conferir select de bairros quando modalidade manual estiver ativa.
4. Conferir que tenant diferente nao mostra bairros/cores de outro tenant.

## 10. Riscos e mitigacoes

Risco: duplicar visual do select do checkout em vez de usar componente compartilhado.

Mitigacao: usar `components/ui/select` ou extrair um componente reutilizavel para preview.

Risco: input hex ficar dificil de usar se a validacao bloquear digitacao parcial.

Mitigacao: manter estado local do texto e aplicar somente quando valido.

Risco: cores muito parecidas ficarem ruins no mapa.

Mitigacao: revisar paleta com contraste e evitar tons proximos.

Risco: muitos bairros deixarem preview grande demais.

Mitigacao: lista com altura maxima e scroll interno.

## 11. Fora de escopo

- Alterar calculo de taxa.
- Criar nova entidade de bairro no banco.
- Alterar endpoints publicos.
- Alterar mapa do modo raio, exceto atualizacao visual da cor.
- Implementar testes automatizados extensos neste passo.

## 12. Ordem recomendada de implementacao

1. Refatorar seletor de cor.
2. Validar persistencia visual e preview no mapa.
3. Criar lista derivada de bairros.
4. Implementar preview expandido de select.
5. Ajustar CSS responsivo.
6. Rodar build e checklist manual.
