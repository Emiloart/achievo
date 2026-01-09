# Achievo Backend (v1.1)

NestJS + Fastify service that handles auth, identity/profile reads, and off-chain product logic (XP, quests, parties, projects) around the v1.1 contracts.

## Current Features

- Auth: `/auth/nonce`, `/auth/verify`, `/auth/me` (JWT based).
- On-chain reads: `/achievo/tasks/:address`, `/achievo/badges/:address`, `/achievo/profile/:address`.
- Profile: `/profile/me`, `/profile/me` (PUT), `/profile/professional/*`, `/profile/pins/*`, `/share-links/:slug`.
- Identity: username availability/claims, search, and follow graph under `/identity/*`.
- XP + Quests + Streaks: `/quests/me`, `/quests/claim/:id`.
- Parties + Social: `/parties/*`, `/leaderboard/*`.
- Projects + Client Workspaces: `/projects/*`, `/projects/share/:slug`.
- Time tracking + Billing + Invoices: `/projects/:slug/time-entries/*`, `/projects/:slug/billing/settings`, `/projects/:slug/invoices/*`, `/invoices/public/:slug`.
- Proof attachments + anchoring: `/proofs/*`, `/users/:userId/proofs`.
- Validations (attestations): `/validations/*`, `/validators/*`, `/users/:userId/validations`.
- Profile exports: `/exports/profile`, `/exports/:publicId`, `/exports/:publicId/download`, `/users/:userId/exports`.
- Consistency scoring: `/users/:userId/consistency`, `/users/:userId/activity/summary`.
- Legacy v1 reads (projection-backed): `/legacy/v1/*`.

## Base Sepolia Contracts (v1.1)

- AchievoCoreV11: `0x4c3397505Ebc1d517237B5336610951e42209656`
- AchievoBadgeV11: `0x13Dd9D0DF3b84A70D7E0CE449aDEBFb308215aC7`
- AchievoIdentity: `0x5BE61bF52AE08790355232F7114f4DBD2dd0848d`
- AchievoUsernameRegistryV1: `0x386CddDf734008f836437dE968D275f702565437`

## Requirements

- Node.js 20+
- PostgreSQL
- Base Sepolia RPC URL

## Environment Variables

Copy `.env.example` to `.env` and edit as needed:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/achievo
JWT_SECRET=replace-with-long-random-string
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# request + abuse controls (optional)
REQUEST_BODY_LIMIT_MB=2
LOG_LEVEL=info
METRICS_ENABLED=false
THROTTLE_TTL=60
THROTTLE_LIMIT=120
THROTTLE_AUTH_TTL=60
THROTTLE_AUTH_LIMIT=20

# v1.1 contract addresses (required)
NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS=0x4c3397505Ebc1d517237B5336610951e42209656
NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS=0x13Dd9D0DF3b84A70D7E0CE449aDEBFb308215aC7
NEXT_PUBLIC_IDENTITY_ADDRESS=0x5BE61bF52AE08790355232F7114f4DBD2dd0848d
ACHIEVO_USERNAME_REGISTRY_ADDRESS=0x386CddDf734008f836437dE968D275f702565437

# optional / advanced
ACHIEVO_USERNAME_OPERATOR_PRIVATE_KEY=0x...
VERIFIER_PK=0x...
PINATA_JWT=
WEB3_STORAGE_TOKEN=
PROOF_STORAGE_DRIVER=LOCAL
PROOF_LOCAL_DIR=storage/proofs
PROOF_MAX_SIZE_MB=10
AUTO_ANCHOR_PROOFS=false

# anchoring registry (optional, shared)
ANCHORING_ENABLED=false
ANCHOR_CHAIN_ID=84532
ANCHOR_RPC_URL=https://sepolia.base.org
ANCHOR_OPERATOR_PRIVATE_KEY=0x...
ANCHOR_REGISTRY_ADDRESS=0x...
ANCHOR_BATCH_SIZE=25
ANCHOR_QUEUE_ENABLED=true

