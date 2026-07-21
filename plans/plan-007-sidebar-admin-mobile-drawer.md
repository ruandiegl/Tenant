# Plano 007 - Sidebar do painel admin em mobile como drawer expansivel

## 1. Agente principal selecionado

Agente principal: **Frontend Agent**

Justificativa:

- A mudanca esta concentrada em componentes React, layouts, estado temporario de interface e CSS responsivo.
- Nao altera contratos HTTP, banco de dados, regras de negocio ou isolamento multi tenant.
- Conforme `docs/agents/README.md`, uma feature de tela deve ser conduzida pelo Frontend Agent.
- A implementacao precisa preservar as rotas protegidas, permissoes e itens filtrados que ja chegam ao `PanelSidebar`.

Agentes de apoio:

- **UX UI Agent**: definir ergonomia mobile, hierarquia do gatilho, largura do drawer, estados visuais, animacao e legibilidade.
- **QA Agent**: cobrir abertura, fechamento, navegacao, submenus, acessibilidade, breakpoints e regressao desktop.
- **Tech Lead Agent**: revisar a separacao entre primitives de sidebar, navegacao compartilhada e container responsivo para evitar duplicacao.

## 2. Skills selecionadas

Skill principal: **shadcn**

Motivos:

- O PRD recomenda o padrao `Sheet` com `side="left"`.
- O projeto ja usa primitives no estilo shadcn em `frontend/src/components/ui`, com Radix disponivel por `radix-ui`.
- O Sheet/Dialog resolve portal, overlay, foco preso, `Escape`, restauracao de foco e bloqueio de interacao fora do drawer.
- A composicao permite manter a navegacao como componente do projeto e trocar apenas o container entre desktop e mobile.

Skills de apoio:

- **frontend-design**: manter a identidade escura do podePedir, reduzir peso visual e preservar o desenho clean aprovado para a sidebar.
- **react-best-practices**: revisar estado derivado, efeitos de rota, listeners e estabilidade dos componentes apos a refatoracao.
- **browser:control-in-app-browser**: validar o comportamento real em viewports mobile e desktop.

## 3. Referencias usadas

- `docs/README.md`
- `docs/02-arquitetura.md`
- `docs/05-frontend-guidelines.md`
- `docs/09-testes-qualidade.md`
- `docs/agents/README.md`
- `docs/agents/frontend-agent.md`
- `docs/agents/ux-ui-agent.md`
- `docs/agents/qa-agent.md`
- `docs/agents/tech-lead-agent.md`
- PRD anexado: **Sidebar do Painel Admin em Mobile (Drawer Expansivel)**
- Implementacao atual:
  - `frontend/src/components/ui/sidebar/index.tsx`
  - `frontend/src/components/ui/sidebar/styles.css`
  - `frontend/src/components/navigation/panel-sidebar/index.tsx`
  - `frontend/src/components/navigation/panel-sidebar/styles.css`
  - `frontend/src/app/layouts/admin-layout/index.tsx`
  - `frontend/src/app/layouts/superadmin-layout/index.tsx`

Observacao: o caminho `agents/README.md` nao existe na raiz. A propria documentacao principal direciona para `docs/agents/README.md`, que foi usado neste plano.

## 4. Tarefa interpretada

Substituir, somente em viewport mobile, a faixa lateral fixa de icones por um drawer sob demanda que:

1. inicia fechado;
2. nao reduz a largura do conteudo;
3. abre da esquerda e ocupa 90% da viewport;
4. mostra logo, tenant, labels, grupos, submenus e usuario;
5. fecha por overlay, botao de fechar, `Escape` ou navegacao;
6. preserva integralmente a sidebar fixa e recolhivel em desktop/tablet.

A navegacao deve continuar compartilhada entre Admin e SuperAdmin. Embora o aceite principal seja o painel Admin, a primitive compartilhada deve oferecer o mesmo comportamento mobile ao SuperAdmin para evitar divergencia futura.

## 5. Contexto tecnico atual

### 5.1 Sidebar atual

- `SidebarProvider` controla apenas `open` para os estados `expanded` e `collapsed`.
- O estado desktop pode ser persistido em `localStorage` pelas chaves:
  - `podepedir.admin.sidebar`;
  - `podepedir.superadmin.sidebar`.
