# Plano 004 - Reformulacao do cadastro de areas de entrega admin

## 1. Agente principal selecionado

Agente principal: **Tech Lead Agent**

Justificativa:

- A tarefa e uma reformulacao ampla do modulo de entregas no painel admin.
- Conforme `docs/agents/README.md`, mudancas em entrega devem envolver `Tech Lead Agent + Backend Agent + Frontend Agent + QA Agent`.
- O PRD tambem toca banco de dados, multi tenancy, UX operacional, componentes shadcn e o checkout publico.
- O papel do Tech Lead e coordenar os impactos, preservar compatibilidade dos contratos e definir uma implementacao incremental.

Agentes de apoio:

- **Product Manager Agent**: refinar escopo MVP, criterios de aceite e limites do PRD.
- **UX UI Agent**: desenhar a nova experiencia operacional, mapa consolidado, modais e estados vazios.
- **Frontend Agent**: implementar tela React, services, types, modais, mapa, lista e estados.
- **Backend Agent**: revisar/ajustar endpoints de `delivery-zones`, validacoes Zod e regras de persistencia.
- **Database Agent**: validar schema Prisma, migration de `color`, eventual entidade de bairros e indices.
- **QA Agent**: criar checklist manual, regressao de checkout e cenarios multi tenant.
- **Security Agent**: revisar isolamento por `tenantId`, permissoes e ausencia de vazamento entre tenants.

Skills/referencias de UI recomendadas:

- **frontend-design**: para orientar uma tela admin densa, escaneavel e especifica para logistica.
- **shadcn**: para usar `Dialog`, `Select`, `DropdownMenu`, `Popover`, badges e composicao consistente.

## 2. Referencias usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/tech-lead-agent.md`
- `docs/agents/frontend-agent.md`
- `docs/agents/backend-agent.md`
- `docs/agents/database-agent.md`
- `docs/agents/ux-ui-agent.md`
- `docs/agents/qa-agent.md`
- PRD anexado: **Reformulacao do Cadastro de Areas de Entrega (Painel Admin)**

## 3. Tarefa interpretada

Reformular a tela admin de areas de entrega para deixar de ser um formulario unico e passar a ser uma area de gestao:

- lista consolidada de areas cadastradas;
- mapa consolidado com todos os raios simultaneamente;
- botao `+ Nova area` abrindo fluxo por modal;
- escolha do modo de calculo antes do formulario;
- formularios separados para `Raio em km` e `Bairro manual`;
- selecao de cor organizada e relacionada ao mapa;
- acao para editar, ativar/desativar e excluir/desativar areas;
- regra fixa para enderecos fora dos raios cadastrados;
- reaproveitamento da fonte de bairros usada pelo checkout publico.

## 4. Objetivo

Dar ao admin uma visao clara e operacional das areas atendidas pelo restaurante, reduzindo confusao no cadastro e tornando o mapa uma ferramenta real de gestao.

Ao final:

- a tela inicial mostra lista + mapa, nao formulario em branco;
- areas por raio aparecem fixas no mapa, com cores distintas;
- a cor de cada area pode ser personalizada;
- o admin cria/edita areas por modal especifico;
- bairro manual usa uma fonte unica de bairros;
- checkout continua consumindo areas ativas corretamente.

## 5. Escopo funcional

### 5.1 Tela inicial

1. Renomear o contexto visual da tela para **Areas de entrega**.
2. Remover formulario aberto como primeiro elemento da tela.
3. Exibir layout principal:
   - coluna/lista de areas;
   - mapa consolidado;
   - botao `+ Nova area`.
4. Cada item da lista deve mostrar:
   - swatch/cor;
   - nome da area;
   - modalidade: `Raio em km` ou `Bairro manual`;
   - taxa;
   - pedido minimo, se houver;
   - tempo estimado;
   - status;
   - acoes rapidas.
5. Estados:
   - loading;
   - vazio;
   - erro de carregamento;
   - sem filial cadastrada.

### 5.2 Mapa consolidado

1. Exibir todos os raios ativos da filial selecionada simultaneamente.
2. Cada raio deve usar a cor persistida da area.
3. Os raios devem ficar fixos no centro da filial.
4. A escala do mapa deve ser calculada pelo maior raio ativo da filial.
5. Raio em criacao/edicao deve aparecer como preview diferenciado, por exemplo tracejado.
6. A legenda deve listar:
   - nome da area;
   - distancia;
   - cor;
   - taxa.
7. Area `Bairro manual` nao deve ser desenhada como circulo.
8. Se nao houver coordenada da filial:
   - tentar geocode pelo endereco;
   - exibir empty state se nao resolver.

