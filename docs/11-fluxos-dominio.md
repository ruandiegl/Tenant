# Fluxos de dominio

## Login

1. Usuario informa email, senha e opcionalmente tenant.
2. Frontend chama `POST /auth/login`.
3. Backend valida usuario, senha, status e membership.
4. Backend retorna JWT, tenant e permissoes.
5. Frontend salva token e tenantId.
6. Rotas protegidas usam `protectedApi`.

## Convite

1. Superadmin ou admin gera usuario/convite.
2. Backend cria token de convite.
3. Usuario acessa `/invite/:token`.
4. Frontend busca dados do convite.
5. Usuario define senha/nome.
6. Backend ativa usuario e membership.
7. Frontend inicia sessao.

## Pedido publico

1. Cliente acessa `/:tenantSlug/menu`.
2. Frontend carrega tenant, cardapio e delivery zones publicas.
3. Cliente monta carrinho e personaliza produtos em um bottom sheet mobile.
4. Ingredientes retirados sao mantidos separadamente de complementos e observacoes.
5. Cliente informa endereco, contato e pagamento selecionado.
6. Frontend chama `POST /public/:tenantSlug/orders`.
7. Backend valida tenant, filial, produtos, opcoes, ingredientes retirados e entrega.
8. Backend calcula totais sem alterar o preco por retirada de ingrediente.
9. Backend cria pedido, itens, retiradas, historico e ticket de cozinha.
10. Backend baixa estoque quando aplicavel.
11. Backend emite eventos.
12. Cliente recebe codigo publico.

## Acompanhamento de pedido

1. Cliente acessa `/:tenantSlug/pedido/:publicCode`.
2. Frontend chama `GET /public/:tenantSlug/orders/:publicCode`.
3. Pedido e renderizado com linha de status.
4. Quando Socket.IO estiver ativo no fluxo, eventos atualizam a tela sem polling.

## Cozinha

1. Operador acessa `/cozinha` ou `/admin/cozinha`.
2. Frontend chama `GET /tenant/kitchen/orders`.
3. Operador inicia preparo ou marca pronto/atrasado.
4. Frontend chama `PATCH /tenant/kitchen/orders/:id/status`.
5. Backend atualiza ticket e pedido.
6. Backend emite evento para cozinha e pedido.
7. Cards e detalhes exibem retiradas no formato `Sem: ingrediente`, separadas das observacoes.

## Admin cardapio

1. Admin acessa `/admin/cardapio`.
2. Frontend carrega categorias, produtos e templates.
3. Admin cria ou edita produto.
4. Frontend envia payload normalizado via `menuService`.
5. Backend valida Zod, tenant e categoria.
6. Backend persiste produto, opcoes, imagem e disponibilidade.
7. Frontend recarrega catalogo admin.

## Delivery zones

1. Admin acessa `/admin/entregas`.
2. Frontend usa `deliveryZonesService`.
3. Backend gerencia zonas por tenant e filial.
4. Cliente consulta zonas publicas por slug.
5. Checkout usa zonas para orientar taxa e cobertura de entrega.

## WhatsApp

1. Admin acessa `/admin/whatsapp`.
2. Frontend consulta sessao e templates.
3. Admin inicia sessao no WAHA.
4. Backend cria ou sincroniza `WhatsappSession`.
5. WAHA envia QR/status por API ou webhook.
6. Templates podem ser editados por tenant.
7. Mudancas de pedido podem disparar mensagens.

## Superadmin

1. Superadmin acessa `/superadmin`.
2. Frontend exige `platformOnly`.
3. Backend exige `requirePlatformAdmin`.
4. Superadmin lista tenants, edita plano/status, cria planos e consulta auditoria.
