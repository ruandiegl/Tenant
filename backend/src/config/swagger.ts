import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "podePedir API",
      version: "0.1.0",
      description: "API REST multi tenant para cardapio, pedidos, cozinha, administracao e relatorios."
    },
    servers: [{ url: "http://localhost:3333", description: "Local" }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Tenants" },
      { name: "Users" },
      { name: "Branches" },
      { name: "Menu" },
      { name: "Orders" },
      { name: "Kitchen" },
      { name: "Coupons" },
      { name: "Reports" },
      { name: "Audit" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      parameters: {
        TenantHeader: {
          name: "x-tenant-id",
          in: "header",
          required: false,
          schema: { type: "string" },
          description: "Tenant atual. Opcional quando o JWT ja contem tenantId."
        }
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "admin@demo.local" },
            password: { type: "string", example: "admin123" },
            tenantSlug: { type: "string", example: "demo-burger" }
          }
        },
        TenantCreateRequest: {
          type: "object",
          required: ["name", "slug"],
          properties: {
            name: { type: "string", example: "Demo Burger" },
            slug: { type: "string", example: "demo-burger" },
            email: { type: "string", example: "contato@demo.local" },
            status: { type: "string", example: "ACTIVE" }
          }
        },
        ProductCreateRequest: {
          type: "object",
          required: ["categoryId", "name", "basePrice"],
          properties: {
            categoryId: { type: "string" },
            name: { type: "string", example: "Burger Classico" },
            basePrice: { type: "number", example: 29.9 },
            optionGroups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Adicionais" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", example: "Queijo extra" },
                        price: { type: "number", example: 4.5 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        PublicOrderRequest: {
          type: "object",
          required: ["branchId", "type", "customerName", "items"],
          properties: {
            branchId: { type: "string" },
            type: { type: "string", example: "DELIVERY" },
            customerName: { type: "string", example: "Maria Silva" },
            customerPhone: { type: "string", example: "+5511999999999" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  quantity: { type: "integer", example: 2 },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        optionItemId: { type: "string" },
                        quantity: { type: "integer", example: 1 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            details: { nullable: true }
          }
        }
      }
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          responses: {
            "200": { description: "API online" }
          }
        }
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
          },
          responses: {
            "200": { description: "Token JWT e contexto do usuario" },
            "401": { description: "Credenciais invalidas" }
          }
        }
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Usuario autenticado" } }
        }
      },
      "/admin/tenants": {
        get: {
          tags: ["Tenants"],
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista tenants" } }
        },
        post: {
          tags: ["Tenants"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/TenantCreateRequest" } } }
          },
          responses: { "201": { description: "Tenant criado" } }
        }
      },
      "/tenant/menu/categories": {
        get: {
          tags: ["Menu"],
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
          responses: { "200": { description: "Categorias do tenant" } }
        },
        post: {
          tags: ["Menu"],
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
          responses: { "201": { description: "Categoria criada" } }
        }
      },
      "/tenant/menu/products": {
        get: {
          tags: ["Menu"],
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
          responses: { "200": { description: "Produtos do tenant" } }
        },
        post: {
          tags: ["Menu"],
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ProductCreateRequest" } } }
          },
          responses: { "201": { description: "Produto criado" } }
        }
      },
      "/public/{tenantSlug}/menu": {
        get: {
          tags: ["Menu"],
          parameters: [{ name: "tenantSlug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Cardapio publico" } }
        }
      },
      "/public/{tenantSlug}/orders": {
        post: {
          tags: ["Orders"],
          parameters: [{ name: "tenantSlug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/PublicOrderRequest" } } }
          },
          responses: { "201": { description: "Pedido criado" } }
        }
      },
      "/tenant/orders": {
        get: {
          tags: ["Orders"],
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
          responses: { "200": { description: "Pedidos do tenant" } }
        }
      },
      "/tenant/kitchen/orders": {
        get: {
          tags: ["Kitchen"],
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
          responses: { "200": { description: "Fila da cozinha" } }
        }
      },
      "/tenant/reports/summary": {
        get: {
          tags: ["Reports"],
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
          responses: { "200": { description: "Resumo operacional" } }
        }
      },
      "/tenant/audit-logs": {
        get: {
          tags: ["Audit"],
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
          responses: { "200": { description: "Logs de auditoria" } }
        }
      }
    }
  },
  apis: []
});
