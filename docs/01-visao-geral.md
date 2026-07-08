# Visao geral do produto

## O que e o PodePedir

O PodePedir e uma plataforma multi tenant para restaurantes e operacoes de pedidos. A aplicacao permite que diferentes empresas usem a mesma base de codigo e infraestrutura, mantendo dados isolados por tenant.

O produto cobre:

- cardapio publico;
- carrinho e checkout;
- acompanhamento de pedido;
- painel administrativo do restaurante;
- fila de cozinha;
- filiais e zonas de entrega;
- cupons;
- relatorios;
- WhatsApp via WAHA;
- painel superadmin para gestao de tenants, planos e auditoria.

## Personas principais

Cliente final:

- acessa o cardapio publico por slug do tenant;
- adiciona produtos ao carrinho;
- informa dados de entrega e contato;
- finaliza pedido;
- acompanha status do pedido.

Operador de cozinha:

- visualiza pedidos na fila;
- inicia preparo;
- marca como pronto, atrasado ou cancelado;
- consulta detalhes, itens e observacoes.

Administrador do tenant:

- gerencia cardapio, produtos, categorias e complementos;
- acompanha pedidos e dashboard;
- configura filiais, entregas, cupons, WhatsApp e dados do restaurante;
- gerencia equipe quando habilitado.

Superadmin da plataforma:

- cria e gerencia tenants;
- administra planos;
- consulta uso por tenant;
- gera links de convite;
- acompanha auditoria de plataforma.

## Areas da aplicacao

Cliente:

- rotas publicas baseadas em `/:tenantSlug`;
- fluxo de compra e acompanhamento;
- sem autenticacao obrigatoria para pedido publico.

Admin tenant:

- rotas em `/admin`;
- exige login e permissoes `tenant.*`;
- foco na operacao diaria do restaurante.

Cozinha:

- rota `/cozinha` ou `/admin/cozinha`;
- exige permissao `tenant.kitchen.read`;
- foco em execucao rapida.

Superadmin:

- rotas em `/superadmin`;
- exige permissao `platform.tenants.read`;
- usa `platformOnly` no frontend e `requirePlatformAdmin` no backend.

## Estado atual

Implementado no codigo atual:

- API Express com modulos de dominio.
- Frontend React com rotas de cliente, admin, cozinha e superadmin.
- Prisma/PostgreSQL com schema multi tenant.
- Seed com planos, permissoes, tenant demo e usuarios.
- Delivery zones por bairro, CEP, raio e excedente de raio.
- WhatsApp com sessoes, templates, webhooks e envio de mensagens.
- Socket.IO no backend e provider de socket no frontend.
- Docker Compose com Postgres, backend e WAHA.

Ainda merece atencao:

- ampliar testes automatizados;
- fortalecer cobertura de auditoria nos fluxos criticos;
- validar todos os fluxos com multiplos tenants reais;
- manter Swagger e docs sincronizados com as rotas.

