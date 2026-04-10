# Architecture

## Product shape

Achievo is a verifiable program, milestone, validation, and reputation system.

The dominant product loop is:

1. an organization exists
2. the organization publishes a program
3. the program defines milestones
4. a participant submits evidence
5. a reviewer or validator decides
6. Achievo produces a verifiable outcome
7. that outcome can be exported, shared, and publicly verified

## System layers

### `web/`

Public product surface for participants, organizations, validators, verification, and exports.

### `apps/admin/`

Operator control plane for admin workflows, system health, chain actions, anchoring, indexer state, policy, and auditability.

### `backend/`

Authoritative off-chain service for auth, org/program/submission lifecycle, proofs, validations, exports, privacy rules, and admin coordination.

### `contracts/`

On-chain registries and proof-related contract logic only where public verifiability or ownership materially benefits from being on chain.

### `packages/`

Shared configuration, ABI, and focused reusable modules. Shared packages should exist only when they remove real duplication.

## Trust boundaries

- Browser clients must not hold server-only admin secrets.
- Admin browser traffic should terminate at the admin server boundary before backend access.
- Backend is the enforcement layer for permissions, privacy, and lifecycle state.
- On-chain logic should remain limited to registry, ownership, and verifiable anchoring concerns.

## Current runtime baseline

- Recommended local Node.js baseline `20.11.1`
- Next.js `14.2.15`
- React `18.3.1`
- NestJS `10.x`
- Prisma `5.22.0`
- Hardhat `3.3.0`

These versions are the current operating baseline, not an upgrade target. Major upgrades remain gated by the Phase 1 stabilization plan.

## Source of truth

When architectural guidance conflicts, use this order:

1. `AGENTS.md`
2. `docs/ACHIEVO_V1_RECOVERY_SCOPE_LOCK.md`
3. `docs/ACHIEVO_PHASE1_STABILIZATION_PLAN.md`
4. current code
5. archived docs only when still consistent with the above