### 5.3 Fluxo `+ Nova area`

1. Botao `+ Nova area` abre modal de escolha do modo.
2. O primeiro passo mostra cards/radio:
   - `Raio em km`;
   - `Bairro manual`.
3. Apos escolher, abrir formulario especifico no mesmo `Dialog` ou em um novo passo.
4. O modal deve permitir cancelar sem alterar dados.
5. Ao salvar:
   - invalidar query de areas;
   - atualizar lista;
   - atualizar mapa;
   - exibir toast de confirmacao.

### 5.4 Modal de raio em km

Campos:

- Filial.
- Status.
- Nome da area.
- Raio maximo.
- Tipo de regra:
  - `Raio atendido`;
  - `Fora dos raios cadastrados`.
- Cor.
- Taxa.
- Pedido minimo.
- Tempo estimado.

Regras:

- `Raio atendido` exige raio maior que zero.
- `Fora dos raios cadastrados` nao exige raio.
- `Fora dos raios cadastrados` so pode existir quando ja ha pelo menos um raio ativo na filial.
- Deve existir no maximo uma regra ativa `Fora dos raios cadastrados` por filial.
- Preview do raio atualiza em tempo real.
- Taxa e pedido minimo usam mascara monetaria.
- Raio usa mascara de km.

### 5.5 Modal de bairro manual

Campos:

- Filial.
- Status.
- Nome da area.
- Bairro atendido.
- Cor.
- Taxa.
- Pedido minimo.
- Tempo estimado.

Regras:

- O bairro deve vir de uma lista reutilizavel de bairros do tenant.
- Deve haver opcao `+ Novo bairro` dentro do fluxo.
- Nao desenhar circulo no mapa para bairro.
- Mostrar nota: `Bairros aparecem na lista e no checkout; o mapa exibe apenas raios.`

### 5.6 Cadastro reutilizavel de bairros

MVP recomendado:

1. Usar as proprias areas `NEIGHBORHOOD` como fonte inicial de bairros, se ainda nao houver tabela dedicada.
2. Evitar criar uma segunda lista divergente no frontend.
3. Se o produto exigir bairros independentes de area, criar entidade dedicada:

```txt
DeliveryNeighborhood
- id
- tenantId
- name
- city?
- reference?
- status
- createdAt
- updatedAt
```

4. O checkout publico deve consumir a mesma fonte, direta ou derivada.

Decisao tecnica a tomar na Fase 1:

- **Incremental**: manter bairro em `DeliveryZone.neighborhood`.
- **Completo**: criar `DeliveryNeighborhood` e relacionar `DeliveryZone`.

## 6. Escopo tecnico

### 6.1 Banco de dados

Confirmar estado atual:

- `DeliveryZone.color` existe ou precisa ser criado.
- `DeliveryZone.type` suporta `NEIGHBORHOOD`, `RADIUS`, `RADIUS_OVERFLOW`.
- `TenantSettings.deliveryCalculationMethod` aceita apenas as duas modalidades funcionais:
  - `NEIGHBORHOOD`;
  - `STRAIGHT_LINE` como representacao tecnica de `Raio em km`.

Possiveis ajustes:

- Migration para `DeliveryZone.color`.
- Migration para normalizar dados antigos:
  - `POSTAL_CODE` inativo;
  - `ROUTE` convertido para `STRAIGHT_LINE`;
  - zonas de raio antigas com cor default.
- Indice recomendado:

```txt
DeliveryZone(tenantId, branchId, type, status)
```

### 6.2 Backend

Arquivos provaveis:

```txt
backend/src/modules/delivery-zones/delivery-zones.routes.ts
backend/src/modules/delivery-zones/delivery-zones.controller.ts
backend/src/modules/delivery-zones/delivery-zones.schemas.ts
backend/src/modules/delivery-zones/delivery-zones.service.ts
backend/src/modules/orders/orders.service.ts
backend/prisma/schema.prisma
backend/prisma/migrations/
```

Regras:

1. Criar/editar areas somente no tenant autenticado.
2. Validar entrada com Zod.
3. Persistir `color` como hex valido.
4. Impedir mais de uma area ativa `RADIUS_OVERFLOW` por filial.
5. Impedir `RADIUS_OVERFLOW` sem raio ativo na filial.
6. Retornar areas com filial/endereco para mapa.
7. Listagem admin deve retornar todas as areas da modalidade ativa.
8. Listagem publica deve retornar apenas areas ativas e filiais ativas.
9. Pedido publico deve continuar revalidando taxa no backend.

### 6.3 Frontend

Arquivos provaveis:

