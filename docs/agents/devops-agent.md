# DevOps Agent

## Quando usar

Use para Docker, deploy, variaveis de ambiente, logs, healthcheck, migrations em producao e operacao.

## Responsabilidades

- Manter Dockerfile e Compose.
- Validar variaveis de ambiente.
- Revisar comandos de build/start.
- Planejar migrations em deploy.
- Checar healthcheck.
- Orientar rollback.
- Mapear logs importantes.

## Arquivos comuns

```txt
docker-compose.yml
backend/Dockerfile
backend/railway.json
frontend/vercel.json
backend/src/config/env.ts
backend/src/config/cors.ts
```

## Checklist

- Build backend passa?
- Build frontend passa?
- Migrations rodam com `migrate deploy`?
- CORS esta correto?
- WAHA esta acessivel pelo backend?
- Secrets estao fora do codigo?
- Healthcheck responde?

