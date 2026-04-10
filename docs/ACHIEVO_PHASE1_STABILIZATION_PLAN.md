# Achievo Phase 1 Stabilization Plan

## Status

This document defines the implementation plan for Phase 1 stabilization.

It is an execution document, not a strategy note.

Phase 1 is a single stabilization stream with three sequential workstreams:

1. admin trust boundary
2. proofs domain
3. backend source integrity and schema-test alignment

No new domain features should be started until the Phase 1 exit gate is green.

## Governing Documents

This plan is subordinate to:

- `AGENTS.md`
- `docs/ACHIEVO_V1_RECOVERY_SCOPE_LOCK.md`

If implementation choices conflict with those documents, those documents win.

## Phase 1 Objective

Make Achievo safe to continue upgrading by restoring trust boundaries, completing the missing proofs core, and re-establishing backend/runtime/test confidence.

Phase 1 is complete only when the repo can support focused product work on the v1 core without contradictory security behavior, stubbed core proof flows, or unreliable backend test/runtime behavior.

## Current Continuation Point

- `main` already contains the root `AGENTS.md`, v1-aligned root docs, and the baseline server-mediated admin boundary.
- Workstream 1 remains open for verification, regression coverage, and residual hardening.
- The next highest-value implementation continuation point is Workstream 2: Proofs domain.
- Public IA cleanup that removes product drift without expanding scope is allowed when it reinforces the v1 product center.

## Working Rules

- This is a single stabilization stream. Do not run parallel feature work against the same problem space.
- No new top-level domain features are allowed during Phase 1.
- Product changes should be limited to what is necessary to restore the core v1 workflow.
- Docs must be updated when implementation truth changes.
- If an acceptance criterion cannot be met, the workstream is not complete.

## Release Gate During Phase 1

No new domain feature work may begin until all of the following are green on the intended branch baseline:

- `npm --prefix backend run test:unit`
- `npm --prefix backend run test:e2e`
- one web E2E smoke path for the v1 golden path
- `npm --prefix web run build`
- `npm --prefix apps/admin run build`

If any of these are red, stabilization remains the priority.

## Workstream Order

1. Admin trust boundary
2. Proofs domain
3. Backend source integrity and schema-test alignment

This order is mandatory for Phase 1.

Reasoning:

- the admin browser/backend trust boundary baseline has landed, but still needs verification and hardening to stay trustworthy
- proofs are still a core-domain hole rather than a polish gap
- backend source integrity and runtime/test alignment are structural blockers to confident progress

## Workstream 1: Admin Trust Boundary

### Goal

Make the admin app use one coherent browser-to-server trust model.

The browser should communicate with the Next.js admin server routes under `/api/admin/*`, and the server layer should own backend token exchange, CSRF enforcement, and session refresh behavior.

### Current problems

- the core browser-to-server boundary has landed, but it still needs explicit regression coverage
- admin browser traffic must remain locked to `/api/admin/*` as new console features are added
- logout, refresh rotation, CSRF enforcement, and audit behavior need to stay explicit rather than being assumed from code inspection
- the checklist and route-layer implementation must continue to match exactly as the admin surface evolves

### Primary file targets

- `apps/admin/lib/adminApi.ts`
- `apps/admin/components/auth/AdminSessionProvider.tsx`
- `apps/admin/lib/server/adminSession.ts`
- `apps/admin/lib/server/backendAdminAuth.ts`
- `apps/admin/lib/server/adminGateway.ts`
- `apps/admin/lib/server/adminCsrf.ts`
- `apps/admin/app/api/admin/login/route.ts`
- `apps/admin/app/api/admin/refresh/route.ts`
- `apps/admin/app/api/admin/logout/route.ts`
- `apps/admin/app/api/admin/me/route.ts`
- `apps/admin/app/api/admin/[...path]/route.ts`
- `docs/ADMIN_SECURITY_CHECKLIST.md`

### Work buckets

#### 1.1 Browser API normalization

- Keep admin client requests targeting `/api/admin/*` by default.
- Prevent regressions that would reintroduce direct-browser backend origin dependence.
- Preserve server-side backend URL configuration inside the Next.js server layer only.

#### 1.2 Session model unification

- Keep the browser session model dependent on the admin console session, not backend cookies.
- Ensure client state continues to hydrate through `/api/admin/me` and `/api/admin/refresh`.
- Cover the session contract with targeted tests rather than relying on manual inspection.

