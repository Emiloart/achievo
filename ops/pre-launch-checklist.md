# Pre-Launch Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Database migrations applied (`npx --prefix backend prisma migrate deploy`)
- [ ] `.env` values set (JWT_SECRET, DATABASE_URL, RPC_URL, contract addresses)
- [ ] Anchoring envs reviewed and optional features explicitly enabled/disabled
- [ ] `/health` returns OK
- [ ] `/ready` returns OK
- [ ] `BASE_URL=... npm run smoke:test` passes
- [ ] `/metrics` available and scraping configured
- [ ] Backup/restore procedure verified
