# Plano 003 - Cadastro de endereco no checkout por forma de entrega

## 1. Agente principal selecionado

Agente principal: **Tech Lead Agent**

Justificativa:

- A tarefa altera um fluxo critico de dominio: checkout publico, pedido, entrega e calculo de taxa.
- Conforme `docs/agents/README.md`, mudancas em pedido/entrega devem usar `Tech Lead Agent + Backend Agent + Frontend Agent + QA Agent`.
- O PRD exige coordenacao entre API publica, validacao backend, formulario React, regras multi tenant e experiencia do cliente.
- O melhor papel principal e tecnico-arquitetural, para garantir que a fonte de verdade continue no backend e que o frontend apenas reflita a configuracao ativa do tenant.

Agentes de apoio:

- **Product Manager Agent**: consolidar escopo, criterios de aceite, bordas e MVP.
- **Backend Agent**: endpoint publico, service, Zod, regras de pedido e isolamento por tenant.
- **Frontend Agent**: checkout publico, services, React Query, estado do endereco e Select shadcn.
- **Database Agent**: confirmar schema Prisma, migrations existentes e necessidade de novos campos.
- **Security Agent**: validar tenant por slug, payload manipulado e ausencia de vazamento entre tenants.
- **UX UI Agent**: organizar fluxo mobile first, bloqueios visuais e mensagens de erro claras.
- **QA Agent**: definir testes manuais, regressao e casos automatizaveis.

## 2. Referencias usadas

- `docs/README.md`
- `docs/agents/README.md`
- `docs/agents/tech-lead-agent.md`
- `docs/agents/product-manager-agent.md`
- `docs/agents/backend-agent.md`
- `docs/agents/frontend-agent.md`
- `docs/agents/qa-agent.md`
- `docs/04-backend-guidelines.md`
- `docs/05-frontend-guidelines.md`
- `docs/08-seguranca-multitenancy.md`
- `docs/09-testes-qualidade.md`
- PRD anexado: Cadastro de Endereco no Checkout Condicionado a Forma de Calculo de Entrega

## 3. Tarefa interpretada

Criar/ajustar o fluxo publico de cadastro de endereco no checkout para que ele se adapte a forma de calculo de entrega ativa do tenant:

- **Bairro manual**: cliente escolhe um bairro cadastrado pelo admin em um Select shadcn; os demais campos do endereco ficam bloqueados ate a selecao do bairro.
- **Faixa de CEP**: cliente nao ve select de bairro; CEP e o campo inicial e obrigatorio para identificar a faixa.
- **Raio/trajeto**, quando existirem no produto atual: manter comportamento de endereco completo e calculo por distancia, sem quebrar os fluxos ja existentes.
- Backend deve revalidar tudo no momento de criar o pedido publico, sem confiar apenas no frontend.

## 4. Objetivo

Garantir que o cliente informe o endereco de forma compativel com a configuracao de entrega do restaurante, evitando taxa incorreta, area de entrega indevida ou pedido finalizado com dados insuficientes.

Ao final:

- O checkout publico renderiza o formulario correto por tenant.
- A taxa exibida corresponde a area selecionada/calculada.
- O backend rejeita pedidos manipulados ou inconsistentes.
- A troca de modalidade pelo admin reflete no checkout na proxima carga/consulta.

## 5. Escopo funcional

### 5.1 Bairro manual

1. Buscar publicamente a modalidade ativa e as zonas/bairros ativos do tenant.
2. Exibir Select shadcn com bairros cadastrados pelo admin.
3. Bloquear campos de endereco enquanto nenhum bairro estiver selecionado:
   - CEP, se mantido visivel.
   - Rua.
   - Numero.
   - Complemento.
   - Referencia.
4. Ao selecionar bairro:
   - liberar os demais campos;
   - aplicar a zona/taxa correspondente;
   - manter o bairro escolhido mesmo se o CEP preencher dados via ViaCEP;
   - nao permitir bairro digitado fora da lista.
5. Se nao houver bairros ativos:
   - informar indisponibilidade de entrega;
   - impedir avanco para pagamento em entrega.

### 5.2 Faixa de CEP

