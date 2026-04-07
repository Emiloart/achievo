# Achievo Monorepo

Achievo is a monorepo for a verifiable program, milestone, validation, and reputation platform.

The product center is not a generic Web3 sandbox. The core loop is:

1. an organization publishes a program
2. the program defines milestones
3. a participant submits evidence
4. a reviewer or validator decides
5. Achievo produces a verifiable outcome
6. that outcome can be exported, shared, and publicly verified

## Repository structure

- `web/` public product app
- `apps/admin/` admin control plane
- `backend/` authoritative off-chain service
- `contracts/` on-chain registries and proof-related contracts
- `packages/` shared ABI, config, and focused reusable modules
- `docs/` authoritative and archived documentation

## Current runtime baseline

- Recommended local Node.js baseline `20.11.1`
- npm `10.x`
- Next.js `14.2.15`
- React `18.3.1`
- NestJS `10.x`
- Prisma `5.22.0`
- Hardhat `3.0.11`

## Local commands

Install:

```bash
npm ci
```

Run:

```bash
npm --prefix backend run dev
npm --prefix web run dev
npm --prefix apps/admin run dev
```

Build:

```bash
npm --prefix backend run build
npm --prefix web run build
npm --prefix apps/admin run build
```

## Stabilization rule

No new domain feature work should land before the active Phase 1 gate is green:

- backend unit
- backend E2E
- one web E2E smoke path
- web build
- admin build

## Documentation

Use [docs/README.md](./docs/README.md) as the entry point.

Historical planning notes, route maps, release notes, and verification logs have been moved under `docs/archive/` and are not authoritative.

