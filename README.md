# FLOWFIRE ARENA

MVP independente em modo de teste. Landing page com cadastro **somente local no navegador** (sem persistência), healthcheck e cliente Vortex para consultar saldo por rota administrativa protegida. **Nenhuma sala é criada automaticamente nesta versão.** Sem Pix, apostas ou pagamentos reais.

## Executar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `VORTEX_TOKEN` e um `ADMIN_API_KEY` forte no `.env.local`. Nunca publique segredos.

- `GET /api/health` — healthcheck público.
- `GET /api/vortex/balance` — exige header `x-admin-key` igual ao segredo `ADMIN_API_KEY`; consulta Vortex no servidor.

Exemplo local:

```bash
curl -H 'x-admin-key: SEU_ADMIN_API_KEY' http://localhost:3000/api/vortex/balance
```

## Próximas fases

1. Persistência PostgreSQL, autenticação e modelo de equipes/partidas.
2. Adaptador Vortex: criar, consultar membros, iniciar, consultar resultado e liberar sessão; idempotência, backoff e logs.
3. Pareamento e painel administrativo, testes end-to-end com salas reais.
4. Avaliação jurídica antes de qualquer funcionalidade financeira.

Não há validação de produção da API Vortex neste repositório.