#### 1.3 CSRF and refresh contract cleanup

- Keep CSRF tokens scoped to server-mediated admin mutations.
- Ensure refresh rotation happens through admin server routes.
- Verify logout clears the effective admin console session and leaves no ambiguous client state.

#### 1.4 Documentation correction

- Update the admin security checklist to match the implemented boundary exactly.
- Document any remaining backend token bridge behavior as server-only implementation detail.

### Acceptance criteria

- No browser admin request depends on a direct backend origin by default.
- `apps/admin/lib/adminApi.ts` uses `/api/admin` as its default API base.
- `apps/admin/components/auth/AdminSessionProvider.tsx` no longer checks backend auth cookies directly.
- Admin login, refresh, logout, and `me` flows succeed through the Next.js admin API layer.
- Admin mutations still require CSRF and preserve auditability.
- `docs/ADMIN_SECURITY_CHECKLIST.md` matches code reality.
- `npm --prefix apps/admin run build` passes after the change.

## Workstream 2: Proofs Domain

### Goal

Replace the current proof stubs with a working, minimal, end-to-end proofs implementation that supports the v1 credential workflow.

### Current problems

- `backend/src/proofs/proofs.service.ts` throws `NotImplementedException` for all core proof operations
- `backend/src/proofs/proofs.controller.ts` exposes routes that appear supported
- `backend/test/integration/auth-proof-flow.spec.ts` expects proof creation and retrieval to work
- proof file storage and hashing support exist, but the domain service is not wired into a complete lifecycle

### Primary file targets

- `backend/src/proofs/proofs.service.ts`
- `backend/src/proofs/proofs.controller.ts`
- `backend/src/proofs/proofs.module.ts`
- `backend/src/proofs/dto.ts`
- `backend/src/proofs/storage.service.ts`
- `backend/src/proofs/proofHash.service.ts`
- `backend/src/proofs/proofAnchor.service.ts`
- `backend/src/verify/verify.service.ts`
- `backend/src/verify/verify.controller.ts`
- `backend/test/integration/auth-proof-flow.spec.ts`
- targeted proof-related E2E coverage where appropriate

### Work buckets

#### 2.1 Minimal proof lifecycle definition

Implement the minimal supported proof lifecycle for v1:

- create URL proof
- create file proof
- retrieve owner proof
- retrieve viewer-safe proof
- download proof file when authorized
- list proofs with coherent filtering
- request proof anchoring when allowed

#### 2.2 Ownership and visibility rules

- Enforce owner-only reads where required.
- Support viewer access only when a proof is intentionally public or token-authorized.
- Ensure file access obeys backend privacy rules rather than UI assumptions.

#### 2.3 Proof persistence and artifact shape

- Define the stored proof record shape used by controllers and verify surfaces.
- Wire file storage, hashing, metadata, and anchor-request state into one coherent service flow.
- Avoid speculative fields or future-only abstractions during this pass.

#### 2.4 Verification and regression coverage

- Make the existing proof integration path truthful.
- Add or tighten targeted tests for the supported proof lifecycle.
- Ensure verification-facing code can distinguish valid proof state from missing or unavailable proof state.

### Acceptance criteria

- `backend/src/proofs/proofs.service.ts` no longer contains `NotImplementedException` for supported proof operations.
- URL proof creation succeeds for an authenticated user.
- File proof creation succeeds for an authenticated user using the configured local storage path.
- Owner proof retrieval returns the created proof.
- Proof file retrieval enforces authorization and returns stored content when allowed.
- Proof listing returns deterministic results for supported filters.
- Proof anchoring requests create the expected off-chain request state or documented queue state.
- `backend/test/integration/auth-proof-flow.spec.ts` passes without relying on stub behavior.
- Proof-related verification reads fail safely with clear categories.

## Workstream 3: Backend Source Integrity and Schema-Test Alignment

### Goal

Restore backend maintainability and re-establish confidence that schema, runtime, and tests agree with one another.

### Current problems

- `backend/src` contains a large set of transpiled-looking files under `// @ts-nocheck`
- there are 58 `@ts-nocheck` backend source files out of 196 files under `backend/src`
- root linting does not include backend linting
- backend E2E currently fails before confidence can be drawn from it
- `backend/test/e2e/adminGateway.e2e.spec.ts` contains a compile-time type issue
- `backend/test/e2e/utils/startBackend.ts` boots many workers and chain/infrastructure flags during test startup
- Prisma schema and migrations define `AnchorJob` and `ChainActionReceipt`, but the E2E runtime has still failed with those tables unavailable, which indicates migration application or runtime alignment problems rather than simple schema absence