# legacy per-feature anchors (deprecated)
PROOF_ANCHOR_ENABLED=false
PROOF_ANCHOR_CHAIN_ID=84532
PROOF_ANCHOR_OPERATOR_PRIVATE_KEY=0x...
PROOF_ANCHOR_CONTRACT_ADDRESS=0x...
VALIDATION_ANCHOR_ENABLED=false
VALIDATION_ANCHOR_OPERATOR_PRIVATE_KEY=0x...
VALIDATION_ANCHOR_CONTRACT_ADDRESS=0x...
PROFILE_EXPORT_ANCHOR_ENABLED=false
PROFILE_EXPORT_ANCHOR_OPERATOR_PRIVATE_KEY=0x...
PROFILE_EXPORT_ANCHOR_CONTRACT_ADDRESS=0x...
ORG_SUBMISSION_ANCHOR_ENABLED=false
ORG_SUBMISSION_ANCHOR_CHAIN_ID=84532
ORG_SUBMISSION_ANCHOR_OPERATOR_PRIVATE_KEY=0x...
ORG_SUBMISSION_ANCHOR_CONTRACT_ADDRESS=0x...
# org registry gating (optional)
ORG_CREATE_REQUIRED=true
ORG_CREATE_CHAIN_ID=84532
ORG_CREATE_RPC_URL=https://sepolia.base.org
ORG_REGISTRY_ADDRESS=0x...
ORG_TREASURY=0x...
# S3 optional
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
VALIDATION_EIP712_CHAIN_ID=84532
VALIDATION_EIP712_DOMAIN_NAME=Achievo
VALIDATION_EIP712_DOMAIN_VERSION=1
VALIDATION_PUBLIC_READ=true

# profile exports (optional)
PROFILE_EXPORT_SIGNER_PRIVATE_KEY=0x...
PROFILE_EXPORT_SIGNER_ADDRESS=0x...
PROFILE_EXPORT_CHAIN_ID=84532
PROFILE_EXPORT_DOMAIN=AchievoProfileExport
PROFILE_EXPORT_SIGNING_MODE=EIP191
PROFILE_EXPORT_STORAGE_DRIVER=LOCAL
PROFILE_EXPORT_LOCAL_DIR=storage/exports
PROFILE_EXPORT_PUBLIC_BASE_URL=http://localhost:3000

# verification portal (optional)
VERIFY_PORTAL_ENABLED=true
VERIFY_CHAIN_RPC_URL=https://sepolia.base.org
VERIFY_CHAIN_ID=84532
VERIFY_ANCHOR_REGISTRY_ADDRESS=0x...
VERIFY_PROOF_ANCHOR_CONTRACT=0x...
VERIFY_PROFILE_EXPORT_SIGNER_ADDRESS=0x...
VERIFY_STRICT_MODE=false

# indexer (optional)
INDEXER_ENABLED=false
INDEXER_CHAIN_ID=84532
INDEXER_RPC_URL=https://sepolia.base.org
INDEXER_FINALITY_DEPTH=20
INDEXER_START_BLOCK=0
INDEXER_BATCH_SIZE=2000

# chain actions + confirmations (optional)
CHAIN_ACTIONS_ENABLED=true
CHAIN_ACTIONS_WORKER_ENABLED=false
CHAIN_ACTIONS_POLL_INTERVAL_MS=30000
CHAIN_CONFIRMATIONS_REQUIRED=20
CHAIN_ACTIONS_RPC_URL=https://sepolia.base.org

# health thresholds (optional)
HEALTH_INDEXER_LAG_WARN_BLOCKS=200
HEALTH_INDEXER_LAG_FAIL_BLOCKS=2000
HEALTH_CHAIN_LATENCY_WARN_MS=1500
HEALTH_CHAIN_LATENCY_FAIL_MS=5000
HEALTH_PENDING_CHAIN_ACTIONS_WARN=50
HEALTH_PENDING_CHAIN_ACTIONS_FAIL=500
HEALTH_STUCK_ACTION_AGE_MINUTES=20

# rpc reliability (optional)
RPC_MAX_RETRIES=3
RPC_BACKOFF_BASE_MS=200
RPC_BACKOFF_MAX_MS=5000
RPC_CB_FAILURE_THRESHOLD=5
RPC_CB_COOLDOWN_MS=15000

# admin security + ops (optional)
ADMIN_API_KEY=
ADMIN_HMAC_SECRET=
ADMIN_TS_SKEW_SECONDS=120
ADMIN_INDEXER_MAX_RANGE=20000
ADMIN_REBUILD_BATCH_SIZE=2000
THROTTLE_SENSITIVE_TTL=60
THROTTLE_SENSITIVE_LIMIT=30
THROTTLE_ADMIN_TTL=60
THROTTLE_ADMIN_LIMIT=30
SLOW_REQUEST_WARN_MS=1500

# monitoring + config strictness (optional)
MONITORING_ENABLED=false
MONITORING_INTERVAL_MS=60000
MONITORING_DEDUPE_MINUTES=5
CONFIG_STRICT=false
DEPLOYMENT_COMPAT_CHECK_ENABLED=false
DEPLOYMENTS_HASH_BASE_SEPOLIA=