- Em ate `760px`, o CSS atual força uma coluna fixa de aproximadamente 68px.
- Labels, submenus, rodape e trigger ficam ocultos no mobile.
- Essa coluna fixa e exatamente o comportamento que o PRD quer remover.

### 5.2 Navegacao atual

- `PanelSidebar` recebe os itens ja filtrados por permissao.
- Admin e SuperAdmin usam o mesmo componente.
- `SidebarNestedGroup` usa `Collapsible` do Radix.
- A logica de rota ativa esta em `isRouteActive`.
- O menu ja contem logo, tenant, usuario, logout e submenus.

### 5.3 Componentes sobrepostos existentes

- O projeto possui `components/ui/drawer`, usado no customizador de produto.
- Esse drawer e orientado a bottom sheet e usa animacao vertical.
- Nao foi encontrado um gesto horizontal reutilizavel de swipe.
- Para a sidebar, a abordagem recomendada e criar um `components/ui/sheet` lateral baseado em `Dialog`/Radix, seguindo a composicao shadcn, em vez de forcar o drawer inferior a aceitar outro eixo.

### 5.4 Breakpoint

- Sidebar e layouts atuais usam `760px` como breakpoint.
- O plano deve manter `max-width: 760px` para nao criar uma terceira regra responsiva conflitante.
- Desktop/tablet acima de 760px deve permanecer sem alteracao funcional.

## 6. Decisoes de arquitetura

### 6.1 Estado separado por contexto

O provider deve separar:

```ts
type SidebarContextValue = {
  open: boolean;
  state: "expanded" | "collapsed";
  mobileOpen: boolean;
  setOpen: (open: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
};
```

Regras:

- `open` continua sendo o estado desktop e pode ser persistido.
- `mobileOpen` e temporario, inicia sempre como `false` e nao usa `localStorage`.
- Abrir ou fechar o drawer mobile nao pode alterar o estado recolhido/expandido salvo para desktop.

### 6.2 Navegacao unica

Extrair o conteudo navegavel para um componente interno reutilizavel, por exemplo:

```txt
PanelSidebar
  PanelSidebarNavigation
    brand/header
    navigation groups
    account/footer
  desktop Sidebar
  mobile Sheet
```

Nao manter duas listas separadas de links. Desktop e mobile devem receber os mesmos arrays, permissoes, icones, rotas e grupos.

### 6.3 Primitive Sheet

Criar `frontend/src/components/ui/sheet` com composicao semelhante ao shadcn:

- `Sheet`;
- `SheetTrigger`;
- `SheetPortal`;
- `SheetOverlay`;
- `SheetContent`;
- `SheetClose`;
- opcionalmente `SheetHeader`, `SheetTitle` e `SheetDescription`.

O componente deve:

- usar Radix Dialog ja disponivel no projeto;
- aceitar `side="left"`;
- renderizar em portal;
- bloquear scroll do body enquanto aberto;
- prender o foco dentro do painel;
- fechar por `Escape` e clique no overlay;
- restaurar o foco ao gatilho ao fechar;
- respeitar `prefers-reduced-motion`.

### 6.4 Gatilho mobile

Adicionar um gatilho dedicado e claro:

- icone `Menu` do Lucide;
- `aria-label="Abrir menu de navegacao"`;
- tamanho minimo de toque de 44x44px;
- visivel somente em ate 760px;
- integrado a uma barra mobile compacta que nao ocupe largura lateral.

Abordagem recomendada:

- criar `PanelSidebarMobileBar` compartilhado;
- renderiza-lo no inicio de `SidebarInset`, antes do conteudo da pagina;
- mostrar logo compacta, nome do tenant/plataforma e botao de menu;
- usar `position: sticky; top: 0` para o gatilho continuar acessivel em telas longas;
- nao usar botao flutuante sobre cards/formularios, evitando sobreposicao.

## 7. Escopo funcional detalhado

### 7.1 Estado fechado em mobile