1. Nao exibir Select de bairro.
2. Exibir CEP como campo inicial e obrigatorio.
3. Validar formato do CEP antes de prosseguir.
4. Identificar faixa ativa correspondente ao CEP.
5. Aplicar taxa da faixa ou exibir indisponibilidade quando nao houver faixa.
6. Permitir preenchimento/autocomplete dos demais campos do endereco.

### 5.3 Raio ou trajeto

1. Manter formulario de endereco completo.
2. Calcular distancia conforme modo ativo:
   - linha reta;
   - trajeto do motoboy.
3. Aplicar primeira faixa compativel ou regra de excedente.
4. Manter mensagens de loading enquanto calcula distancia.

## 6. Fora de escopo

- Redesenhar a tela admin de zonas de entrega.
- Criar novo motor de geocoding ou mapas.
- Persistir carrinho publico no banco.
- Criar conta obrigatoria para cliente.
- Reestruturar todo o modulo de pedidos.
- Alterar precificacao das zonas, salvo quando necessario para validar o pedido.

## 7. Estado atual a confirmar antes de implementar

1. Confirmar se `TenantSettings.deliveryCalculationMethod` ja existe e e a fonte de verdade.
2. Confirmar se `GET /public/:tenantSlug/delivery-zones` ja retorna apenas zonas compativeis com a modalidade ativa.
3. Confirmar se o checkout ja usa `deliveryZonesService.listPublic(tenantSlug)`.
4. Confirmar se o `CustomerFlowProvider` salva endereco com `district`, `postalCode`, `street`, `number` e `reference`.
5. Confirmar se o backend de pedidos recalcula ou apenas aceita `deliveryFee` do payload.
6. Confirmar se orders publicos recebem `zoneId`/`zoneName` ou apenas campos de endereco.

## 8. Arquivos provaveis

Backend:

```txt
backend/src/modules/delivery-zones/
backend/src/modules/orders/orders.routes.ts
backend/src/modules/orders/orders.controller.ts
backend/src/modules/orders/orders.service.ts
backend/src/modules/orders/orders.schemas.ts
backend/src/modules/tenants/tenants.service.ts
backend/prisma/schema.prisma
backend/prisma/migrations/
```

Frontend:

```txt
frontend/src/pages/customer/cart/
frontend/src/app/providers/customer-flow-provider.tsx
frontend/src/services/delivery-zones.ts
frontend/src/services/orders.ts
frontend/src/services/tenants.ts
frontend/src/types/database.ts
frontend/src/components/ui/select/
```

Documentacao:

```txt
docs/11-fluxos-dominio.md
docs/07-api-tempo-real.md
docs/05-frontend-guidelines.md
```

## 9. Decisoes tecnicas propostas

### 9.1 Fonte de verdade

Usar a configuracao persistida do tenant:

```txt
TenantSettings.deliveryCalculationMethod
```

Valores esperados no codigo atual:

```txt
NEIGHBORHOOD
POSTAL_CODE
ROUTE
STRAIGHT_LINE
```

Mapeamento funcional:

```txt
NEIGHBORHOOD -> Bairro manual
POSTAL_CODE -> Faixa de CEP
ROUTE -> Trajeto do motoboy
STRAIGHT_LINE -> Linha reta no mapa
```

### 9.2 Endpoint publico

Preferencia incremental:

- Reaproveitar `GET /public/:tenantSlug/delivery-zones` se ele ja filtra pela modalidade ativa e retorna dados suficientes.

Opcao mais explicita, se o contrato atual ficar ambiguo:

```txt
GET /public/:tenantSlug/delivery-config
```

Retorno sugerido:

```json
{
  "method": "NEIGHBORHOOD",
  "zones": [
    {
      "id": "zone_1",
      "type": "NEIGHBORHOOD",
      "neighborhood": "Centro",
      "fee": 5,
      "minimumOrderValue": 0,
      "status": "ACTIVE"
    }
  ]
}
```

Recomendacao:

- Para MVP, evitar endpoint novo se o contrato de delivery zones publico ja cobre o caso.
- Criar endpoint novo apenas se a tela precisar de configuracao mesmo quando nao houver zona ativa, ou se for necessario separar estrategia de lista de zonas.