# governance sanity checks (optional)
GOVERNANCE_SANITY_CHECK_ENABLED=false
GOVERNANCE_STRICT=false
PORT=4000
```

## Install & Run

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

For production builds:

```bash
npm run build
npm start
```

## E2E Smoke Harness

```bash
npm run test:e2e
```

- Spins up a deterministic local chain (anvil or hardhat), deploys E2E contracts, and boots the backend over HTTP.
- Uses an isolated Postgres schema derived from `DATABASE_URL`.
- Optional helpers: `npm run e2e:setup` and `npm run e2e:teardown`.
- `E2E_RPC_FAIL_MODE=true` forces RPC failures for verification fallback tests (test-only).

## Observability

- Logs: structured JSON lines include `requestId` (also returned as `x-request-id`).
- Metrics: enable with `METRICS_ENABLED=true`; `GET /metrics` requires admin auth.
- Log level: set `LOG_LEVEL=info|warn|error|debug|verbose`.

## Org Creation (On-Chain Fee Gate)

- Call `POST /orgs/prepare` to fetch the registry address, fee, and handle rules.
- Submit `createOrg(handle)` on the Base Sepolia `AchievoOrgRegistry`.
- Call `POST /orgs` with `creationTxHash` once the transaction is confirmed.
- Set `ORG_CREATE_REQUIRED=true` to enforce on-chain verification.

## On-Chain Confirmations (Chain Actions)

- Org creation and anchor writes create `ChainActionReceipt` rows.
- Confirmations are tracked by a worker using block confirmations or the indexer finality cursor.
- Reorged transactions are marked `DROPPED_REORG` and related entities are updated.
- Enable with `CHAIN_ACTIONS_ENABLED=true` and `CHAIN_ACTIONS_WORKER_ENABLED=true`.

## Indexer (Legacy v1 Support)

- Enable with `INDEXER_ENABLED=true` (runs inside the API process).
- Uses `INDEXER_FINALITY_DEPTH` to stay reorg-safe; reorgs trigger projection rebuilds.
- Backfill from `INDEXER_START_BLOCK`.
- Projections back legacy v1 endpoints and avoid defaulting unknown fields.

## Anchoring

- Enable anchoring with `ANCHORING_ENABLED=true`.
- Provide `ANCHOR_OPERATOR_PRIVATE_KEY` and `ANCHOR_REGISTRY_ADDRESS`.
- Queue is enabled by default (`ANCHOR_QUEUE_ENABLED=true`).
- Set `AUTO_ANCHOR_PROOFS=true` to auto-enqueue proof anchors.

## Health & Monitoring

- `GET /health` for liveness.
- `GET /health/chain` for RPC reachability and latency.
- `GET /health/indexer` for cursor lag and finality.
- `GET /health/anchoring` for registry reachability and backlog.
- `OperationalAlert` records are written when monitoring is enabled.

## Admin Ops

- All `/admin/*` endpoints require `ADMIN_API_KEY` + HMAC signatures.
- Generate headers with `node scripts/sign-admin-request.js`.
- Endpoints:
  - `POST /admin/chain-actions/:id/retry`
  - `POST /admin/chain-actions/replay`
  - `POST /admin/indexer/backfill`
  - `POST /admin/indexer/rebuild-projections`
  - `POST /admin/orgs/:orgId/reverify-tx`
  - `POST /admin/anchors/:entityType/:entityId/retry`
  - `GET /admin/alerts`

### Ops Runbook (quick)

- Org confirmations stuck: retry chain action and reverify org tx.
- Indexer lagging: backfill range, then rebuild projections from indexer start if needed.
- Anchor backlog: retry entity anchors and check `/health/anchoring`.

## Governance Sanity Checks

- Enable `GOVERNANCE_SANITY_CHECK_ENABLED=true` to verify registry admin roles on startup.
- Set `GOVERNANCE_STRICT=true` to fail startup when on-chain roles mismatch the configured timelock.

## Admin Diagnostics

- `GET /admin/chain-actions` (use `x-admin-key` or `x-admin-api-key` header).
- `GET /admin/chain-actions/:id` for a specific receipt row.

## Project Structure

```
backend/
  src/
    app.module.ts         # global config + module wiring
    main.ts               # bootstrap Fastify adapter
    auth/                 # auth controller/service + JWT guard
    blockchain/           # v1.1 on-chain services (core, badge, identity)
    profile/              # profile + professional profile + share links
    identity/             # username, search, follow graph
    usernames/            # username registry + orderbook
    quests/               # quests, streaks, XP logic
    parties/              # parties, feeds, leaderboards
    social/               # follow graph + activity feeds
    leaderboard/          # XP + streak leaderboards
    projects/             # projects + client share links
    proofs/               # proof attachments + anchoring
    validations/          # validator profiles + signed attestations
    profile-exports/      # exportable profiles (JSON/JSON-LD/PDF)
    consistency/          # activity events + reliability scoring
    prisma/               # Prisma service wrapper
  prisma/schema.prisma    # DB models and migrations
```

## Notes

- Contract addresses are sourced from `packages/achievo-config`.
- The backend expects v1.1 addresses via `NEXT_PUBLIC_ACHIEVO_*` env vars for consistency with the frontend.
