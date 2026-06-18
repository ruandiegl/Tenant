### super Admin

- Interface web para Gerenciamento de empresas 
- Dashboard com gráficos financeiros 
- Gerenciamento de Clientes


### cliente

- Separar Cliente de admin Via Autenticação
- Layout simples e intuitivo


### Fluxo de trabalho

- separar rotas 
- Adição de Projeto no Clerk
- autenticação por role
    Cliente
    Cozinha
    Administração



## Relatório Do Dia — 18/06/2026


Hoje avançamos o MVP do PodePedir focando em catálogo, pedidos e integração real com backend.
Feito:
- Produtos e categorias passaram a ser criados/editados/excluídos no banco.
- Catálogo agora respeita tenantId, separando dados por empresa.
- Menu do cliente renderiza produtos/categorias vindos da API.
- Estoque foi conectado à estrutura ProductAvailability.
- Pedido público passou a validar e descontar estoque no backend.
- Corrigido erro body: Required no frontend, mantendo Content-Type: application/json nas chamadas autenticadas.
- Corrigida validação rígida de imageUrl.
- Tela de pedidos ganhou ações de status: aceitar, preparar, pronto, despachar, entregar e concluir.
- Melhorada exibição/erro de API no admin.
- Builds de frontend e backend passaram.

### Pendência importante:

Reiniciar o backend local para carregar as alterações novas, especialmente estoque e rotas atualizadas.

### Validações:
    backend: npm run build OK.
    frontend: npm run build OK.

### Próximas Tarefas

- revisar cardápio
- implementar separação por categorias nas listas
- implementar filtro por categoria
- analisar possíveis melhorias
- implementar modáis de confirmação e view