1. O grid deve virar uma unica coluna de largura total.
2. O `<aside>` desktop nao deve ocupar espaco nem ficar interativo.
3. O conteudo deve usar 100% da viewport.
4. A barra mobile deve mostrar contexto suficiente para o usuario saber em qual painel esta.
5. O drawer deve iniciar fechado a cada carregamento.

### 7.2 Estado aberto

1. Sheet entra pela esquerda.
2. Largura: `90vw`.
3. Altura: `100dvh`.
4. Fundo e identidade visual iguais a sidebar desktop aprovada.
5. Overlay cobre os 10% restantes e todo o conteudo atras.
6. Nenhum controle externo deve receber clique ou foco enquanto o Sheet estiver aberto.
7. Scroll deve ocorrer apenas na area central da navegacao, mantendo header e footer visiveis.

### 7.3 Header do drawer

1. Exibir logo compacta.
2. Exibir `brandTitle` e `brandSubtitle`.
3. Substituir o trigger desktop de recolher por um botao `X` de fechar.
4. Botao com tooltip opcional e `aria-label="Fechar menu de navegacao"`.

### 7.4 Links e submenus

1. Sempre mostrar icone + label no drawer.
2. Nao usar o estado `collapsed` para decidir tooltip dentro do mobile.
3. Clicar no cabecalho de grupo apenas expande/recolhe o submenu.
4. Abrir submenu nao fecha o drawer.
5. Clicar em uma rota final:
   - navega;
   - fecha o drawer;
   - devolve foco ao gatilho ou ao inicio do novo conteudo.
6. O grupo que contem a rota atual deve iniciar aberto.
7. Manter multiplos grupos abertos, igual ao comportamento desktop atual, evitando introduzir regra de accordion exclusiva no mobile.

### 7.5 Footer e logout

1. Exibir avatar, nome e email completos.
2. Exibir contexto `Tenant ativo` ou `Acesso de plataforma`.
3. O botao de logout deve continuar abrindo o `ConfirmDialog` existente.
4. Ao abrir a confirmacao de logout, o drawer deve ser fechado antes ou o dialog deve ficar acima do Sheet com foco correto.
5. Recomendacao: fechar `mobileOpen` antes de abrir `ConfirmDialog` para evitar duas camadas modais concorrentes.

### 7.6 Fechamento

O drawer deve fechar por:

1. botao `X`;
2. clique/toque no overlay;
3. tecla `Escape`;
4. selecao de rota final;
5. mudanca externa de `location.pathname`, como redirect por auth/permissao.

Swipe horizontal:

- nao incluir como requisito bloqueante do MVP;
- o projeto nao possui gesto horizontal reutilizavel;
- Radix Dialog/Sheet nao fornece swipe nativo;
- adicionar gesto manual agora aumentaria risco de conflito com scroll vertical e navegacao por toque;
- registrar como melhoria futura se testes de uso mostrarem necessidade.

## 8. Arquivos provaveis

### Criar

- `frontend/src/components/ui/sheet/index.tsx`
- `frontend/src/components/ui/sheet/styles.css`
- possivelmente `frontend/src/components/navigation/panel-sidebar/mobile-bar.tsx`

### Alterar

- `frontend/src/components/ui/sidebar/index.tsx`
- `frontend/src/components/ui/sidebar/styles.css`
- `frontend/src/components/navigation/panel-sidebar/index.tsx`
- `frontend/src/components/navigation/panel-sidebar/styles.css`
- `frontend/src/app/layouts/admin-layout/index.tsx`
- `frontend/src/app/layouts/admin-layout/styles.css`
- `frontend/src/app/layouts/superadmin-layout/index.tsx`
- `frontend/src/app/layouts/superadmin-layout/styles.css`

### Nao alterar

- backend;
- Prisma/migrations;
- services HTTP;
- rotas e permissoes;
- dados multi tenant;
- sidebar desktop acima de 760px, salvo ajustes estritamente necessarios para compartilhar o conteudo.

## 9. Plano de execucao passo a passo

### Passo 1 - Registrar o baseline

1. Abrir Admin em viewport desktop.
2. Registrar estados:
   - expandido;
   - recolhido;
   - grupo aberto;
   - rota ativa;
   - logout.