### 9.3 Backend deve revalidar pedido

No `orders.service.ts`, no momento de criar pedido publico:

1. Resolver tenant pelo slug.
2. Buscar `TenantSettings.deliveryCalculationMethod`.
3. Buscar zonas ativas compativeis com a modalidade.
4. Validar endereco e taxa:
   - `NEIGHBORHOOD`: `district` deve bater com uma zona `NEIGHBORHOOD` ativa e elegivel.
   - `POSTAL_CODE`: `postalCode` deve cair em uma zona `POSTAL_CODE` ativa e elegivel.
   - `ROUTE`/`STRAIGHT_LINE`: endereco completo deve existir; a zona usada deve ser compativel com distancia calculada ou informada/recalculada.
5. Ignorar ou sobrescrever `deliveryFee` enviado pelo cliente quando possivel.
6. Rejeitar payload manipulado com `AppError(400)`.

### 9.4 Frontend deve ser derivado do backend

No checkout:

1. Carregar zonas/configuracao publica por tenant slug.
2. Derivar o modo pelo retorno:
   - zonas `NEIGHBORHOOD` -> bairro manual;
   - zonas `POSTAL_CODE` -> faixa CEP;
   - zonas `RADIUS`/`RADIUS_OVERFLOW` -> distancia.
3. Renderizar a variacao correta.
4. Usar Select shadcn para bairros.
5. Manter `tenantSlug` em navegacao publica.
6. Tratar loading/erro/vazio.

## 10. Plano passo a passo

### Fase 1 - Auditoria e contrato

1. Ler schema Prisma:
   - `TenantSettings`
   - `DeliveryZone`
   - `Order`
   - `Address`
2. Ler service publico de delivery zones.
3. Ler `orders.service.ts` e identificar onde o valor de entrega e endereco sao aceitos.
4. Ler `CustomerFlowProvider` para entender payload enviado.
5. Definir se o contrato atual basta ou se precisa `delivery-config`.

Saida esperada:

- Mapa exato dos campos e contratos atuais.
- Decisao documentada sobre endpoint novo ou reaproveitamento.

### Fase 2 - Backend: configuracao publica de entrega

1. Garantir que rota publica resolve tenant por slug, nao por `tenantId`.
2. Garantir filtro por tenant e status ativo.
3. Garantir que zonas retornadas sejam compativeis com `deliveryCalculationMethod`.
4. Converter `Decimal` para `number`.
5. Retornar dados minimos para checkout:
   - `id`
   - `type`
   - `neighborhood`
   - `postalCodeStart`
   - `postalCodeEnd`
   - `radiusKm`
   - `distanceMode`
   - `fee`
   - `minimumOrderValue`
   - `branch.address`, quando distancia precisar.

Validacao:

```bash
cd backend
npm run lint
```

### Fase 3 - Backend: validacao do pedido publico

1. No schema Zod de pedido publico, garantir formato minimo de endereco:
   - rua;
   - numero;
   - bairro;
   - CEP quando aplicavel;
   - referencia/complemento opcionais.
2. No service, buscar configuracao ativa no momento do pedido.
3. Implementar helper de resolucao de zona:
   - `resolveNeighborhoodZone`
   - `resolvePostalCodeZone`
   - `resolveDistanceZone`, se ainda nao existir.
4. Para bairro manual:
   - exigir `district`;
   - normalizar texto;
   - casar com zona ativa;
   - aplicar taxa do backend.
5. Para faixa CEP:
   - exigir CEP;
   - normalizar so digitos;
   - casar com faixa ativa;
   - aplicar taxa do backend.
6. Se nao encontrar zona, rejeitar com mensagem clara:

```txt
Endereco fora da area de entrega ativa.
```

7. Registrar no pedido a zona usada, se o modelo suportar.
8. Garantir que pedido nao possa usar area de outro tenant.

Validacao:

```bash
cd backend
npm run lint
npm run build
```

### Fase 4 - Frontend: service e tipos

1. Ajustar `deliveryZonesService.listPublic`.
2. Criar mapper robusto para:
   - decimal/string -> number;
   - campos opcionais;
   - branch/address.
