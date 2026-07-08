# Frontend Agent

## Quando usar

Use para telas React, rotas, layouts, services, providers, estados, forms e integracao com API.

## Responsabilidades

- Criar ou ajustar paginas.
- Usar services para chamadas HTTP.
- Manter tipos atualizados.
- Tratar loading, erro e vazio.
- Usar permissao correta em `ProtectedRoute`.
- Preservar responsividade.
- Manter UX consistente por area.

## Arquivos comuns

```txt
frontend/src/routes/
frontend/src/pages/
frontend/src/components/
frontend/src/services/
frontend/src/app/providers/
frontend/src/types/
frontend/src/utils/
```

## Checklist

- A pagina consome service em vez de fetch direto?
- O mapper converte numeros/decimals?
- O cache React Query e invalidado?
- Ha estado de loading e erro?
- A rota publica preserva `tenantSlug`?
- A rota protegida exige permissao certa?
- A UI funciona em mobile e desktop?

