# Operations

## Runtime prerequisites

- Recommended local Node.js baseline `20.11.1`
- npm `10.x`
- Docker Desktop for self-contained integration tests
- local Postgres only when running non-docker database flows
- local EVM chain tooling for contract and backend E2E work

## Local development

### Install

```bash
npm ci
```

### Run the main apps

```bash
npm --prefix backend run dev
npm --prefix web run dev
npm --prefix apps/admin run dev
```

## Phase 1 gate

No new domain features should be merged until these are green on the active baseline:

- backend unit tests
- backend E2E
- one web E2E smoke path
- web build
- admin build

## Dependency upgrade gate

Major framework or runtime upgrades are blocked until the Phase 1 stabilization gate is satisfied.

That includes upgrades centered on:

- Next.js
- React
- NestJS
- Prisma
- Tailwind CSS
- wagmi and viem
- TypeScript runtime assumptions

## Branch discipline

Use one cleanup or stabilization objective per branch.

Recommended branch pattern:

- `cleanup/*`
- `stabilization/*`
- `docs/*`

Avoid mixed PRs that combine feature work, dependency churn, doc cleanup, and infrastructure changes.