### Primary file targets

- `backend/src/app.module.ts`
- `backend/src/profile/profile.controller.ts`
- `backend/src/projects/projects.service.ts`
- `backend/src/achievo/achievo.controller.ts`
- other `backend/src/**` files currently carrying `@ts-nocheck` in the active Phase 1 path
- `backend/package.json`
- `package.json`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `backend/test/e2e/adminGateway.e2e.spec.ts`
- `backend/test/e2e/utils/startBackend.ts`
- `backend/test/e2e/utils/harness.ts`
- `backend/test/e2e/utils/testDb.ts`
- `backend/test/e2e/utils/runtime.ts`
- proof- and admin-related integration/e2e specs touched by the stabilization work
- `docs/TESTING.md`
- `docs/CI_LOCAL_VERIFICATION.md` where necessary

### Work buckets

#### 3.1 Source truth restoration

- Stop building Phase 1 changes on top of generated-looking backend source where possible.
- Convert the active Phase 1 backend path from transpiled-looking `@ts-nocheck` files toward normal TypeScript source.
- Prioritize modules directly touched by admin, proofs, verification, and test harness behavior.

#### 3.2 Backend lint/test contract repair

- Add a backend lint script or equivalent narrow static gate suitable for Phase 1.
- Make the root verification contract reflect backend checks rather than skipping them.
- Keep this scoped to confidence recovery, not cosmetic churn.

#### 3.3 E2E harness stabilization

- Fix the `set-cookie` typing issue in `backend/test/e2e/adminGateway.e2e.spec.ts`.
- Audit test boot flags in `backend/test/e2e/utils/startBackend.ts` and disable non-essential workers for baseline E2E startup when they are not part of the scenario under test.
- Reduce hidden coupling between E2E boot and chain/indexer/anchoring/worker subsystems unless explicitly required by the specific suite.

#### 3.4 Schema and migration runtime alignment

- Verify the E2E database setup actually applies the migrations that define `AnchorJob` and `ChainActionReceipt`.
- Fix any test DB reset, migration, or bootstrap logic that leaves runtime tables missing.
- Ensure E2E runtime startup does not assume tables or workers before the database is in the expected state.

#### 3.5 Documentation and verification truth

- Update testing documentation to match the real commands and prerequisites.
- Remove or correct any runbook language that implies green paths which are not actually green.

### Acceptance criteria

- The active Phase 1 backend path no longer depends on `@ts-nocheck` source for newly stabilized admin/proof/test-harness work.
- `backend/test/e2e/adminGateway.e2e.spec.ts` compiles and runs.
- The E2E harness starts the backend without timing out in the baseline admin/proof path.
- The E2E database contains the tables required by the enabled workers and routes for the exercised suites.
- `npm --prefix backend run test:unit` passes.
- `npm --prefix backend run test:e2e` passes.
- Backend testing docs reflect actual commands and setup.

## Exit Gate for Phase 1

Phase 1 exits only when all of the following are true:

- admin trust boundary is coherent in code and docs
- proofs support the minimal v1 lifecycle end to end
- backend source and E2E/runtime alignment are restored for the active Phase 1 path
- `npm --prefix backend run test:unit` is green
- `npm --prefix backend run test:e2e` is green
- one web E2E smoke path covering the v1 golden path is green
- `npm --prefix web run build` is green
- `npm --prefix apps/admin run build` is green
- no new domain feature work has been merged as a substitute for stabilization

## Non-Goals for Phase 1

The following are explicitly out of scope for this phase unless they are required to satisfy the acceptance criteria above:

- new product modules
- new chains or chain abstractions
- major framework migrations
- broad design refreshes
- marketplace expansion
- parties or social layer expansion
- goals redesign beyond what is strictly necessary to avoid blocking the v1 path
- speculative schema work for future ideas

## Delivery Expectation

Each workstream should close with:

- implementation changes
- updated docs where applicable
- explicit verification results
- a short note on remaining risks before the next workstream starts

Do not start the next workstream on assumed progress. Start it only after the current one meets its acceptance criteria or its blocker is explicitly documented.