3. Abrir Admin em 390x844 ou equivalente.
4. Confirmar o problema atual da faixa fixa de icones.
5. Repetir o baseline no SuperAdmin.

### Passo 2 - Criar a primitive Sheet

1. Implementar `components/ui/sheet` sobre Radix Dialog.
2. Usar `Slot` apenas quando `asChild` for necessario.
3. Adicionar overlay com fade.
4. Adicionar content com animacao horizontal.
5. Adicionar botao de fechar com Lucide `X`.
6. Configurar largura mobile de 90vw via classe do consumidor ou variante.
7. Garantir `role="dialog"`, titulo acessivel e descricao quando aplicavel.
8. Incluir fallback visual para `prefers-reduced-motion`.

### Passo 3 - Evoluir o SidebarProvider

1. Adicionar `mobileOpen` e setters ao contexto.
2. Manter a API desktop existente compativel.
3. Manter persistencia somente para `open` desktop.
4. Criar `SidebarMobileTrigger` ou primitive equivalente.
5. Garantir que `Ctrl/Cmd + B` continue afetando apenas desktop.
6. Evitar leitura frequente de `localStorage`; preservar lazy initializer atual.

### Passo 4 - Extrair conteudo compartilhado

1. Extrair logo/header, grupos e footer de `PanelSidebar` para uma arvore reutilizavel.
2. Parametrizar o controle do header:
   - desktop: recolher/expandir;
   - mobile: fechar drawer.
3. Parametrizar clique em link final com `onNavigate`.
4. Manter filtro de permissao nos layouts, sem replica-lo no componente visual.
5. Manter `isRouteActive` como fonte unica de estado ativo.

### Passo 5 - Implementar container mobile

1. Renderizar Sheet apenas para o fluxo mobile, mas sem depender de JavaScript para esconder desktop.
2. Aplicar classes responsivas:
   - desktop aside visivel acima de 760px;
   - mobile bar e Sheet visiveis ate 760px.
3. Definir `width: 90vw` e `max-width: none` no mobile solicitado.
4. Usar `height: 100dvh` com fallback `100vh`.
5. Garantir safe areas:
   - `padding-top: env(safe-area-inset-top)`;
   - `padding-bottom: env(safe-area-inset-bottom)`.
6. Preservar header/footer e scroll interno.

### Passo 6 - Inserir barra mobile nos layouts

1. Criar componente compartilhado de barra mobile.
2. Inserir no `AdminLayout` dentro do `SidebarInset`.
3. Inserir no `SuperAdminLayout` da mesma maneira.
4. Passar titulo/subtitulo coerentes:
   - Admin: `podePedir` + nome do tenant;
   - SuperAdmin: `podePedir TMS` + `Console da plataforma`.
5. Ajustar padding superior das telas para nao duplicar espaco.

### Passo 7 - Fechamento por navegacao e logout

1. No `SidebarLink`, chamar `setMobileOpen(false)` depois da navegacao.
2. Adicionar efeito observando `location.pathname` para cobrir redirects externos.
3. Nao fechar ao clicar em grupo com submenu.
4. Antes de `onLogout`, fechar o Sheet.
5. Confirmar que o `ConfirmDialog` recebe foco e bloqueia fundo normalmente.

### Passo 8 - Ajustar CSS responsivo

1. Remover a coluna fixa de 68px no breakpoint mobile.
2. Em mobile, usar grid de uma coluna.
3. Esconder apenas o aside desktop, sem esconder labels dentro do Sheet.
4. Garantir que seletores atuais de mobile nao afetem a copia do menu no Sheet.
5. Criar classes explicitas como:
   - `.panel-sidebar-desktop`;
   - `.panel-sidebar-mobile-bar`;
   - `.panel-sidebar-mobile-sheet`.
6. Preservar tema escuro e o refinamento visual clean aprovado.
7. Evitar `z-index` arbitrarios; documentar a hierarquia entre bar, overlay, Sheet, toast e ConfirmDialog.

### Passo 9 - Acessibilidade