3. Atualizar `DeliveryZone` e tipos auxiliares.
4. Se endpoint novo for criado, adicionar service:

```txt
frontend/src/services/delivery-config.ts
```

5. Garantir query key por tenant slug:

```txt
["public-delivery-zones", tenantSlug]
```

### Fase 5 - Frontend: checkout por bairro manual

1. Detectar `NEIGHBORHOOD` por zonas retornadas ou por config explicita.
2. Exibir Select shadcn antes dos outros campos de endereco.
3. Popular Select com bairros unicos e ativos.
4. Enquanto `district` estiver vazio:
   - bloquear CEP, rua, numero, complemento e referencia;
   - mostrar hint curto.
5. Ao selecionar bairro:
   - limpar erro de CEP/entrega;
   - atualizar `address.district`;
   - manter demais campos liberados;
   - aplicar taxa pela zona selecionada.
6. Se nao houver bairros:
   - exibir estado de entrega indisponivel;
   - bloquear avancar.
7. Garantir mobile first:
   - select ocupa largura total;
   - campos empilham sem sobreposicao;
   - textos cabem nos inputs/botoes.

### Fase 6 - Frontend: checkout por faixa CEP

1. Nao renderizar Select de bairro.
2. Renderizar CEP como campo inicial.
3. Manter ViaCEP, se ja existir.
4. Validar formato do CEP antes de avancar.
5. Exibir erro quando CEP nao esta em faixa ativa.
6. Nao bloquear rua/numero por falta de bairro.
7. Aplicar taxa quando `selectedZone` for encontrada.

### Fase 7 - Frontend: checkout por distancia

1. Preservar comportamento atual de endereco completo.
2. Confirmar que calculo de distancia roda apenas quando endereco minimo existe.
3. Exibir loading enquanto calcula.
4. Bloquear avancar quando distancia ainda esta calculando.
5. Bloquear avancar quando nao ha zona compativel.

### Fase 8 - UX e mensagens

Mensagens recomendadas:

- Bairro manual sem selecao:

```txt
Selecione o bairro atendido antes de preencher o endereco.
```

- Bairro manual sem bairros ativos:

```txt
Esta loja ainda nao cadastrou bairros para entrega.
```

- CEP fora da faixa:

```txt
Este CEP ainda nao esta dentro de uma area de entrega ativa.
```

- Endereco fora da area:

```txt
Este endereco ainda nao esta dentro de uma area de entrega ativa.
```

Regras:

- Toast para bloqueios de progresso.
- Hint inline proximo ao campo que precisa de acao.
- Nao mostrar erro tecnico de API para cliente final.

### Fase 9 - QA e regressao

Rodar validacoes:

```bash
cd backend
npm run lint
npm run build

cd frontend
npm run build
```

Casos manuais:

1. Tenant com bairro manual e bairros ativos:
   - select aparece;
   - campos ficam bloqueados;
   - selecionar bairro libera campos;
   - taxa correta aparece;
   - pedido confirma.
2. Tenant com bairro manual sem bairros ativos:
   - tela mostra indisponibilidade;
   - nao avanca para pagamento.
3. Tenant com faixa CEP:
   - select de bairro nao aparece;
   - CEP aparece primeiro;
   - CEP em faixa aplica taxa;
   - CEP fora da faixa bloqueia avanco.
4. Tenant com trajeto/linha reta:
   - fluxo antigo continua funcionando;
   - distancia calcula;
   - taxa de faixa/excedente aplica corretamente.
5. Payload manipulado:
   - bairro nao cadastrado rejeita no backend;
   - CEP fora da faixa rejeita no backend;
   - delivery fee alterado manualmente nao passa como fonte de verdade.
6. Multi tenant:
   - bairro de Tenant A nao atende Tenant B;
   - slug publico sempre resolve tenant correto.

## 11. Criterios de aceite