```txt
frontend/src/pages/admin/deliveries/index.tsx
frontend/src/pages/admin/deliveries/styles.css
frontend/src/services/delivery-zones.ts
frontend/src/types/database.ts
frontend/src/components/ui/select/
frontend/src/components/ui/confirm-dialog/
frontend/src/components/ui/status-badge/
```

Possiveis componentes novos:

```txt
frontend/src/components/delivery/delivery-zone-list/
frontend/src/components/delivery/delivery-zone-map/
frontend/src/components/delivery/delivery-zone-dialog/
frontend/src/components/delivery/delivery-color-picker/
frontend/src/components/delivery/delivery-method-picker/
```

Recomendacao:

- Se a tela ficar grande, extrair componentes durante ou logo apos a implementacao.
- Evitar arquivo monolitico com mapa, modal, lista e form juntos.

## 7. Design e UX

Direcao visual:

- Admin operacional, denso e escaneavel.
- Manter identidade PodePedir: verde principal, fundo claro, cards discretos.
- Evitar hero/marketing.
- O mapa e a lista devem ser o centro da tela.

Layout desktop:

```txt
┌─────────────────────────────────────────────────────────────┐
│ Header: Logistica / Areas de entrega        [+ Nova area]   │
├────────────────────────────┬────────────────────────────────┤
│ Lista de areas             │ Mapa consolidado               │
│ filtros/filial             │ raios coloridos + legenda      │
│ cards compactos            │                                │
└────────────────────────────┴────────────────────────────────┘
```

Layout mobile/tablet:

```txt
Header
Botao + Nova area
Mapa consolidado
Lista de areas
```

Componentes shadcn sugeridos:

- `Dialog`: modais de criacao/edicao.
- `Select`: filial, status, bairro.
- `RadioGroup` ou cards selecionaveis: modo de calculo.
- `DropdownMenu`: acoes do item.
- `Popover`: selecao de cor.
- `Badge`: modalidade e status.
- `ScrollArea`: lista de areas quando crescer.

## 8. Plano passo a passo

### Fase 1 - Auditoria

1. Ler schema Prisma de `DeliveryZone`, `TenantSettings`, `Branch`, `Address`.
2. Ler service atual de `delivery-zones`.
3. Confirmar se `color` ja existe e se migration foi aplicada.
4. Confirmar se existe tabela/fonte dedicada de bairros.
5. Confirmar como checkout publico lista bairros.
6. Identificar dependencias de `POSTAL_CODE` e `ROUTE` antigas.

Saida:

- Decisao sobre fonte de bairros.
- Lista final de arquivos a alterar.

### Fase 2 - Banco e backend

1. Criar/ajustar migration de `DeliveryZone.color`.
2. Normalizar zonas antigas quando necessario.
3. Atualizar Zod:
   - tipo permitido;
   - cor hex;
   - regra de raio;
   - regra overflow.
4. Atualizar service:
   - listagem por modalidade;
   - create/update com cor;
   - validacao de `RADIUS_OVERFLOW`.
5. Garantir auditoria em create/update/delete.
6. Garantir `tenantId` em todas as queries.

Validacao:

```bash
cd backend
npm run lint
npm run build
```

### Fase 3 - Frontend services e types

1. Atualizar `DeliveryZone` com `color`.
2. Atualizar `DeliveryZonePayload`.
3. Mapear decimals para number.
4. Garantir `updateCalculationMethod`.
5. Revisar invalidacao React Query:
   - `delivery-zones`;
   - `public-delivery-zones`;
   - tenant atual quando mudar modalidade.

### Fase 4 - Nova tela base

1. Trocar estrutura da pagina para lista + mapa.
2. Remover formulario aberto como primeira experiencia.
3. Criar header com:
   - titulo `Areas de entrega`;
   - subtitulo operacional;
   - seletor de modalidade atual;
   - botao `+ Nova area`.
4. Criar estado vazio com CTA.
5. Criar lista compacta de areas.
6. Criar mapa consolidado com legenda.

### Fase 5 - Mapa consolidado

1. Calcular filial selecionada.
2. Obter ponto da filial:
   - latitude/longitude;
   - fallback geocode por endereco.
3. Filtrar raios ativos por filial.
4. Calcular escala pelo maior raio.
5. Desenhar todos os raios.
6. Aplicar cor por area.
7. Destacar item selecionado.
8. Mostrar regra `Fora dos raios` na legenda, sem desenhar circulo.

### Fase 6 - Modal de criacao

1. Implementar `Dialog`.
2. Primeiro passo: escolher modo.
3. Segundo passo:
   - form de raio;
   - form de bairro.
