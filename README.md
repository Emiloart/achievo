# Achievo Monorepo

Achievo contains Solidity contracts, a NestJS backend, and a Next.js frontend.

## Requirements

- Node.js 20.x (see `.nvmrc`)
- PostgreSQL (for backend)

## Setup

```bash
npm ci
npm ci --prefix backend
npm ci --prefix web
```

Create backend env:

```bash
cp backend/.env.example backend/.env
```

## Local Development

Backend:

```bash
npm --prefix backend run dev
```

Frontend:

```bash
npm --prefix web run dev
```

Contracts:

```bash
npm run compile
npm run test:contracts
```

## Repo Commands (local + CI)

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run format
```

CI runs the same sequence: install -> lint -> typecheck -> test -> build.

## Commit Standards

This repository enforces Conventional Commits to keep history consistent and auditable.

Format:

```
<type>(optional scope): <description>
```

Types: feat, fix, refactor, chore, docs, test, build, ci, perf, revert

Commits that fail formatting, linting, or secret scanning are rejected by pre-commit hooks.

## API Contracts

- OpenAPI spec: `GET /openapi.json`
- Swagger UI: `GET /docs` when `DOCS_ENABLED=true`
- API versioning: optional `x-api-version` header (default `1`)

Integration tests:

```bash
npm run test:integration
```

Note: integration tests require `DATABASE_URL` to point to a test Postgres database.

E2E tests:

```bash
npm run test:e2e
```

Notes:
- E2E spins up a deterministic local chain (anvil if available, otherwise hardhat node).
- Contracts are deployed to `contracts/deployments/local/e2e.json`.
- Requires `DATABASE_URL` pointing to a local Postgres instance; the harness creates an isolated schema.

Optional nightly Base Sepolia smoke runs in CI when `BASE_SEPOLIA_SMOKE_ENABLED=true` and a `BASE_SEPOLIA_RPC_URL` secret is provided.

## Governance & Deployments

- `npm run deploy:governance:base-sepolia` deploys `TimelockController` with a multisig proposer/executor.
- `npm run deploy:org-registry:base-sepolia` deploys the org registry (fee gate + treasury).
- `npm run deploy:v11:base-sepolia` deploys Core + Badge (v1.2) and wires mint permissions.
- Set contract admins/owners to the timelock; propose changes via multisig.
- Deployment artifacts are written to `deployments/base-sepolia/*.json` and used by the backend when env vars are not set.

## On-Chain Confirmations

- Backend records org creation + anchoring txs as chain actions and confirms via finality depth.
- Org creation flow: `POST /orgs/prepare` → wallet signs `createOrg(handle)` → wait 1+ confirmations → `POST /orgs` with `creationTxHash`.
- Admin diagnostics endpoint: `GET /admin/chain-actions` (secured with `ADMIN_API_KEY`).

Org creation envs:
- `ORG_CREATE_REQUIRED=true|false`
- `ORG_CREATE_CHAIN_ID=84532`
- `ORG_REGISTRY_ADDRESS=0x...` (or deployment artifact)

## Auth (Sign Once)

- Wallet signing is only required to start a session (login) or sign marketplace orders.
- Backend issues short-lived access + long-lived refresh tokens via httpOnly cookies.
- Refresh rotates tokens and revokes old sessions; CSRF protection uses `ach_csrf` cookie + `x-ach-csrf` header.
- Frontend uses `/auth/me` + `/auth/refresh` on boot; navigation never triggers wallet signing.

## Username Marketplace (Signed Orders + Finality)

- Orders are EIP-712 signed by makers and stored off-chain with full audit data (typed data, signature, recovered signer).
- Settlement modes:
  - `USERNAME_SETTLEMENT_MODE=OPERATOR` (backend submits transfer when operator is configured).
  - `USERNAME_SETTLEMENT_MODE=SELLER_TX` (seller submits tx; backend verifies receipt).
- Every transfer is tracked via `ChainActionReceipt` with reorg-aware confirmation.
- Availability checks use chain or projections depending on indexer lag.

Troubleshooting: You should only be asked to sign again when your session expires or when creating/canceling orders.

## Ops & Reliability

- Health endpoints: `GET /health`, `/health/chain`, `/health/indexer`, `/health/anchoring`.
- Readiness endpoint: `GET /ready` (checks DB + required RPCs).
- Admin tools require HMAC-signed requests (see `backend/scripts/sign-admin-request.js`).

## Observability (backend)

- Logs: structured JSON with `requestId` and `x-request-id` response header.
- Metrics: `GET /metrics` is disabled unless `METRICS_ENABLED=true`; expose only on trusted networks.

## Ops & Runbooks

See `ops/` for runbooks, outage handling, and the pre-launch checklist.

## Smoke Test

```bash
BASE_URL=http://127.0.0.1:4000 npm run smoke:test
```
