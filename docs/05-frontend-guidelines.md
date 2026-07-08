# Guidelines de frontend

## Stack

- React
- TypeScript
- Vite
- React Router
- TanStack React Query
- React Toastify
- Lucide React
- Socket.IO client

## Organizacao

```txt
src/
  app/
    layouts/
    providers/
  components/
  hooks/
  pages/
  routes/
  services/
  types/
  utils/
```

## Rotas

Rotas publicas de cliente usam `/:tenantSlug`.

Rotas legadas `/cliente/*` redirecionam para o tenant demo.

Rotas protegidas:

- `/admin/*` para tenant admin;
- `/cozinha` para cozinha;
- `/superadmin/*` para plataforma.

Use `ProtectedRoute` com permissao explicita:

```tsx
<ProtectedRoute permission="tenant.orders.read">
  <AdminLayout>
    <AdminOrders />
  </AdminLayout>
</ProtectedRoute>
```

## Services

Toda chamada HTTP deve estar em `src/services`.

Padroes:

- use `api()` para rota publica;
- use `protectedApi()` para rota autenticada;
- mapeie resposta backend para tipos do frontend;
- converta `Decimal` e valores opcionais;
- mantenha paginas livres de detalhes de endpoint.

## Providers

Providers globais ficam em `src/app/providers`.

Atuais:

- `TenantProvider`: tenant publico ou tenant autenticado.
- `AuthProvider`: sessao, login, logout e perfil.
- `CatalogProvider`: categorias, produtos, disponibilidade e acoes de catalogo.
- `CustomerFlowProvider`: carrinho, endereco, pagamento e pedido publico.
- `SocketProvider`: conexao/eventos de tempo real.

## Componentes

Componentes reutilizaveis ficam em `components`.

Padroes:

- componentes UI genericos em `components/ui`;
- formularios em `components/forms`;
- componentes de dominio em pastas especificas;
- cada componente visual relevante pode ter `styles.css` ao lado;
- evitar regra de negocio profunda dentro de componentes.

## UI e UX

Admin:

- layout denso, claro e operacional;
- tabelas/listas escaneaveis;
- acoes previsiveis;
- confirmações para acoes destrutivas;
- feedback claro de carregamento e erro.

Cliente:

- foco em compra rapida;
- cards de produto legiveis;
- carrinho simples;
- progresso de checkout claro;
- acompanhamento de pedido facil.

Cozinha:

- leitura rapida;
- status visuais fortes;
- acoes com poucos cliques;
- detalhes de itens e observacoes sempre visiveis quando necessario.

Superadmin:

- foco em controle de tenants, planos, uso e auditoria;
- evitar misturar informacao operacional do tenant com informacao de plataforma.

## Estado e cache

- Use React Query para dados remotos.
- Invalide queries apos mutacoes.
- Use estado local para formulario e interacao temporaria.
- Evite duplicar dados remotos em muitos providers.
- Para carrinho publico, estado em memoria e aceitavel enquanto nao houver carrinho persistente.

## Estilos

- Mantenha consistencia com `styles.css` global.
- Evite paletas monotematicas.
- Garanta responsividade em mobile e desktop.
- Elementos de UI nao devem sobrepor texto ou controles.
- Use icones Lucide quando houver icone apropriado.