1. Trigger com nome acessivel.
2. Botao de fechar com nome acessivel.
3. Sheet com titulo acessivel, ainda que visualmente compacto.
4. Foco inicial no primeiro item navegavel ou botao fechar.
5. Tab e Shift+Tab presos no Sheet.
6. `Escape` fecha e devolve foco ao trigger.
7. Overlay bloqueia mouse/toque no conteudo.
8. Links mantem semantica de `NavLink`.
9. Icones decorativos usam `aria-hidden="true"`.
10. Animacoes respeitam reducao de movimento.

### Passo 10 - Validacao tecnica

1. Rodar `npm run build` em `frontend`.
2. Rodar `git diff --check`.
3. Revisar imports e evitar barrel imports desnecessarios.
4. Revisar componentes TSX com a skill `react-best-practices`.
5. Confirmar que nenhum arquivo backend foi alterado.

### Passo 11 - QA visual e funcional

Validar no minimo:

- 320x568;
- 360x800;
- 390x844;
- 430x932;
- 760x900;
- 761x900;
- 1024x768;
- 1440x900.

Em cada viewport mobile:

1. conteudo ocupa a largura completa com drawer fechado;
2. trigger permanece visivel e nao sobrepoe texto;
3. drawer ocupa 90%;
4. overlay ocupa o restante;
5. labels nao cortam;
6. footer continua acessivel;
7. menu rola quando necessario;
8. teclado e orientacao horizontal nao quebram layout.

## 10. Criterios de aceite

1. Em ate 760px, nenhuma faixa lateral fixa ocupa largura da tela.
2. O conteudo do Admin usa 100% da viewport quando o drawer esta fechado.
3. Existe gatilho mobile claro, acessivel e com area de toque minima de 44px.
4. O drawer entra pela esquerda e ocupa 90vw.
5. O overlay impede interacao com o conteudo externo.
6. O drawer mostra logo, tenant, icones, labels, grupos, usuario e contexto.
7. Submenus expandem e recolhem sem fechar o drawer.
8. Uma rota final fecha o drawer depois da navegacao.
9. Overlay, botao `X` e `Escape` fecham o drawer.
10. O foco fica preso no drawer enquanto aberto e retorna ao trigger ao fechar.
11. O logout continua abrindo o dialogo de confirmacao correto.
12. Permissoes continuam ocultando itens sem acesso.
13. Admin e SuperAdmin usam a mesma arvore de navegacao compartilhada.
14. Acima de 760px, a sidebar continua fixa, recolhivel e persistente como hoje.
15. O tema escuro e o design clean aprovado permanecem.
16. O build do frontend passa.

## 11. Checklist manual de QA

### Admin mobile

1. Entrar como tenant admin.
2. Abrir `/admin` em 390px.
3. Confirmar ausencia da faixa fixa.
4. Abrir o menu.
5. Conferir logo e tenant.
6. Expandir `Cozinha`.
7. Confirmar que o drawer permanece aberto.
8. Abrir `Cardapio`.
9. Confirmar navegacao e fechamento.
10. Reabrir e expandir `Logistica`.
11. Abrir `Cadastro de filiais`.
12. Confirmar rota, fechamento e pagina sem sobreposicao.

### Formas de fechar

1. Abrir e tocar no overlay.
2. Abrir e tocar no `X`.
3. Abrir e pressionar `Escape` com teclado.
4. Abrir e selecionar uma rota final.
5. Confirmar retorno de foco ao gatilho quando aplicavel.

### Footer e logout

1. Abrir drawer.
2. Conferir avatar, nome e email.
3. Acionar logout.
4. Confirmar que o Sheet nao disputa foco com o ConfirmDialog.
5. Cancelar e confirmar que a aplicacao permanece utilizavel.

### SuperAdmin

1. Entrar como superadmin.
2. Confirmar o mesmo drawer mobile.
3. Navegar por Visao geral, Tenants, Planos e Auditoria.
4. Confirmar que nao aparecem itens operacionais de tenant.

### Regressao desktop

1. Abrir Admin em 1440px.
2. Recolher e expandir sidebar.
3. Recarregar e confirmar persistencia.
4. Expandir submenus.
5. Navegar por todas as rotas permitidas.
6. Repetir no SuperAdmin.

## 12. Testes automatizados recomendados