4. Validar campos antes de enviar.
5. Toast de sucesso/erro.
6. Fechar modal ao salvar.
7. Resetar form ao cancelar.

### Fase 7 - Edicao e acoes

1. Botao de editar abre modal preenchido.
2. Status pode ser alterado no modal ou acao rapida.
3. Desativar/excluir usa confirmacao.
4. Dropdown de acoes no card:
   - editar;
   - ativar/desativar;
   - excluir/desativar.
5. Atualizar lista/mapa apos cada acao.

### Fase 8 - Cor e conflito visual

1. Definir paleta fixa de cores distintas.
2. Criar seletor com swatches.
3. Marcar cores em uso.
4. Permitir usar cor repetida com aviso.
5. Permitir cor custom por hex/color picker.
6. Garantir contraste na legenda.

### Fase 9 - Bairro manual

1. Definir fonte unica de bairros.
2. Implementar select/combobox de bairro.
3. Implementar `+ Novo bairro` se houver entidade dedicada.
4. Garantir que checkout usa a mesma fonte.
5. Estado sem bairros:
   - orientar cadastro;
   - bloquear salvar area se bairro vazio.

### Fase 10 - QA

1. Rodar build/lint.
2. Testar fluxo raio:
   - criar raio;
   - editar raio;
   - cor aparece no mapa;
   - preview muda em tempo real.
3. Testar regra fora dos raios:
   - criar apos primeiro raio;
   - bloquear sem raio;
   - impedir segunda regra ativa.
4. Testar bairro manual:
   - criar area por bairro;
   - aparece na lista;
   - nao desenha circulo;
   - checkout mostra bairro.
5. Testar multi tenant:
   - Tenant A nao ve areas do Tenant B.
6. Testar responsividade.

## 9. Criterios de aceite

- [ ] Tela inicial mostra lista de areas e mapa consolidado.
- [ ] `+ Nova area` abre escolha de modo antes do formulario.
- [ ] Modal de raio tem preview em tempo real.
- [ ] Modal de bairro nao mostra campos de raio.
- [ ] Cores sao persistidas e exibidas na lista/mapa.
- [ ] Cores em uso sao indicadas no seletor.
- [ ] Todos os raios ativos da filial aparecem fixos no mapa.
- [ ] Regra `Fora dos raios cadastrados` pode ser criada com taxa fixa.
- [ ] `Fora dos raios cadastrados` exige pelo menos um raio ativo.
- [ ] Apenas uma regra ativa `Fora dos raios cadastrados` por filial.
- [ ] Areas de bairro aparecem na lista e no checkout.
- [ ] Backend valida tenant, filial, tipo, cor e taxa.
- [ ] Frontend usa `services/`, sem fetch direto na pagina.
- [ ] `npm run build` do frontend passa.
- [ ] `npm run lint` e `npm run build` do backend passam.

## 10. Riscos

- Representar bairros no mapa sem geometria real pode criar expectativa incorreta.
- Cores repetidas podem confundir leitura do mapa.
- Mapa via iframe OpenStreetMap limita interacao bidirecional.
- Geocoding externo pode falhar ou demorar.
- Migration de enum/metodo pode impactar tenants antigos.
- A tela pode ficar monolitica se componentes nao forem extraidos.

Mitigacoes:

- Para bairros, comunicar claramente que mapa exibe raios.
- Paleta distinta + aviso para cores repetidas.
- Manter mapa como preview operacional, nao roteirizador completo.
- Usar fallback de empty state quando geocode falhar.
- Normalizar dados antigos em migration.
- Separar componentes se o arquivo ultrapassar complexidade segura.

## 11. Rollback

1. Reverter apenas UI nova se houver falha visual grave, mantendo API compativel.
2. Manter campo `color` como opcional para nao quebrar dados existentes.
3. Se regra `RADIUS_OVERFLOW` bloquear pedidos validos, desativar validacao estrita temporariamente no backend.
4. Preservar listagem antiga enquanto a nova tela e estabilizada, se possivel por branch/feature flag.
5. Reverter deploy frontend sem rollback de migration, ja que `color` opcional e seguro.

## 12. Checklist de pronto

- [ ] Auditoria concluida.
- [ ] Fonte de bairros decidida.
- [ ] Migration revisada.
- [ ] Backend ajustado e validado.
- [ ] Types/services frontend atualizados.
- [ ] Tela lista + mapa implementada.
- [ ] Modal de raio implementado.
- [ ] Modal de bairro implementado.
- [ ] Seletor de cor implementado.
- [ ] Acoes de lista implementadas.
- [ ] Checkout revisado contra a mesma fonte de bairros.
- [ ] Build/lint executados.
- [ ] QA manual documentado.