- [ ] Tenant em `NEIGHBORHOOD` exibe Select shadcn de bairros no checkout.
- [ ] Campos do endereco ficam bloqueados ate selecionar bairro.
- [ ] Selecao de bairro aplica taxa correspondente.
- [ ] Tenant em `POSTAL_CODE` nao exibe Select de bairro.
- [ ] CEP fora de faixa ativa bloqueia avanco.
- [ ] Backend rejeita pedido manipulado incompatavel com a modalidade ativa.
- [ ] Troca de modalidade no admin reflete no checkout na proxima carga.
- [ ] Nao ha vazamento de bairros/zonas entre tenants.
- [ ] UI funciona em mobile e desktop.
- [ ] `frontend npm run build` passa.
- [ ] `backend npm run lint` passa.
- [ ] `backend npm run build` passa ou justificativa fica registrada.

## 12. Riscos

- Backend pode estar aceitando `deliveryFee` do frontend como fonte de verdade.
- Cep ViaCEP pode retornar bairro diferente do bairro cadastrado manualmente.
- Admin pode trocar modalidade enquanto cliente esta no checkout.
- Tenant sem zonas ativas pode gerar checkout sem taxa.
- Comparacao textual de bairros pode falhar por acento, caixa ou abreviacao.
- Recalculo de distancia por rota depende de servico externo.

Mitigacoes:

- Revalidar modalidade e zona no backend no envio do pedido.
- Normalizar bairro para comparacao, mas preservar texto original.
- Exibir indisponibilidade quando nao houver zonas ativas.
- Nao confiar em estado antigo do frontend.
- Manter mensagens de erro claras e nao tecnicas.

## 13. Rollback

Rollback recomendado:

1. Se UI publica falhar, reverter apenas alteracoes do checkout e manter backend compativel.
2. Se validacao backend bloquear pedidos validos, criar hotfix permitindo modalidade anterior enquanto corrige regra.
3. Nao remover migration existente de `deliveryCalculationMethod` se ja estiver em uso.
4. Preservar endpoint publico antigo de delivery zones durante transicao.
5. Antes de deploy, registrar build anterior Vercel/Railway para rollback rapido.

## 14. Checklist de pronto

- [ ] Agente principal e agentes de apoio definidos.
- [ ] Contrato publico de entrega confirmado.
- [ ] Validacao backend por modalidade implementada.
- [ ] Select shadcn usado no bairro manual.
- [ ] Campos bloqueados/liberados corretamente.
- [ ] CEP funciona sem select de bairro no modo faixa CEP.
- [ ] Distancia/trajeto nao regrediu.
- [ ] Estados vazio/loading/erro tratados.
- [ ] Multi tenant revisado.
- [ ] Builds/lints executados.
- [ ] Docs atualizadas se endpoint/fluxo mudar.

## 15. Execucao em 2026-07-14

Status: **executado**

Implementado:

- Checkout publico passou a usar `TenantSettings.deliveryCalculationMethod` como fonte de verdade da modalidade ativa.
- Modo `NEIGHBORHOOD` agora exibe Select shadcn de bairros cadastrados pelo admin.
- Campos de endereco ficam bloqueados ate escolher bairro no modo bairro manual.
- Bairro manual sem bairros ativos bloqueia avanco com mensagem amigavel.
- Modo bairro manual nao exige CEP para avancar, mantendo rua, numero e bairro como endereco minimo.
- Modo `POSTAL_CODE` e modos de distancia nao exibem Select de bairro.
- Zonas usadas no checkout sao filtradas pela modalidade ativa antes de calcular taxa.
- O pedido publico envia `deliveryZoneId` quando houver area selecionada.
- Backend revalida taxa por tenant, filial, modalidade, area ativa, pedido minimo e endereco.
- Backend recalcula a taxa para bairro manual e faixa de CEP, ignorando taxa arbitraria do cliente.
- Backend exige `deliveryZoneId` e taxa compativel nos modos de distancia.
- Erros de API no checkout sao exibidos de forma legivel, sem JSON bruto.

Validacoes executadas:

```bash
cd frontend
npm run build

cd backend
npm run lint
npm run build
```

Resultado:

- `frontend npm run build`: passou.
- `backend npm run lint`: passou.
- `backend npm run build`: passou apos encerrar o processo local que travava a DLL do Prisma.
- Backend local reiniciado e `/health` respondeu `{"status":"ok","database":"ok"}`.