Quando a base de testes de componentes estiver disponivel:

1. `SidebarProvider` inicia `mobileOpen=false`.
2. Trigger altera `mobileOpen` sem alterar `open` desktop.
3. Clique em rota chama fechamento mobile.
4. Clique em grupo nao fecha mobile.
5. Mudanca de pathname fecha o drawer.
6. Itens sem permissao nao sao renderizados pelo layout.
7. Sheet fecha por `Escape` e overlay, coberto pelo comportamento Radix.

E2E recomendado:

1. login admin em viewport mobile;
2. abrir drawer;
3. expandir submenu;
4. navegar;
5. conferir fechamento e URL;
6. testar logout/cancelamento;
7. repetir smoke test no SuperAdmin.

## 13. Riscos e mitigacoes

### Risco: duplicar arvore de links

Mitigacao: extrair `PanelSidebarNavigation` e reutiliza-la em desktop e Sheet.

### Risco: estado mobile sobrescrever preferencia desktop

Mitigacao: manter `mobileOpen` separado e nunca persisti-lo.

### Risco: seletores mobile esconderem labels dentro do Sheet

Mitigacao: substituir seletores globais por classes explicitas de container desktop/mobile.

### Risco: dois modais competirem no logout

Mitigacao: fechar o Sheet antes de abrir o `ConfirmDialog`.

### Risco: conteudo externo continuar rolando

Mitigacao: usar Dialog/Sheet Radix, que gerencia camada modal e bloqueio de interacao; validar Safari/iOS.

### Risco: barra mobile sobrepor cabecalhos de paginas

Mitigacao: renderizar a barra no fluxo/sticky do layout, nao como botao flutuante absoluto.

### Risco: regressao no breakpoint de 760px

Mitigacao: testar exatamente 760px e 761px, alem de desktop amplo.

### Risco: swipe manual conflitar com scroll

Mitigacao: deixar swipe fora do MVP e adotar apenas se houver primitive confiavel ou requisito confirmado.

## 14. Fora de escopo

- Alterar rotas ou permissoes.
- Redesenhar paginas internas do Admin.
- Alterar backend, banco ou dados de tenant.
- Trocar a identidade visual escura aprovada.
- Implementar swipe horizontal manual nesta primeira entrega.
- Alterar o comportamento desktop alem do necessario para compartilhar a navegacao.

## 15. Perguntas abertas e decisoes recomendadas

### Gatilho dedicado ou avatar/logo

Recomendacao: usar botao dedicado com icone `Menu` em barra mobile. E mais reconhecivel, acessivel e nao sobrecarrega logo/avatar com dupla funcao.

### Um ou varios submenus abertos

Recomendacao: manter varios, como na implementacao desktop atual. Evita comportamento diferente entre dispositivos.

### Aplicar ao SuperAdmin

Recomendacao: sim. O componente ja e compartilhado e o mesmo problema de largura existe no painel da plataforma.

### Swipe para fechar

Recomendacao: fase posterior. Os criterios de aceite obrigatorios ja sao atendidos por overlay, `X`, `Escape` e navegacao.

## 16. Ordem recomendada de implementacao

1. Registrar baseline visual e funcional.
2. Criar primitive `Sheet` lateral.
3. Separar estado mobile no `SidebarProvider`.
4. Extrair navegacao compartilhada do `PanelSidebar`.
5. Implementar Sheet mobile e barra de gatilho.
6. Integrar AdminLayout.
7. Integrar SuperAdminLayout.
8. Implementar fechamento por rota e logout.
9. Ajustar CSS e safe areas.
10. Revisar acessibilidade.
11. Rodar build e diff check.
12. Executar QA mobile e regressao desktop.

## 17. Definicao de pronto

A tarefa esta pronta quando:

- todos os criterios de aceite estiverem validados;
- houver evidencia visual em mobile e desktop;
- o build do frontend passar;
- Admin e SuperAdmin navegarem sem regressao;
- o drawer nao permitir interacao externa quando aberto;
- o estado desktop continuar persistente e o mobile sempre iniciar fechado;
- o diff estiver restrito ao frontend e a documentacao necessaria.
