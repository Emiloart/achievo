# Release Checklist

## Pre-Release
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Review `.env` (JWT_SECRET, DATABASE_URL, RPC_URL, contract addresses)
- [ ] Confirm `DOCS_ENABLED` and `METRICS_ENABLED` are set correctly for the environment
- [ ] Confirm `ORG_CREATE_REQUIRED` and registry addresses are correct
- [ ] Verify admin credentials configured (`ADMIN_API_KEY`, `ADMIN_HMAC_SECRET`)

## Migration
- [ ] Back up database
- [ ] Run migrations: `npx --prefix backend prisma migrate deploy`
- [ ] Verify migrations are applied successfully

## Deployment
- [ ] Deploy backend + web
- [ ] Run smoke test against target: `BASE_URL=https://api.example.com npm run smoke:test`
- [ ] Confirm `/ready` returns ok
- [ ] Confirm `/openapi.json` is reachable

## Post-Release Monitoring
- [ ] Watch logs for error spikes and elevated latency
- [ ] Monitor `/health` and `/health/indexer`
- [ ] Monitor chain actions backlog and anchor queue

## Rollback Plan
- [ ] Roll back application deploy
- [ ] Revert DB migration only if necessary and safe
- [ ] Confirm smoke test passes on rollback

## Staged Rollout
- [ ] Deploy to staging, run smoke test
- [ ] Deploy to production (canary or phased), watch key metrics
