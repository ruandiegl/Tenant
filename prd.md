01 — Visão
O que é e para quem é
Uma plataforma white-label que permite a redes de restaurantes, franquias e grupos de alimentação gerenciar pedidos, cardápios, operadores e relatórios em múltiplas lojas a partir de um único painel centralizado — enquanto cada loja mantém sua identidade e autonomia operacional.


O AnotaAí resolve bem o pedido individual de uma loja. Este sistema resolve o problema um nível acima: como um grupo com 5, 20 ou 200 lojas gerencia tudo com consistência, visibilidade e controle de acesso.

02 — Arquitetura
Hierarquia de tenants
  Master
Operador da plataforma (você). Cria tenants, define planos de cobrança, acessa todos os dados. Acesso invisível ao cliente final. Painel administrativo interno.
  Tenant
Empresa / Rede / Franqueador. Exemplo: "Grupo GTF". Cria e gerencia suas próprias lojas. Define cardápio-base, regras globais, usuários admins. Vê relatórios consolidados.
  Loja
Unidade operacional. Cada loja é um subdomain ou contexto isolado. Opera seu próprio cardápio (herdado + customizações), recebe pedidos, gerencia operadores locais e horários.
  Cliente
Consumidor final. Acessa o cardápio via link/QR code, faz pedidos (mesa, balcão, delivery ou retirada). Não precisa criar conta — mas pode para acompanhar histórico.
03 — Módulos
Funcionalidades principais
Gestão de Pedidos
Recebimento em tempo real (WebSocket)
Status: novo → em preparo → pronto → entregue
Fila visual (estilo Kanban) para cozinha
Impressão automática na cozinha / balcão
Pedidos por mesa, balcão, delivery e retirada
Histórico completo com filtros
Cardápio Digital
Cardápio herdado do tenant (rede)
Customizações por loja (preço, disponibilidade)
Categorias, produtos, adicionais e variações
Foto, descrição e badges (destaque, novidade)
Horários de disponibilidade por item
Pausa temporária de itens (sem estoque)
Controle de Usuários
Perfis: admin tenant, gerente loja, operador
Permissões granulares por módulo
Login por email/senha ou PIN rápido
Log de ações auditável por usuário
Convite por e-mail com link temporário
Relatórios e Analytics
Dashboard por loja e consolidado (rede)
Ticket médio, itens mais vendidos, horário de pico
Faturamento por período e canal
Tempo médio de preparo por item
Exportação CSV/PDF
Interface do Cliente
Cardápio responsivo via QR code ou link
Sacola de compras + checkout simplificado
Acompanhamento de status do pedido
Identificação de mesa / nome do cliente
Pagamento: PIX, cartão, dinheiro, na entrega
Notificações
Alerta sonoro + visual para novos pedidos
Push para operadores (PWA)
WhatsApp para confirmação ao cliente
Status por e-mail (opcional)
Alertas de fila acima do limite
04 — Fluxo
Jornada principal: pedido completo
1
Cliente acessa o cardápio
Via QR code na mesa ou link compartilhado. O sistema identifica a loja, o canal (mesa, balcão, delivery) e carrega o cardápio correto com preços e disponibilidade em tempo real.

2
Montagem do pedido
Cliente adiciona itens à sacola, escolhe adicionais e variações. Pode aplicar observações por item. Visualiza subtotal, taxas e estimativa de entrega.

3
Checkout e pagamento
Informa nome / número da mesa (se presencial). Escolhe forma de pagamento. Pedido é enviado e cliente recebe confirmação com número e link de acompanhamento.

4
Recebimento pelo operador
Painel toca alerta sonoro. Pedido aparece na fila "Novos". Operador aceita e move para "Em preparo". Cozinha recebe impressão automática (se configurada).

5
Preparo e entrega
Operador atualiza status para "Pronto". Cliente é notificado. Para delivery, inicia-se o despacho. Status final é "Entregue" ou "Retirado".

6
Registro e analytics
Pedido é registrado com todos os metadados (tempo de preparo, canal, forma de pagamento, operador). Alimenta os relatórios do gerente da loja e do admin do tenant.

05 — Requisitos
Backlog priorizado
Funcionalidade	Módulo	Prioridade	MVP
Recebimento de pedidos em tempo real	Pedidos	P1	Sim
Cardápio digital responsivo	Cardápio	P1	Sim
Gestão multi-loja por tenant	Tenants	P1	Sim
Controle de usuários e permissões	Auth	P1	Sim
Fila Kanban para operadores	Pedidos	P1	Sim
Dashboard de vendas por loja	Analytics	P2	Não
Relatório consolidado da rede	Analytics	P2	Não
Integração WhatsApp (confirmação)	Notif.	P2	Não
Impressão automática na cozinha	Pedidos	P2	Não
Cardápio herdável (rede → loja)	Cardápio	P2	Não
Gestão de planos e faturamento	Billing	P3	Não
App nativo (iOS / Android)	Mobile	P3	Não
Integração iFood / Rappi	Integrações	P3	Não
06 — Requisitos Não Funcionais
Qualidade e escala
< 2s
Carregamento do cardápio
99,5%
Uptime mensal mínimo
< 500ms
Latência de novo pedido
100%
Isolamento de dados entre tenants
LGPD
Conformidade de dados pessoais
PWA
Instalável no celular do operador
07 — Posicionamento
Comparativo com AnotaAí
Capacidade	AnotaAí	Este sistema
Pedidos por loja única	Sim	Sim
Cardápio digital	Sim	Sim
Gestão multi-lojas	Não	Sim
Relatório consolidado da rede	Não	Sim
Cardápio herdável (franquia)	Não	Sim
White-label / marca própria	Não	Sim
Controle de acesso por perfil	Básico	Granular
API pública (integrações)	Limitado	REST + Webhooks
08 — Riscos
Principais riscos do projeto
Isolamento de dados entre tenants
Risco de um tenant acessar dados de outro por falha de query ou middleware. Mitigação: schema separado por tenant (PostgreSQL) ou row-level security rigoroso.
Latência em tempo real com muitas lojas simultâneas
WebSocket com muitos canais abertos pode sobrecarregar o servidor. Mitigação: uso de Redis Pub/Sub para escalabilidade horizontal.
Complexidade de herança de cardápio
Regras de sobreposição (rede vs loja) podem gerar conflitos difíceis de debugar. Mitigação: modelo claro de "override" com histórico de versão.
Adoção pelo operador de loja
Operadores com baixa familiaridade tecnológica podem ter dificuldade. Mitigação: UI simplificada para modo operador, onboarding guiado.
Integração com meios de pagamento
PIX, cartão e wallets exigem homologação. Mitigação: usar gateway já homologado (ex.: Pagar.me, Stripe) com abstração de provider.
09 — Roadmap
Plano de entrega
Fase 1 — MVP
0–3 meses
Cadastro de tenant e lojas
Cardápio digital básico
Recebimento de pedidos
Fila Kanban (operador)
Autenticação e perfis
Deploy estável (VPS)
Fase 2 — Crescimento
4–6 meses
Relatórios e analytics
Cardápio herdável
Notificações WhatsApp
Impressão cozinha
Dashboard consolidado
PWA para operadores
Fase 3 — Escala
7–12 meses
Billing e planos
API pública + webhooks
Integração iFood/Rappi
App nativo iOS/Android
IA: previsão de demanda
Multi-idioma / multi-moeda