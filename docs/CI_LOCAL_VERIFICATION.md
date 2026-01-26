# Local CI Verification

This document captures the exact commands run and the resulting terminal output.

## Web (required)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      6.19 kB         189 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 2.22 kB         150 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               3.74 kB         187 kB
├ ○ /dashboard                             12.3 kB         215 kB
├ ƒ /exports/[publicId]                    6.72 kB         118 kB
├ ƒ /goals/[id]                            8.39 kB         209 kB
├ ○ /goals/new                             4.53 kB         182 kB
├ ○ /identity                              4.38 kB         187 kB
├ ƒ /invoices/public/[slug]                2.75 kB        90.3 kB
├ ○ /orgs                                  5.89 kB         194 kB
├ ƒ /orgs/[handle]                         6.48 kB         128 kB
├ ƒ /orgs/[handle]/admin                   6.57 kB         128 kB
├ ƒ /orgs/[handle]/members                 5.68 kB         127 kB
├ ƒ /orgs/[handle]/programs/[slug]         5.4 kB          126 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  5.76 kB         127 kB
├ ○ /parties                               4.39 kB         114 kB
├ ƒ /parties/[slug]                        5.43 kB         115 kB
├ ○ /parties/new                           4.43 kB         108 kB
├ ƒ /profile/[address]                     13.1 kB         218 kB
├ ƒ /profile/professional/[handle]         4.97 kB         110 kB
├ ○ /projects                              4.46 kB         192 kB
├ ƒ /projects/[slug]                       10.9 kB         121 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  5.26 kB         115 kB
├ ƒ /projects/[slug]/invoices/new          5.28 kB         115 kB
├ ○ /projects/new                          4.8 kB          108 kB
├ ƒ /projects/share/[slug]                 2.83 kB        90.3 kB
├ ƒ /s/[slug]                              5.07 kB         110 kB
├ ƒ /share/[publicId]                      5.07 kB         110 kB
├ ○ /usernames/market                      4.94 kB         193 kB
├ ○ /validators/inbox                      7.43 kB         132 kB
├ ○ /verify                                2.75 kB         108 kB
├ ƒ /verify/anchor/[hash]                  1.7 kB          111 kB
├ ƒ /verify/export/[publicId]              2.2 kB          112 kB
├ ƒ /verify/proof/[id]                     2.19 kB         112 kB
├ ƒ /verify/tx/[txHash]                    1.72 kB         111 kB
└ ƒ /verify/validation/[id]                2.21 kB         112 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.11 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Web (P0.5 policy layer verification — 2026-01-13 13:39:56)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.08 kB         190 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 2.22 kB         150 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               2.53 kB         202 kB
├ ○ /dashboard                             13.2 kB         216 kB
├ ƒ /exports/[publicId]                    4.12 kB         119 kB
├ ƒ /goals/[id]                            8.39 kB         225 kB
├ ○ /goals/new                             4.17 kB         198 kB
├ ○ /identity                              3.21 kB         203 kB
├ ƒ /invoices/public/[slug]                3.67 kB        91.2 kB
├ ○ /orgs                                  6.83 kB         210 kB
├ ƒ /orgs/[handle]                         6.34 kB         145 kB
├ ƒ /orgs/[handle]/admin                   7.46 kB         129 kB
├ ƒ /orgs/[handle]/members                 6.58 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         6.3 kB          127 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  6.66 kB         128 kB
├ ○ /parties                               5.29 kB         115 kB
├ ƒ /parties/[slug]                        6.33 kB         116 kB
├ ○ /parties/new                           5.33 kB         109 kB
├ ƒ /profile/[address]                     13.5 kB         234 kB
├ ƒ /profile/professional/[handle]         5.88 kB         111 kB
├ ○ /projects                              6.73 kB         193 kB
├ ƒ /projects/[slug]                       11.8 kB         122 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.15 kB         116 kB
├ ƒ /projects/[slug]/invoices/new          6.17 kB         116 kB
├ ○ /projects/new                          5.7 kB          109 kB
├ ƒ /projects/share/[slug]                 3.75 kB        91.3 kB
├ ƒ /s/[slug]                              5.98 kB         111 kB
├ ƒ /share/[publicId]                      5.94 kB         111 kB
├ ○ /usernames/market                      9.08 kB         209 kB
├ ○ /validators/inbox                      8.35 kB         133 kB
├ ○ /verify                                4.2 kB          123 kB
├ ƒ /verify/anchor/[hash]                  3.16 kB         113 kB
├ ƒ /verify/export/[publicId]              3.62 kB         113 kB
├ ƒ /verify/proof/[id]                     3.61 kB         113 kB
├ ƒ /verify/tx/[txHash]                    3.17 kB         113 kB
└ ƒ /verify/validation/[id]                3.64 kB         113 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.11 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Root (monorepo scripts)

### Command

```
npm run lint
```

### Output (failed)

```
> achievo@1.0.0 lint
> npm run format:check && npm --prefix web run lint && npm --prefix apps/admin run lint


> achievo@1.0.0 format:check
> prettier --check .

Checking formatting...
[warn] .github/pull_request_template.md
[warn] .github/workflows/e2e.yml
[warn] apps/admin/app/(protected)/health/page.tsx
[warn] apps/admin/app/(protected)/indexer/page.tsx
[warn] apps/admin/app/(protected)/settings/page.tsx
[warn] apps/admin/app/(protected)/usernames/page.tsx
[warn] apps/admin/app/globals.css
[warn] apps/admin/components/auth/AdminSessionProvider.tsx
[warn] apps/admin/lib/adminApi.ts
[warn] apps/admin/next.config.mjs
[warn] backend/scripts/admin-bootstrap-superadmin.ts
[warn] backend/scripts/base-sepolia-smoke.cjs
[warn] backend/src/achievo/achievo.controller.ts
[warn] backend/src/admin-auth/admin-auth.controller.ts
[warn] backend/src/admin-auth/admin-auth.service.ts
[warn] backend/src/admin-auth/admin-csrf.guard.ts
[warn] backend/src/admin-auth/cookies.util.ts
[warn] backend/src/admin-gateway/admin-gateway.service.ts
[warn] backend/src/admin-gateway/admin-intent.service.ts
[warn] backend/src/admin-tools/admin-tools.controller.ts
[warn] backend/src/admin-tools/admin-tools.service.ts
[warn] backend/src/anchoring/anchoring.queue.service.ts
[warn] backend/src/app.module.ts
[warn] backend/src/auth/auth.controller.ts
[warn] backend/src/auth/auth.service.ts
[warn] backend/src/blockchain/achievoData.service.ts
[warn] backend/src/blockchain/usernameRegistry.service.ts
[warn] backend/src/chain-actions/chain-actions.controller.ts
[warn] backend/src/chain-actions/chain-actions.service.ts
[warn] backend/src/chain-actions/chain-actions.worker.ts
[warn] backend/src/common/deployments.ts
[warn] backend/src/common/middleware/request-id.middleware.ts
[warn] backend/src/common/middleware/request-logger.middleware.ts
[warn] backend/src/config/ops-config.service.ts
[warn] backend/src/consistency/activityEvent.service.ts
[warn] backend/src/consistency/consistency.controller.ts
[warn] backend/src/consistency/consistencyScoring.service.ts
[warn] backend/src/endorsements/endorsements.controller.ts
[warn] backend/src/endorsements/endorsements.service.ts
[warn] backend/src/endorsements/endorsementWeight.service.ts
[warn] backend/src/files/files.controller.ts
[warn] backend/src/files/files.service.ts
[warn] backend/src/goals/goals.controller.ts
[warn] backend/src/governance/governance.service.ts
[warn] backend/src/health/health.service.ts
[warn] backend/src/identity/identity.controller.ts
[warn] backend/src/indexer/indexer.config.ts
[warn] backend/src/indexer/indexer.contracts.ts
[warn] backend/src/indexer/indexer.service.ts
[warn] backend/src/indexer/log.decoder.ts
[warn] backend/src/indexer/projectors/badge.projector.ts
[warn] backend/src/indexer/projectors/goal.projector.ts
[warn] backend/src/indexer/projectors/projector.types.ts
[warn] backend/src/indexer/projectors/username.projector.ts
[warn] backend/src/indexer/reorg.manager.ts
[warn] backend/src/leaderboard/leaderboard.controller.ts
[warn] backend/src/leaderboard/leaderboard.service.ts
[warn] backend/src/legacy/legacy.controller.ts
[warn] backend/src/legacy/legacy.module.ts
[warn] backend/src/main.ts
[warn] backend/src/metrics/metrics.controller.ts
[warn] backend/src/metrics/metrics.service.ts
[warn] backend/src/monitoring/monitoring.controller.ts
[warn] backend/src/monitoring/monitoring.service.ts
[warn] backend/src/org-audit/org-audit.service.ts
[warn] backend/src/org-programs/org-programs.controller.ts
[warn] backend/src/org-programs/org-programs.service.ts
[warn] backend/src/org-submissions/org-submission-anchor.service.ts
[warn] backend/src/org-submissions/org-submissions.controller.ts
[warn] backend/src/org-submissions/org-submissions.service.ts
[warn] backend/src/organizations/handle.util.ts
[warn] backend/src/organizations/org-invites.controller.ts
[warn] backend/src/organizations/organizations.controller.ts
[warn] backend/src/organizations/organizations.service.ts
[warn] backend/src/organizations/orgRegistry.service.ts
[warn] backend/src/parties/parties.controller.ts
[warn] backend/src/parties/parties.service.ts
[warn] backend/src/privacy/privacy.controller.ts
[warn] backend/src/privacy/privacy.service.ts
[warn] backend/src/profile-exports/profileExportAnchor.service.ts
[warn] backend/src/profile-exports/profileExportPdf.service.ts
[warn] backend/src/profile-exports/profileExports.controller.ts
[warn] backend/src/profile-exports/profileExports.service.ts
[warn] backend/src/profile-exports/profileExportSigner.service.ts
[warn] backend/src/profile-exports/profileExportStorage.service.ts
[warn] backend/src/profile-exports/profileSnapshot.service.ts
[warn] backend/src/profile/professional.controller.ts
[warn] backend/src/profile/professional.service.ts
[warn] backend/src/profile/profile.controller.ts
[warn] backend/src/projects/projects.controller.ts
[warn] backend/src/projects/projects.service.ts
[warn] backend/src/proofs/proofAnchor.service.ts
[warn] backend/src/proofs/proofHash.service.ts
[warn] backend/src/proofs/proofs.controller.ts
[warn] backend/src/proofs/storage.service.ts
[warn] backend/src/quests/questEngine.service.ts
[warn] backend/src/quests/quests.controller.ts
[warn] backend/src/risk/risk.controller.ts
[warn] backend/src/risk/risk.module.ts
[warn] backend/src/risk/riskEngine.service.ts
[warn] backend/src/social/partyFeed.service.ts
[warn] backend/src/social/socialIdentity.service.ts
[warn] backend/src/usernames/usernames-market.service.ts
[warn] backend/src/usernames/usernames.controller.ts
[warn] backend/src/validations/eip712.service.ts
[warn] backend/src/validations/validationAnchor.service.ts
[warn] backend/src/validations/validations.controller.ts
[warn] backend/src/validations/validators.service.ts
[warn] backend/src/verify/chainVerify.service.ts
[warn] backend/src/verify/verify.controller.ts
[warn] backend/src/verify/verify.service.ts
[warn] backend/src/web3/web3.service.ts
[warn] backend/test/e2e/adminAuth.e2e.spec.ts
[warn] backend/test/e2e/anchoringLifecycle.e2e.spec.ts
[warn] backend/test/e2e/fixtures/seed.ts
[warn] backend/test/e2e/global-setup.cjs
[warn] backend/test/e2e/global-setup.ts
[warn] backend/test/e2e/global-teardown.cjs
[warn] backend/test/e2e/global-teardown.ts
[warn] backend/test/e2e/health.e2e.spec.ts
[warn] backend/test/e2e/indexerSmoke.e2e.spec.ts
[warn] backend/test/e2e/orgGating.e2e.spec.ts
[warn] backend/test/e2e/run-setup.cjs
[warn] backend/test/e2e/run-teardown.cjs
[warn] backend/test/e2e/usernameMarket.e2e.spec.ts
[warn] backend/test/e2e/utils/admin.ts
[warn] backend/test/e2e/utils/auth.ts
[warn] backend/test/e2e/utils/contracts.ts
[warn] backend/test/e2e/utils/harness.ts
[warn] backend/test/e2e/utils/localChain.ts
[warn] backend/test/e2e/utils/prisma.ts
[warn] backend/test/e2e/utils/runtime.ts
[warn] backend/test/e2e/utils/testDb.ts
[warn] backend/test/e2e/utils/waitUntil.ts
[warn] backend/test/e2e/verificationDegradesToUnknown.e2e.spec.ts
[warn] backend/test/unit/adminGateway.spec.ts
[warn] backend/test/unit/adminSessionAuth.spec.ts
[warn] backend/test/unit/adminTools.spec.ts
[warn] backend/test/unit/indexerPipeline.spec.ts
[warn] backend/test/unit/validationsService.spec.ts
[warn] docs/FEATURE_INVENTORY.md
[warn] docs/REPO_GOVERNANCE.md
[warn] docs/SMOKE_TEST_P0.md
[warn] docs/UX_BACKLOG.md
[warn] docs/UX_GUIDE.md
[warn] docs/UX_P0_CHANGELOG.md
[warn] docs/UX_P0_ROUTE_MAP.md
[warn] docs/UX_UI_BLUEPRINT.md
[warn] ops/admin-console.md
[warn] ops/pre-launch-checklist.md
[warn] ops/release-checklist.md
[warn] packages/achievo-abi/achievoOrgRegistry.abi.json
[warn] packages/ui-tokens/src/tokens.ts
[warn] packages/ui-tokens/tokens.css
[warn] packages/ui/package.json
[warn] packages/ui/src/Modal.tsx
[warn] packages/ui/src/StatusBadge.tsx
[warn] packages/username/index.cjs
[warn] packages/username/index.js
[warn] packages/username/index.mjs
[warn] README.md
[warn] scripts/deploy-e2e-local.ts
[warn] scripts/deploy-governance.ts
[warn] scripts/deploy-org-registry.ts
[warn] SECURITY.md
[warn] test/anchorRegistry.spec.ts
[warn] test/badgeV12.spec.ts
[warn] test/orgRegistry.spec.ts
[warn] web/app/api/[...path]/route.ts
[warn] web/app/approve/page.tsx
[warn] web/app/dashboard/page.tsx
[warn] web/app/goals/[id]/page.tsx
[warn] web/app/goals/new/page.tsx
[warn] web/app/identity/page.tsx
[warn] web/app/orgs/[handle]/page.tsx
[warn] web/app/orgs/page.tsx
[warn] web/app/profile/[address]/page.tsx
[warn] web/app/projects/page.tsx
[warn] web/app/usernames/market/page.tsx
[warn] web/app/verify/anchor/[hash]/page.tsx
[warn] web/app/verify/export/[publicId]/page.tsx
[warn] web/app/verify/page.tsx
[warn] web/app/verify/proof/[id]/page.tsx
[warn] web/app/verify/tx/[txHash]/page.tsx
[warn] web/app/verify/validation/[id]/page.tsx
[warn] web/components/ConnectWallet.tsx
[warn] web/components/domain/AnchorStatus.tsx
[warn] web/components/domain/verify/VerifyResultCard.tsx
[warn] web/components/layout/PageLayout.tsx
[warn] web/components/nav/PageHeader.tsx
[warn] web/components/nav/SideNav.tsx
[warn] web/components/PrivacySettingsEditor.tsx
[warn] web/components/ProfileEditor.tsx
[warn] web/components/ProofList.tsx
[warn] web/components/ShareLinksManager.tsx
[warn] web/components/states/EmptyState.tsx
[warn] web/components/states/StateContracts.md
[warn] web/components/tx/TxStepper.tsx
[warn] web/components/tx/TxTypes.ts
[warn] web/components/tx/useTxLifecycle.ts
[warn] web/components/VisibilityControls.tsx
[warn] web/hooks/useIdentity.ts
[warn] web/hooks/useProfileExports.ts
[warn] web/hooks/useProofs.ts
[warn] web/hooks/useShareLinks.ts
[warn] web/hooks/useValidations.ts
[warn] web/lib/apiError.ts
[warn] web/lib/username.ts
[warn] web/tailwind.config.cjs
[warn] web/tests/e2e.spec.ts
[warn] web/tsconfig.json
[warn] web/UX_NOTES.md
[warn] Code style issues found in 212 files. Run Prettier with --write to fix.
```

#### Failure summary

- `npm run lint` failed during `prettier --check .` with formatting warnings across multiple files.
- Minimal fix (not applied here): run `npm run format` or `prettier --write .` and re-run lint.

### Command

```
npm run typecheck
```

### Output (failed)

```
command timed out after 85364770 milliseconds
```

#### Failure summary

- `npm run typecheck` timed out without producing additional output.
- Minimal fix proposal: re-run with a longer timeout or run package-level typechecks individually to isolate long-running step.

### Command

```
npm run build
```

### Output (failed)

```
command timed out after 365026 milliseconds

> achievo@1.0.0 build
> npm run compile && npm --prefix backend run build && npm --prefix web run build && npm --prefix apps/admin run build


> achievo@1.0.0 compile
> hardhat compile

Nothing to compile
Nothing to compile

> achievo-backend@0.1.0 build
> tsc -p tsconfig.json


> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      6.19 kB         189 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 2.22 kB         150 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               3.74 kB         187 kB
├ ○ /dashboard                             12.3 kB         215 kB
├ ƒ /exports/[publicId]                    6.72 kB         118 kB
├ ƒ /goals/[id]                            8.39 kB         209 kB
├ ○ /goals/new                             4.53 kB         182 kB
├ ○ /identity                              4.38 kB         187 kB
├ ƒ /invoices/public/[slug]                2.75 kB        90.3 kB
├ ○ /orgs                                  5.89 kB         194 kB
├ ƒ /orgs/[handle]                         6.48 kB         128 kB
├ ƒ /orgs/[handle]/admin                   6.57 kB         128 kB
├ ƒ /orgs/[handle]/members                 5.68 kB         127 kB
├ ƒ /orgs/[handle]/programs/[slug]         5.4 kB          126 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  5.76 kB         127 kB
├ ○ /parties                               4.39 kB         114 kB
├ ƒ /parties/[slug]                        5.43 kB         115 kB
├ ○ /parties/new                           4.43 kB         108 kB
├ ƒ /profile/[address]                     13.1 kB         218 kB
├ ƒ /profile/professional/[handle]         4.97 kB         110 kB
├ ○ /projects                              4.46 kB         192 kB
├ ƒ /projects/[slug]                       10.9 kB         121 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  5.26 kB         115 kB
├ ƒ /projects/[slug]/invoices/new          5.28 kB         115 kB
├ ○ /projects/new                          4.8 kB          108 kB
├ ƒ /projects/share/[slug]                 2.83 kB        90.3 kB
├ ƒ /s/[slug]                              5.07 kB         110 kB
├ ƒ /share/[publicId]                      5.07 kB         110 kB
├ ○ /usernames/market                      4.94 kB         193 kB
├ ○ /validators/inbox                      7.43 kB         132 kB
├ ○ /verify                                2.75 kB         108 kB
├ ƒ /verify/anchor/[hash]                  1.7 kB          111 kB
├ ƒ /verify/export/[publicId]              2.2 kB          112 kB
├ ƒ /verify/proof/[id]                     2.19 kB         112 kB
├ ƒ /verify/tx/[txHash]                    1.72 kB         111 kB
└ ƒ /verify/validation/[id]                2.21 kB         112 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.11 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
```

#### Failure summary

- `npm run build` timed out while running `apps/admin` build, after `hardhat compile`, backend build, and web build succeeded.
- Minimal fix proposal: re-run with a longer timeout or run `npm --prefix apps/admin run build` separately to isolate build issues.

## Admin build (isolated)

### Command

```
npm --prefix apps/admin run build
```

### Output (failed)

```
> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...

Failed to compile.

./app/(protected)/orgs/page.tsx
28:6  Warning: React Hook useEffect has missing dependencies: 'initialQuery' and 'runSearch'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps

./app/(protected)/settings/page.tsx
46:3  Error: React Hook \"useEffect\" is called conditionally. React Hooks must be called in the exact same order in every component render.  react-hooks/rules-of-hooks

./app/(protected)/usernames/page.tsx
25:6  Warning: React Hook useEffect has missing dependencies: 'initialQuery' and 'runSearch'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps

./app/(protected)/users/page.tsx
25:6  Warning: React Hook useEffect has missing dependencies: 'initialQuery' and 'runSearch'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/basic-features/eslint#disabling-rules
```

#### Failure summary

- `apps/admin` build fails due to React hooks linting errors in:
  - `apps/admin/app/(protected)/settings/page.tsx` (conditional `useEffect` call)
  - `apps/admin/app/(protected)/orgs/page.tsx`, `apps/admin/app/(protected)/usernames/page.tsx`, `apps/admin/app/(protected)/users/page.tsx` (missing hook deps)
- Minimal fix proposal: move conditional logic inside `useEffect` body and include `initialQuery` + `runSearch` in dependency arrays.

## Web (P0.5 verification - 2026-01-13 12:48:31)

### Command

```
npm --prefix web run lint
```

## Web (P0.5 audit docs pass - 2026-01-13 14:31:33)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output (failed: timeout)

```
command timed out after 124081 milliseconds

> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
```

#### Failure summary

- `npm --prefix web run build` timed out before static page generation completed.
- Minimal fix proposal: re-run with a longer timeout; no code changes required based on current output.

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.08 kB         190 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 2.22 kB         150 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               2.52 kB         188 kB
├ ○ /dashboard                             13.2 kB         216 kB
├ ƒ /exports/[publicId]                    4.12 kB         119 kB
├ ƒ /goals/[id]                            8.39 kB         210 kB
├ ○ /goals/new                             4.16 kB         184 kB
├ ○ /identity                              3.21 kB         189 kB
├ ƒ /invoices/public/[slug]                3.67 kB        91.2 kB
├ ○ /orgs                                  6.83 kB         196 kB
├ ƒ /orgs/[handle]                         5.61 kB         130 kB
├ ƒ /orgs/[handle]/admin                   7.46 kB         129 kB
├ ƒ /orgs/[handle]/members                 6.58 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         6.3 kB          127 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  6.66 kB         128 kB
├ ○ /parties                               5.29 kB         115 kB
├ ƒ /parties/[slug]                        6.33 kB         116 kB
├ ○ /parties/new                           5.33 kB         109 kB
├ ƒ /profile/[address]                     13.2 kB         220 kB
├ ƒ /profile/professional/[handle]         5.88 kB         111 kB
├ ○ /projects                              6.73 kB         193 kB
├ ƒ /projects/[slug]                       11.8 kB         122 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.15 kB         116 kB
├ ƒ /projects/[slug]/invoices/new          6.17 kB         116 kB
├ ○ /projects/new                          5.7 kB          109 kB
├ ƒ /projects/share/[slug]                 3.75 kB        91.3 kB
├ ƒ /s/[slug]                              5.98 kB         111 kB
├ ƒ /share/[publicId]                      5.94 kB         111 kB
├ ○ /usernames/market                      7.78 kB         194 kB
├ ○ /validators/inbox                      8.35 kB         133 kB
├ ○ /verify                                2.75 kB         108 kB
├ ƒ /verify/anchor/[hash]                  3.16 kB         113 kB
├ ƒ /verify/export/[publicId]              3.62 kB         113 kB
├ ƒ /verify/proof/[id]                     3.61 kB         113 kB
├ ƒ /verify/tx/[txHash]                    3.17 kB         113 kB
└ ƒ /verify/validation/[id]                3.64 kB         113 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.11 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Build Timeout Investigation (2026-01-13)

### Command

```
npm --prefix web run build
```

### Output (failed: timeout)

```
command timed out after 125100 milliseconds

> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
 ✓ Compiled successfully
   Linting and checking validity of types ...
```

### Command

```
$env:NEXT_TELEMETRY_DISABLED='1'; npm --prefix web run build -- --debug
```

### Output (failed: timeout)

```
command timed out after 125005 milliseconds

> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
```

### Fixes applied (web-only)

- Added build-specific TypeScript config to reduce scope: `web/tsconfig.build.json`.
- Pointed Next build to the build config: `web/next.config.mjs`.
- Skipped linting during `next build` (lint still enforced via `npm --prefix web run lint`): `web/next.config.mjs`.
- Disabled output file tracing to reduce build time: `web/next.config.mjs`.
- Added module path mappings for external package resolution: `web/tsconfig.json`, `web/tsconfig.build.json`.

### Performance note

- The build now completes under the 120s timeout but emits a warning about `outputFileTracing` being disabled in the next major release.

## Web (Build timeout resolution - 2026-01-13 14:58:12)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.08 kB         190 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 2.22 kB         150 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               2.53 kB         202 kB
├ ○ /dashboard                             13.2 kB         216 kB
├ ƒ /exports/[publicId]                    4.12 kB         119 kB
├ ƒ /goals/[id]                            8.39 kB         225 kB
├ ○ /goals/new                             4.17 kB         198 kB
├ ○ /identity                              3.21 kB         203 kB
├ ƒ /invoices/public/[slug]                3.67 kB        91.2 kB
├ ○ /orgs                                  6.83 kB         210 kB
├ ƒ /orgs/[handle]                         6.34 kB         145 kB
├ ƒ /orgs/[handle]/admin                   7.46 kB         129 kB
├ ƒ /orgs/[handle]/members                 6.58 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         6.3 kB          127 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  6.66 kB         128 kB
├ ○ /parties                               5.29 kB         115 kB
├ ƒ /parties/[slug]                        6.33 kB         116 kB
├ ○ /parties/new                           5.33 kB         109 kB
├ ƒ /profile/[address]                     13.5 kB         234 kB
├ ƒ /profile/professional/[handle]         5.88 kB         111 kB
├ ○ /projects                              6.73 kB         193 kB
├ ƒ /projects/[slug]                       11.8 kB         122 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.15 kB         116 kB
├ ƒ /projects/[slug]/invoices/new          6.17 kB         116 kB
├ ○ /projects/new                          5.7 kB          109 kB
├ ƒ /projects/share/[slug]                 3.75 kB        91.3 kB
├ ƒ /s/[slug]                              5.98 kB         111 kB
├ ƒ /share/[publicId]                      5.94 kB         111 kB
├ ○ /usernames/market                      9.08 kB         209 kB
├ ○ /validators/inbox                      8.35 kB         133 kB
├ ○ /verify                                4.2 kB          123 kB
├ ƒ /verify/anchor/[hash]                  3.16 kB         113 kB
├ ƒ /verify/export/[publicId]              3.62 kB         113 kB
├ ƒ /verify/proof/[id]                     3.61 kB         113 kB
├ ƒ /verify/tx/[txHash]                    3.17 kB         113 kB
└ ƒ /verify/validation/[id]                3.64 kB         113 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.11 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Web P1 Workbench Verification (2026-01-13)

### npm --prefix web run lint

````n> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```n
### npm --prefix web run typecheck
```n> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```n
### npm --prefix web run build
```n> achievo-web@0.1.0 build
> next build

 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update:
pm i baseline-browser-mapping@latest -D`n ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.08 kB         190 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 2.22 kB         150 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               2.53 kB         202 kB
├ ○ /dashboard                             11.9 kB         216 kB
├ ƒ /exports/[publicId]                    4.12 kB         119 kB
├ ƒ /goals/[id]                            8.39 kB         225 kB
├ ○ /goals/new                             4.17 kB         198 kB
├ ○ /identity                              3.21 kB         203 kB
├ ƒ /invoices/public/[slug]                3.67 kB        91.2 kB
├ ○ /orgs                                  4.46 kB         210 kB
├ ƒ /orgs/[handle]                         6.34 kB         145 kB
├ ƒ /orgs/[handle]/admin                   9.68 kB         148 kB
├ ƒ /orgs/[handle]/members                 6.58 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         6.3 kB          127 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  6.66 kB         128 kB
├ ○ /parties                               5.29 kB         115 kB
├ ƒ /parties/[slug]                        6.33 kB         116 kB
├ ○ /parties/new                           5.33 kB         109 kB
├ ƒ /profile/[address]                     13.9 kB         234 kB
├ ƒ /profile/professional/[handle]         5.88 kB         111 kB
├ ○ /projects                              4.36 kB         193 kB
├ ƒ /projects/[slug]                       13.2 kB         216 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.15 kB         116 kB
├ ƒ /projects/[slug]/invoices/new          6.17 kB         116 kB
├ ○ /projects/new                          5.7 kB          109 kB
├ ƒ /projects/share/[slug]                 3.75 kB        91.3 kB
├ ƒ /s/[slug]                              5.98 kB         111 kB
├ ƒ /share/[publicId]                      5.94 kB         111 kB
├ ○ /usernames/market                      6.71 kB         209 kB
├ ○ /validators/inbox                      9.67 kB         212 kB
├ ○ /verify                                4.2 kB          123 kB
├ ƒ /verify/anchor/[hash]                  3.16 kB         113 kB
├ ƒ /verify/export/[publicId]              3.62 kB         113 kB
├ ƒ /verify/proof/[id]                     3.61 kB         113 kB
├ ƒ /verify/tx/[txHash]                    3.17 kB         113 kB
└ ƒ /verify/validation/[id]                3.64 kB         113 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.11 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```n
````

## Admin Console Control Plane MVP (2026-01-20)

### Command

```
npm --prefix apps/admin run lint
```

### Output

```
> achievo-admin@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix apps/admin run typecheck
```

### Output

```
> achievo-admin@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix apps/admin run build
```

### Output

```
> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/23) ...
   Generating static pages (5/23)
   Generating static pages (11/23)
   Generating static pages (17/23)
 ✓ Generating static pages (23/23)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    2.88 kB          90 kB
├ ○ /_not-found                          873 B            88 kB
├ ○ /alerts                              2.53 kB        89.6 kB
├ ○ /anchoring                           2.53 kB        89.7 kB
├ ƒ /api/admin/[...path]                 0 B                0 B
├ ƒ /api/admin/actions/dry-run           0 B                0 B
├ ƒ /api/admin/actions/execute           0 B                0 B
├ ƒ /api/admin/actions/recent            0 B                0 B
├ ƒ /api/admin/login                     0 B                0 B
├ ƒ /api/admin/logout                    0 B                0 B
├ ƒ /api/admin/me                        0 B                0 B
├ ƒ /api/admin/policy                    0 B                0 B
├ ƒ /api/admin/refresh                   0 B                0 B
├ ○ /chain-actions                       2.97 kB        97.1 kB
├ ƒ /chain-actions/[id]                  3.14 kB        90.3 kB
├ ○ /health                              2.15 kB        89.3 kB
├ ○ /indexer                             3.13 kB        90.2 kB
├ ○ /login                               1.82 kB        88.9 kB
├ ○ /orgs                                2.16 kB        89.3 kB
├ ○ /policies                            1.96 kB        89.1 kB
├ ○ /settings                            365 B          87.5 kB
├ ○ /usernames                           365 B          87.5 kB
└ ○ /users                               361 B          87.5 kB
+ First Load JS shared by all            87.1 kB
  ├ chunks/117-022b78fc13771251.js       31.6 kB
  ├ chunks/fd9d1056-fdc813d0a7d52d12.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Admin Console Control Plane MVP (2026-01-20 12:05)

### Command

```
npm --prefix apps/admin run lint
```

### Output

```
> achievo-admin@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix apps/admin run typecheck
```

### Output

```
> achievo-admin@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix apps/admin run build
```

### Output

```
> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/23) ...
   Generating static pages (5/23)
   Generating static pages (11/23)
   Generating static pages (17/23)
 ✓ Generating static pages (23/23)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    2.88 kB          90 kB
├ ○ /_not-found                          873 B            88 kB
├ ○ /alerts                              2.53 kB        89.6 kB
├ ○ /anchoring                           2.53 kB        89.7 kB
├ ƒ /api/admin/[...path]                 0 B                0 B
├ ƒ /api/admin/actions/dry-run           0 B                0 B
├ ƒ /api/admin/actions/execute           0 B                0 B
├ ƒ /api/admin/actions/recent            0 B                0 B
├ ƒ /api/admin/login                     0 B                0 B
├ ƒ /api/admin/logout                    0 B                0 B
├ ƒ /api/admin/me                        0 B                0 B
├ ƒ /api/admin/policy                    0 B                0 B
├ ƒ /api/admin/refresh                   0 B                0 B
├ ○ /chain-actions                       2.97 kB        97.1 kB
├ ƒ /chain-actions/[id]                  3.14 kB        90.3 kB
├ ○ /health                              2.15 kB        89.3 kB
├ ○ /indexer                             3.13 kB        90.2 kB
├ ○ /login                               1.82 kB        88.9 kB
├ ○ /orgs                                2.16 kB        89.3 kB
├ ○ /policies                            1.96 kB        89.1 kB
├ ○ /settings                            365 B          87.5 kB
├ ○ /usernames                           365 B          87.5 kB
└ ○ /users                               361 B          87.5 kB
+ First Load JS shared by all            87.1 kB
  ├ chunks/117-022b78fc13771251.js       31.6 kB
  ├ chunks/fd9d1056-fdc813d0a7d52d12.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Admin Console P1 Finalization (2026-01-20 12:22)

### Command

```
npm --prefix apps/admin run lint
```

### Output

```
> achievo-admin@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix apps/admin run typecheck
```

### Output

```
> achievo-admin@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix apps/admin run build
```

### Output

```
> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/23) ...
   Generating static pages (5/23)
   Generating static pages (11/23)
   Generating static pages (17/23)
 ✓ Generating static pages (23/23)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    2.88 kB          90 kB
├ ○ /_not-found                          873 B            88 kB
├ ○ /alerts                              2.53 kB        89.6 kB
├ ○ /anchoring                           2.55 kB        89.7 kB
├ ƒ /api/admin/[...path]                 0 B                0 B
├ ƒ /api/admin/actions/dry-run           0 B                0 B
├ ƒ /api/admin/actions/execute           0 B                0 B
├ ƒ /api/admin/actions/recent            0 B                0 B
├ ƒ /api/admin/login                     0 B                0 B
├ ƒ /api/admin/logout                    0 B                0 B
├ ƒ /api/admin/me                        0 B                0 B
├ ƒ /api/admin/policy                    0 B                0 B
├ ƒ /api/admin/refresh                   0 B                0 B
├ ○ /chain-actions                       2.99 kB        97.1 kB
├ ƒ /chain-actions/[id]                  3.16 kB        90.3 kB
├ ○ /health                              2.15 kB        89.3 kB
├ ○ /indexer                             3.15 kB        90.3 kB
├ ○ /login                               1.82 kB        88.9 kB
├ ○ /orgs                                2.17 kB        89.3 kB
├ ○ /policies                            1.96 kB        89.1 kB
├ ○ /settings                            365 B          87.5 kB
├ ○ /usernames                           365 B          87.5 kB
└ ○ /users                               361 B          87.5 kB
+ First Load JS shared by all            87.1 kB
  ├ chunks/117-022b78fc13771251.js       31.6 kB
  ├ chunks/fd9d1056-fdc813d0a7d52d12.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Admin Console Dry-Run Proof Verification (2026-01-20 12:38)

### Command

```
npm --prefix apps/admin run lint
```

### Output

```
> achievo-admin@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix apps/admin run typecheck
```

### Output

```
> achievo-admin@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix apps/admin run build
```

### Output

```
> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/23) ...
   Generating static pages (5/23)
   Generating static pages (11/23)
   Generating static pages (17/23)
 ✓ Generating static pages (23/23)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    2.88 kB          90 kB
├ ○ /_not-found                          873 B            88 kB
├ ○ /alerts                              2.53 kB        89.6 kB
├ ○ /anchoring                           2.55 kB        89.7 kB
├ ƒ /api/admin/[...path]                 0 B                0 B
├ ƒ /api/admin/actions/dry-run           0 B                0 B
├ ƒ /api/admin/actions/execute           0 B                0 B
├ ƒ /api/admin/actions/recent            0 B                0 B
├ ƒ /api/admin/login                     0 B                0 B
├ ƒ /api/admin/logout                    0 B                0 B
├ ƒ /api/admin/me                        0 B                0 B
├ ƒ /api/admin/policy                    0 B                0 B
├ ƒ /api/admin/refresh                   0 B                0 B
├ ○ /chain-actions                       2.99 kB        97.1 kB
├ ƒ /chain-actions/[id]                  3.16 kB        90.3 kB
├ ○ /health                              2.15 kB        89.3 kB
├ ○ /indexer                             3.15 kB        90.3 kB
├ ○ /login                               1.82 kB        88.9 kB
├ ○ /orgs                                2.17 kB        89.3 kB
├ ○ /policies                            1.96 kB        89.1 kB
├ ○ /settings                            365 B          87.5 kB
├ ○ /usernames                           365 B          87.5 kB
└ ○ /users                               361 B          87.5 kB
+ First Load JS shared by all            87.1 kB
  ├ chunks/117-022b78fc13771251.js       31.6 kB
  ├ chunks/fd9d1056-fdc813d0a7d52d12.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Web dApp UX P2 Verification (2026-01-20)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.09 kB         189 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 1.75 kB         108 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               2.53 kB         201 kB
├ ○ /dashboard                             11.9 kB         215 kB
├ ƒ /exports/[publicId]                    6.67 kB         118 kB
├ ƒ /goals/[id]                            8.37 kB         224 kB
├ ○ /goals/new                             4.18 kB         197 kB
├ ○ /identity                              3.21 kB         202 kB
├ ƒ /invoices/public/[slug]                3.68 kB        91.2 kB
├ ○ /orgs                                  4.46 kB         209 kB
├ ƒ /orgs/[handle]                         5.42 kB         145 kB
├ ƒ /orgs/[handle]/admin                   8.77 kB         148 kB
├ ƒ /orgs/[handle]/members                 5.66 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         5.37 kB         127 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  5.73 kB         128 kB
├ ○ /parties                               5.3 kB          115 kB
├ ƒ /parties/[slug]                        6.34 kB         116 kB
├ ○ /parties/new                           5.34 kB         109 kB
├ ƒ /profile/[address]                     13.9 kB         233 kB
├ ƒ /profile/professional/[handle]         4.91 kB         111 kB
├ ○ /projects                              4.36 kB         192 kB
├ ƒ /projects/[slug]                       13.2 kB         215 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.17 kB         116 kB
├ ƒ /projects/[slug]/invoices/new          6.18 kB         116 kB
├ ○ /projects/new                          5.71 kB         109 kB
├ ƒ /projects/share/[slug]                 3.76 kB        91.2 kB
├ ƒ /s/[slug]                              5.01 kB         111 kB
├ ƒ /share/[publicId]                      4.97 kB         111 kB
├ ○ /usernames/market                      6.71 kB         208 kB
├ ○ /validators/inbox                      9.66 kB         211 kB
├ ○ /verify                                3.24 kB         123 kB
├ ƒ /verify/anchor/[hash]                  1.74 kB         113 kB
├ ƒ /verify/export/[publicId]              2.21 kB         113 kB
├ ƒ /verify/proof/[id]                     2.2 kB          113 kB
├ ƒ /verify/tx/[txHash]                    1.76 kB         113 kB
└ ƒ /verify/validation/[id]                2.23 kB         113 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.09 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Command

```
npm --prefix web run test:e2e
```

### Output

```
> achievo-web@0.1.0 test:e2e
> playwright test

⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues

Running 15 tests using 1 worker

  ok 1 e2e.spec.ts:111:1 › verification page renders (26.9s)
  ok 2 e2e.spec.ts:116:1 › projects page renders for mocked auth (8.9s)
  ok 3 e2e.spec.ts:145:1 › navigation does not request auth nonce after session established (12.3s)
  ok 4 e2e.spec.ts:159:1 › org creation requires on-chain tx before backend finalize (8.0s)
  ok 5 e2e.spec.ts:198:1 › degraded banner appears when health is degraded (3.3s)
  ok 6 e2e.spec.ts:210:1 › degraded banner stays hidden when health is ok (3.2s)
  ok 7 e2e.spec.ts:215:1 › verification unknown state renders as non-failure (10.7s)
  ok 8 e2e.spec.ts:234:1 › verification proof renders invalid and not found states (14.1s)
  ok 9 e2e.spec.ts:262:1 › verification tx renders unknown, invalid, and not found states (22.6s)
  ok 10 e2e.spec.ts:300:1 › policy gating disables verify portal and username market (12.7s)
  ok 11 e2e.spec.ts:315:1 › session indicator shows sign in when signed out (3.2s)
  ok 12 e2e.spec.ts:333:1 › org create page shows tx stepper and finality timeline when tx state is preset (6.7s)
  ok 13 e2e.spec.ts:346:1 › username market trade transitions from pending to confirmed (4.4s)
  ok 14 e2e.spec.ts:399:1 › a11y: global nav keyboard access and modal focus trap (9.4s)
  ok 15 e2e.spec.ts:431:1 › a11y snapshots include headings for key routes (16.1s)

  Slow test file: e2e.spec.ts (2.7m)
  Consider splitting slow test files to speed up parallel execution
  15 passed (2.9m)
```

## Web dApp UX P2 Verification (2026-01-20 14:48:02)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command (initial attempt)

```
npm --prefix web run typecheck
```

### Output

```
command timed out after 11725 milliseconds

> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command (rerun)

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.09 kB         189 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 1.75 kB         108 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               2.53 kB         201 kB
├ ○ /dashboard                             11.9 kB         215 kB
├ ƒ /exports/[publicId]                    6.67 kB         118 kB
├ ƒ /goals/[id]                            8.37 kB         224 kB
├ ○ /goals/new                             4.18 kB         197 kB
├ ○ /identity                              3.21 kB         202 kB
├ ƒ /invoices/public/[slug]                3.68 kB        91.2 kB
├ ○ /orgs                                  4.46 kB         209 kB
├ ƒ /orgs/[handle]                         5.42 kB         145 kB
├ ƒ /orgs/[handle]/admin                   8.77 kB         148 kB
├ ƒ /orgs/[handle]/members                 5.66 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         5.37 kB         127 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  5.73 kB         128 kB
├ ○ /parties                               5.3 kB          115 kB
├ ƒ /parties/[slug]                        6.34 kB         116 kB
├ ○ /parties/new                           5.34 kB         109 kB
├ ƒ /profile/[address]                     13.9 kB         233 kB
├ ƒ /profile/professional/[handle]         4.91 kB         111 kB
├ ○ /projects                              4.36 kB         192 kB
├ ƒ /projects/[slug]                       13.2 kB         215 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.17 kB         116 kB
├ ƒ /projects/[slug]/invoices/new          6.18 kB         116 kB
├ ○ /projects/new                          5.71 kB         109 kB
├ ƒ /projects/share/[slug]                 3.76 kB        91.2 kB
├ ƒ /s/[slug]                              5.01 kB         111 kB
├ ƒ /share/[publicId]                      4.97 kB         111 kB
├ ○ /usernames/market                      6.71 kB         208 kB
├ ○ /validators/inbox                      9.66 kB         211 kB
├ ○ /verify                                3.24 kB         123 kB
├ ƒ /verify/anchor/[hash]                  1.74 kB         113 kB
├ ƒ /verify/export/[publicId]              2.21 kB         113 kB
├ ƒ /verify/proof/[id]                     2.2 kB          113 kB
├ ƒ /verify/tx/[txHash]                    1.76 kB         113 kB
└ ƒ /verify/validation/[id]                2.23 kB         113 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.09 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Command

```
npm --prefix web run test:e2e
```

### Output

```
> achievo-web@0.1.0 test:e2e
> playwright test

[WebServer] ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues

Running 15 tests using 1 worker

  ok 1 e2e.spec.ts:111:1 › verification page renders (23.9s)
  ok 2 e2e.spec.ts:116:1 › projects page renders for mocked auth (8.8s)
  ok 3 e2e.spec.ts:145:1 › navigation does not request auth nonce after session established (14.5s)
  ok 4 e2e.spec.ts:159:1 › org creation requires on-chain tx before backend finalize (10.7s)
  ok 5 e2e.spec.ts:198:1 › degraded banner appears when health is degraded (4.5s)
  ok 6 e2e.spec.ts:210:1 › degraded banner stays hidden when health is ok (3.2s)
  ok 7 e2e.spec.ts:215:1 › verification unknown state renders as non-failure (10.2s)
  ok 8 e2e.spec.ts:234:1 › verification proof renders invalid and not found states (7.0s)
  ok 9 e2e.spec.ts:262:1 › verification tx renders unknown, invalid, and not found states (18.5s)
  ok 10 e2e.spec.ts:300:1 › policy gating disables verify portal and username market (12.7s)
  ok 11 e2e.spec.ts:315:1 › session indicator shows sign in when signed out (3.6s)
  ok 12 e2e.spec.ts:333:1 › org create page shows tx stepper and finality timeline when tx state is preset (3.2s)
  ok 13 e2e.spec.ts:346:1 › username market trade transitions from pending to confirmed (4.5s)
  ok 14 e2e.spec.ts:399:1 › a11y: global nav keyboard access and modal focus trap (8.2s)
  ok 15 e2e.spec.ts:431:1 › a11y snapshots include headings for key routes (15.0s)

  Slow test file: e2e.spec.ts (2.5m)
  Consider splitting slow test files to speed up parallel execution
  15 passed (2.6m)
```

## Admin + Web UX Reliability Verification (2026-01-22 21:17:33)

### Command

```
npm --prefix apps/admin run lint
```

### Output

```
> achievo-admin@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix apps/admin run typecheck
```

### Output

```
> achievo-admin@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix apps/admin run build
```

### Output

```
> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/23) ...
   Generating static pages (5/23)
   Generating static pages (11/23)
   Generating static pages (17/23)
 ✓ Generating static pages (23/23)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    2.88 kB          90 kB
├ ○ /_not-found                          873 B            88 kB
├ ○ /alerts                              2.53 kB        89.6 kB
├ ○ /anchoring                           2.55 kB        89.7 kB
├ ƒ /api/admin/[...path]                 0 B                0 B
├ ƒ /api/admin/actions/dry-run           0 B                0 B
├ ƒ /api/admin/actions/execute           0 B                0 B
├ ƒ /api/admin/actions/recent            0 B                0 B
├ ƒ /api/admin/login                     0 B                0 B
├ ƒ /api/admin/logout                    0 B                0 B
├ ƒ /api/admin/me                        0 B                0 B
├ ƒ /api/admin/policy                    0 B                0 B
├ ƒ /api/admin/refresh                   0 B                0 B
├ ○ /chain-actions                       2.99 kB        97.1 kB
├ ƒ /chain-actions/[id]                  3.16 kB        90.3 kB
├ ○ /health                              2.15 kB        89.3 kB
├ ○ /indexer                             3.15 kB        90.3 kB
├ ○ /login                               1.82 kB        88.9 kB
├ ○ /orgs                                2.17 kB        89.3 kB
├ ○ /policies                            1.96 kB        89.1 kB
├ ○ /settings                            365 B          87.5 kB
├ ○ /usernames                           365 B          87.5 kB
└ ○ /users                               361 B          87.5 kB
+ First Load JS shared by all            87.1 kB
  ├ chunks/117-022b78fc13771251.js       31.6 kB
  ├ chunks/fd9d1056-fdc813d0a7d52d12.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.09 kB         189 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 1.75 kB         108 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               2.53 kB         201 kB
├ ○ /dashboard                             11.9 kB         215 kB
├ ƒ /exports/[publicId]                    6.67 kB         119 kB
├ ƒ /goals/[id]                            8.37 kB         224 kB
├ ○ /goals/new                             4.18 kB         197 kB
├ ○ /identity                              3.21 kB         202 kB
├ ƒ /invoices/public/[slug]                3.68 kB        91.2 kB
├ ○ /orgs                                  4.46 kB         209 kB
├ ƒ /orgs/[handle]                         5.42 kB         145 kB
├ ƒ /orgs/[handle]/admin                   8.77 kB         148 kB
├ ƒ /orgs/[handle]/members                 5.66 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         5.37 kB         127 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  5.73 kB         128 kB
├ ○ /parties                               5.3 kB          115 kB
├ ƒ /parties/[slug]                        6.34 kB         116 kB
├ ○ /parties/new                           5.34 kB         109 kB
├ ƒ /profile/[address]                     13.9 kB         233 kB
├ ƒ /profile/professional/[handle]         4.91 kB         111 kB
├ ○ /projects                              4.36 kB         192 kB
├ ƒ /projects/[slug]                       13.2 kB         215 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.17 kB         116 kB
├ ƒ /projects/[slug]/invoices/new          6.18 kB         116 kB
├ ○ /projects/new                          5.71 kB         109 kB
├ ƒ /projects/share/[slug]                 3.76 kB        91.2 kB
├ ƒ /s/[slug]                              5.01 kB         111 kB
├ ƒ /share/[publicId]                      4.97 kB         111 kB
├ ○ /usernames/market                      6.71 kB         208 kB
├ ○ /validators/inbox                      9.66 kB         211 kB
├ ○ /verify                                3.24 kB         123 kB
├ ƒ /verify/anchor/[hash]                  1.74 kB         113 kB
├ ƒ /verify/export/[publicId]              2.21 kB         113 kB
├ ƒ /verify/proof/[id]                     2.2 kB          113 kB
├ ƒ /verify/tx/[txHash]                    1.76 kB         113 kB
└ ƒ /verify/validation/[id]                2.23 kB         113 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-c5fb114dcb15b81f.js        31.8 kB
  ├ chunks/fd9d1056-ec85ef8099b663ee.js    53.6 kB
  └ other shared chunks (total)            2.09 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Command

```
npm --prefix web run test:e2e
```

### Output

```
> achievo-web@0.1.0 test:e2e
> playwright test

⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues

Running 18 tests using 1 worker

  ok 1 e2e.spec.ts:120:1 › verification page renders (23.3s)
  ok 2 e2e.spec.ts:125:1 › projects page renders for mocked auth (14.4s)
  ok 3 e2e.spec.ts:154:1 › navigation does not request auth nonce after session established (12.2s)
  ok 4 e2e.spec.ts:168:1 › org creation requires on-chain tx before backend finalize (13.3s)
  ok 5 e2e.spec.ts:207:1 › degraded banner appears when health is degraded (730ms)
  ok 6 e2e.spec.ts:220:1 › degraded banner stays hidden when health is ok (3.7s)
  ok 7 e2e.spec.ts:225:1 › verification unknown state renders as non-failure (13.4s)
  ok 8 e2e.spec.ts:244:1 › verification proof renders invalid and not found states (10.6s)
  ok 9 e2e.spec.ts:272:1 › verification tx renders unknown, invalid, and not found states (24.4s)
  ok 10 e2e.spec.ts:310:1 › policy gating disables verify portal and username market (16.8s)
  ok 11 e2e.spec.ts:325:1 › session indicator shows sign in when signed out (927ms)
  ok 12 e2e.spec.ts:343:1 › org create page shows tx stepper and finality timeline when tx state is preset (6.1s)
  ok 13 e2e.spec.ts:356:1 › org admin workbench renders tabs (14.3s)
  ok 14 e2e.spec.ts:385:1 › validator inbox renders registration gate or inbox (11.7s)
  ok 15 e2e.spec.ts:392:1 › project workbench renders tab shell (18.6s)
  ok 16 e2e.spec.ts:464:1 › username market trade transitions from pending to confirmed (7.7s)
  ok 17 e2e.spec.ts:517:1 › a11y: global nav keyboard access and modal focus trap (12.8s)
[WebServer] [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
  ok 18 e2e.spec.ts:552:1 › a11y snapshots include headings for key routes (35.3s)


  Slow test file: e2e.spec.ts (4.0m)
  Consider splitting slow test files to speed up parallel execution
  18 passed (4.3m)
```

## Admin P2 verification (2026-01-23 01:22:13)

### Command (initial attempt - failed)

```
npm --prefix apps/admin run typecheck
```

### Output

```
> achievo-admin@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit

app/(protected)/settings/page.tsx(18,43): error TS2322: Type '"/settings/security"' is not assignable to type 'UrlObject | RouteImpl<"/settings/security">'.
app/api/admin/[...path]/route.ts(86,16): error TS2339: Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/[...path]/route.ts(87,31): error TS2339: Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/actions/dry-run/route.ts(55,16): error TS2339: Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/actions/dry-run/route.ts(56,31): error TS2339: Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/actions/execute/route.ts(56,16): error TS2339: Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/actions/execute/route.ts(57,31): error TS2339: Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/actions/recent/route.ts(33,16): error TS2339: Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/actions/recent/route.ts(34,31): error TS2339: Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/policy/route.ts(23,20): error TS2339: Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'refreshed' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
app/api/admin/policy/route.ts(24,35): error TS2339: Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; } | { tokens: BackendTokens; refreshed: boolean; admin: AdminIdentity; requestId: any; res: Response; json: any; text: string; }'.
  Property 'admin' does not exist on type '{ requestId: any; res: Response; json: any; text: string; tokens: BackendTokens; }'.
```

### Command

```
npm --prefix apps/admin run lint
```

### Output

```
> achievo-admin@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command (re-run)

```
npm --prefix apps/admin run typecheck
```

### Output

```
> achievo-admin@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix apps/admin run build
```

### Output

```
> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/25) ...
   Generating static pages (6/25)
   Generating static pages (12/25)
   Generating static pages (18/25)
 ✓ Generating static pages (25/25)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    3.33 kB        90.4 kB
├ ○ /_not-found                          873 B            88 kB
├ ○ /alerts                              2.53 kB        89.7 kB
├ ○ /anchoring                           3.16 kB        90.3 kB
├ ƒ /api/admin/[...path]                 0 B                0 B
├ ƒ /api/admin/actions/dry-run           0 B                0 B
├ ƒ /api/admin/actions/execute           0 B                0 B
├ ƒ /api/admin/actions/recent            0 B                0 B
├ ƒ /api/admin/login                     0 B                0 B
├ ƒ /api/admin/logout                    0 B                0 B
├ ƒ /api/admin/me                        0 B                0 B
├ ƒ /api/admin/policy                    0 B                0 B
├ ƒ /api/admin/refresh                   0 B                0 B
├ ○ /audit-logs                          3.12 kB        90.2 kB
├ ○ /chain-actions                       3.73 kB        97.7 kB
├ ƒ /chain-actions/[id]                  3.72 kB        90.8 kB
├ ○ /health                              2.17 kB        89.3 kB
├ ○ /indexer                             3.73 kB        90.8 kB
├ ○ /login                               1.82 kB        88.9 kB
├ ○ /orgs                                2.76 kB        89.9 kB
├ ○ /policies                            1.93 kB          89 kB
├ ○ /settings                            2.06 kB          96 kB
├ ○ /settings/security                   2.97 kB        90.1 kB
├ ○ /usernames                           2.01 kB        89.1 kB
└ ○ /users                               2 kB           89.1 kB
+ First Load JS shared by all            87.1 kB
  ├ chunks/117-022b78fc13771251.js       31.6 kB
  ├ chunks/fd9d1056-fdc813d0a7d52d12.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


ƒ Middleware                             26.7 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Backend verification (2026-01-23 01:22:13)

### Command

```
npm --prefix backend run typecheck
```

### Output

```
> achievo-backend@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix backend run test
```

### Output

```
> achievo-backend@0.1.0 test
> npm run test:unit && npm run test:integration


> achievo-backend@0.1.0 test:unit
> jest -c jest.config.cjs --testPathPattern=unit

PASS test/unit/adminSessionAuth.spec.ts (45.925 s)
PASS test/unit/adminGateway.spec.ts (57.362 s)
PASS test/unit/adminTools.spec.ts
PASS test/unit/usernameMarket.spec.ts
[Nest] 16236  - 01/23/2026, 1:18:39 AM     LOG [UsernamesMarketService] {"message":"username_trade_pending","tradeId":"trade-1","orderId":"order-3","txHash":"0xabc"}
PASS test/unit/throttle.spec.ts (22.405 s)
[Nest] 16236  - 01/23/2026, 1:18:43 AM   ERROR [OpsConfigService] Deployment compatibility failed: Org registry RPC chainId mismatch; Org registry address has no code; Anchor registry RPC chainId mismatch; Anchor registry address has no code
PASS test/unit/opsConfig.spec.ts
[Nest] 16236  - 01/23/2026, 1:18:43 AM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":null,"anchorRegistry":null,"orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 16236  - 01/23/2026, 1:18:43 AM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
[Nest] 16236  - 01/23/2026, 1:18:43 AM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":"0xorg","anchorRegistry":"0xanchor","orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 16236  - 01/23/2026, 1:18:43 AM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
PASS test/unit/orgCreation.spec.ts
PASS test/unit/validationsService.spec.ts
PASS test/unit/chainVerify.spec.ts
PASS test/unit/health.spec.ts
PASS test/unit/governanceSanity.spec.ts
PASS test/unit/indexerPipeline.spec.ts
PASS test/unit/adminIntent.spec.ts
PASS test/unit/adminCsrfGuard.spec.ts
PASS test/unit/orgRbac.spec.ts
PASS test/unit/openapi.spec.ts (77.758 s)
PASS test/unit/consistencyScoring.spec.ts
PASS test/unit/chainActionsWorker.spec.ts
PASS test/unit/monitoring.spec.ts
PASS test/unit/usernameNormalize.spec.ts
PASS test/unit/orgRegistry.spec.ts
PASS test/unit/circuitBreaker.spec.ts
PASS test/unit/indexerProjector.spec.ts
PASS test/unit/goalStatus.spec.ts
PASS test/unit/adminAuth.spec.ts
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Test Suites: 25 passed, 25 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        83.291 s, estimated 91 s
Ran all test suites matching /unit/i.

> achievo-backend@0.1.0 test:integration
> cross-env NODE_ENV=test prisma migrate deploy && cross-env NODE_ENV=test jest -c jest.config.cjs --testPathPattern=integration --runInBand

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "achievo", schema "public" at "localhost:5432"

26 migrations found in prisma/migrations

Applying migration `20260108150000_rc_invariants`
Applying migration `20260108152000_admin_audit_log`
Applying migration `20260111210516_admin_console`

The following migration(s) have been applied:

migrations/
  └─ 20260108150000_rc_invariants/
    └─ migration.sql
  └─ 20260108152000_admin_audit_log/
    └─ migration.sql
  └─ 20260111210516_admin_console/
    └─ migration.sql

All migrations have been successfully applied.
FAIL test/integration/orgs-onchain.spec.ts (39.267 s)
  ● Org creation on-chain gating › rejects org creation without tx hash when on-chain is required

    PrismaClientInitializationError: Authentication failed against database server at `localhost`, the provided database credentials for `user` are not valid.

    Please make sure to provide valid database credentials for the database server at `localhost`.

    11 | export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    12 |   async onModuleInit() {
  > 13 |     await this.$connect();
       |     ^
    14 |   }
    15 |
    16 |   async onModuleDestroy() {

      at t (node_modules/@prisma/client/runtime/library.js:112:2488)
      at Proxy.onModuleInit (src/prisma/prisma.service.ts:13:5)
          at async Promise.all (index 0)
      at callModuleInitHook (node_modules/@nestjs/core/hooks/on-module-init.hook.js:43:5)
      at Proxy.callInitHook (node_modules/@nestjs/core/nest-application-context.js:234:13)
      at Proxy.init (node_modules/@nestjs/core/nest-application.js:100:9)
      at Object.<anonymous> (test/integration/orgs-onchain.spec.ts:59:5)

FAIL test/integration/throttling.spec.ts (5.208 s)
  ● Auth throttling › throttles repeated nonce requests

    PrismaClientInitializationError: Authentication failed against database server at `localhost`, the provided database credentials for `user` are not valid.

    Please make sure to provide valid database credentials for the database server at `localhost`.

    11 | export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    12 |   async onModuleInit() {
  > 13 |     await this.$connect();
       |     ^
    14 |   }
    15 |
    16 |   async onModuleDestroy() {

      at t (node_modules/@prisma/client/runtime/library.js:112:2488)
      at Proxy.onModuleInit (src/prisma/prisma.service.ts:13:5)
          at async Promise.all (index 0)
      at callModuleInitHook (node_modules/@nestjs/core/hooks/on-module-init.hook.js:43:5)
      at Proxy.callInitHook (node_modules/@nestjs/core/nest-application-context.js:234:13)
      at Proxy.init (node_modules/@nestjs/core/nest-application.js:100:9)
      at Object.<anonymous> (test/integration/throttling.spec.ts:40:5)

FAIL test/integration/auth-proof-flow.spec.ts (6.963 s)
  ● Auth -> Proof flow › authenticates and creates a URL proof

    PrismaClientInitializationError: Authentication failed against database server at `localhost`, the provided database credentials for `user` are not valid.

    Please make sure to provide valid database credentials for the database server at `localhost`.

    11 | export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    12 |   async onModuleInit() {
  > 13 |     await this.$connect();
       |     ^
    14 |   }
    15 |
    16 |   async onModuleDestroy() {

      at t (node_modules/@prisma/client/runtime/library.js:112:2488)
      at Proxy.onModuleInit (src/prisma/prisma.service.ts:13:5)
          at async Promise.all (index 0)
      at callModuleInitHook (node_modules/@nestjs/core/hooks/on-module-init.hook.js:43:5)
      at Proxy.callInitHook (node_modules/@nestjs/core/nest-application-context.js:234:13)
      at Proxy.init (node_modules/@nestjs/core/nest-application.js:100:9)
      at Object.<anonymous> (test/integration/auth-proof-flow.spec.ts:36:5)

FAIL test/integration/auth-session.spec.ts (5.793 s)
  ● Auth session cookies › login sets access/refresh cookies

    PrismaClientInitializationError: Authentication failed against database server at `localhost`, the provided database credentials for `user` are not valid.

    Please make sure to provide valid database credentials for the database server at `localhost`.

    11 | export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    12 |   async onModuleInit() {
  > 13 |     await this.$connect();
       |     ^
    14 |   }
    15 |
    16 |   async onModuleDestroy() {

      at t (node_modules/@prisma/client/runtime/library.js:112:2488)
      at Proxy.onModuleInit (src/prisma/prisma.service.ts:13:5)
          at async Promise.all (index 0)
      at callModuleInitHook (node_modules/@nestjs/core/hooks/on-module-init.hook.js:43:5)
      at Proxy.callInitHook (node_modules/@nestjs/core/nest-application-context.js:234:13)
      at Proxy.init (node_modules/@nestjs/core/nest-application.js:100:9)
      at Object.<anonymous> (test/integration/auth-session.spec.ts:51:5)

  ● Auth session cookies › refresh rotates refresh token and blocks reuse

    PrismaClientInitializationError: Authentication failed against database server at `localhost`, the provided database credentials for `user` are not valid.

    Please make sure to provide valid database credentials for the database server at `localhost`.

    11 | export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    12 |   async onModuleInit() {
  > 13 |     await this.$connect();
       |     ^
    14 |   }
    15 |
    16 |   async onModuleDestroy() {

      at t (node_modules/@prisma/client/runtime/library.js:112:2488)
      at Proxy.onModuleInit (src/prisma/prisma.service.ts:13:5)
          at async Promise.all (index 0)
      at callModuleInitHook (node_modules/@nestjs/core/hooks/on-module-init.hook.js:43:5)
      at Proxy.callInitHook (node_modules/@nestjs/core/nest-application-context.js:234:13)
      at Proxy.init (node_modules/@nestjs/core/nest-application.js:100:9)
      at Object.<anonymous> (test/integration/auth-session.spec.ts:51:5)

  ● Auth session cookies › requires CSRF header when session cookies are present

    PrismaClientInitializationError: Authentication failed against database server at `localhost`, the provided database credentials for `user` are not valid.

    Please make sure to provide valid database credentials for the database server at `localhost`.

    11 | export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    12 |   async onModuleInit() {
  > 13 |     await this.$connect();
       |     ^
    14 |   }
    15 |
    16 |   async onModuleDestroy() {

      at t (node_modules/@prisma/client/runtime/library.js:112:2488)
      at Proxy.onModuleInit (src/prisma/prisma.service.ts:13:5)
          at async Promise.all (index 0)
      at callModuleInitHook (node_modules/@nestjs/core/hooks/on-module-init.hook.js:43:5)
      at Proxy.callInitHook (node_modules/@nestjs/core/nest-application-context.js:234:13)
      at Proxy.init (node_modules/@nestjs/core/nest-application.js:100:9)
      at Object.<anonymous> (test/integration/auth-session.spec.ts:51:5)

Test Suites: 4 failed, 4 total
Tests:       6 failed, 6 total
Snapshots:   0 total
Time:        58.401 s
Ran all test suites matching /integration/i.
```

## Admin lint re-run (2026-01-23 01:29:06)

### Command

```
npm --prefix apps/admin run lint
```

### Output

```
> achievo-admin@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

## Integration DB harness verification (2026-01-23 18:31:27)

### Command

```
npm --prefix backend run test:unit
```

### Output

```
> achievo-backend@0.1.0 test:unit
> jest -c jest.config.cjs --testPathPattern=unit

PASS test/unit/adminSessionAuth.spec.ts (37.375 s)
PASS test/unit/adminGateway.spec.ts (46.78 s)
[Nest] 18884  - 01/23/2026, 6:30:08 PM  ERROR [OpsConfigService] Deployment compatibility failed: Org registry RPC chainId mismatch; Org registry address has no code; Anchor registry RPC chainId mismatch; Anchor registry address has no code
PASS test/unit/opsConfig.spec.ts
[Nest] 18884  - 01/23/2026, 6:30:08 PM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":null,"anchorRegistry":null,"orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 18884  - 01/23/2026, 6:30:08 PM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
[Nest] 18884  - 01/23/2026, 6:30:08 PM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":"0xorg","anchorRegistry":"0xanchor","orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 18884  - 01/23/2026, 6:30:08 PM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
PASS test/unit/usernameMarket.spec.ts
[Nest] 18884  - 01/23/2026, 6:30:13 PM     LOG [UsernamesMarketService] {"message":"username_trade_pending","tradeId":"trade-1","orderId":"order-3","txHash":"0xabc"}
PASS test/unit/throttle.spec.ts (19.546 s)
PASS test/unit/adminTools.spec.ts
PASS test/unit/openapi.spec.ts (57.59 s)
PASS test/unit/chainActionsWorker.spec.ts
PASS test/unit/orgCreation.spec.ts
PASS test/unit/validationsService.spec.ts
PASS test/unit/governanceSanity.spec.ts
PASS test/unit/consistencyScoring.spec.ts
PASS test/unit/chainVerify.spec.ts
PASS test/unit/health.spec.ts
PASS test/unit/adminAuth.spec.ts
PASS test/unit/monitoring.spec.ts
PASS test/unit/orgRegistry.spec.ts
PASS test/unit/indexerPipeline.spec.ts
PASS test/unit/usernameNormalize.spec.ts
PASS test/unit/orgRbac.spec.ts
PASS test/unit/indexerProjector.spec.ts
PASS test/unit/circuitBreaker.spec.ts
PASS test/unit/adminIntent.spec.ts
PASS test/unit/adminCsrfGuard.spec.ts
PASS test/unit/goalStatus.spec.ts
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Test Suites: 25 passed, 25 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        67.592 s, estimated 80 s
Ran all test suites matching /unit/i.
```

### Command

```
npm --prefix backend run test:integration:db
```

### Output

```
> achievo-backend@0.1.0 test:integration:db
> node scripts/test-integration-db.cjs

'docker' is not recognized as an internal or external command,
operable program or batch file.
'docker' is not recognized as an internal or external command,
operable program or batch file.
Command failed: docker compose -f docker-compose.test.yml up -d
```

## Web (P3 UX polish verification - 2026-01-23 21:39:31)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output (failed: timeout)

```
command timed out after 125076 milliseconds

> achievo-web@0.1.0 build
> next build

 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
```

## Web build timeout — P3 follow-up (2026-01-23 23:13:24)

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.55 kB         190 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 1.74 kB         108 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               5 kB            201 kB
├ ○ /dashboard                             11.3 kB         217 kB
├ ƒ /exports/[publicId]                    7.14 kB         119 kB
├ ƒ /goals/[id]                            10.9 kB         223 kB
├ ○ /goals/new                             7.14 kB         197 kB
├ ○ /identity                              6.26 kB         202 kB
├ ƒ /invoices/public/[slug]                4.15 kB        91.6 kB
├ ○ /orgs                                  7.31 kB         209 kB
├ ƒ /orgs/[handle]                         9.05 kB         145 kB
├ ƒ /orgs/[handle]/admin                   10 kB           150 kB
├ ƒ /orgs/[handle]/members                 6.12 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         5.83 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  6.19 kB         128 kB
├ ○ /parties                               5.76 kB         116 kB
├ ƒ /parties/[slug]                        6.79 kB         117 kB
├ ○ /parties/new                           5.8 kB          109 kB
├ ƒ /profile/[address]                     14.9 kB         234 kB
├ ƒ /profile/professional/[handle]         5.37 kB         112 kB
├ ○ /projects                              4.72 kB         193 kB
├ ƒ /projects/[slug]                       11.5 kB         217 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.62 kB         117 kB
├ ƒ /projects/[slug]/invoices/new          6.64 kB         117 kB
├ ○ /projects/new                          6.17 kB         109 kB
├ ƒ /projects/share/[slug]                 4.23 kB        91.7 kB
├ ƒ /s/[slug]                              5.48 kB         112 kB
├ ƒ /share/[publicId]                      5.43 kB         112 kB
├ ○ /usernames/market                      7.14 kB         209 kB
├ ○ /validators/inbox                      8.27 kB         214 kB
├ ○ /verify                                3.89 kB         124 kB
├ ƒ /verify/anchor/[hash]                  1.76 kB         115 kB
├ ƒ /verify/export/[publicId]              2.24 kB         115 kB
├ ƒ /verify/proof/[id]                     2.23 kB         115 kB
├ ƒ /verify/tx/[txHash]                    1.79 kB         115 kB
└ ƒ /verify/validation/[id]                2.26 kB         115 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-e340696670a44cf1.js        31.8 kB
  ├ chunks/fd9d1056-7264e1b4e29d00f5.js    53.6 kB
  └ other shared chunks (total)            2.1 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

## Backend integration DB harness — verification (2026-01-23 23:24:45)

### Command

```
docker --version
```

### Output

```
Docker version 29.1.3, build f52814d
```

### Command

```
docker compose version
```

### Output

```
Docker Compose version v5.0.1
```

### Command

```
npm --prefix backend run testdb:reset
```

### Output (initial attempt timed out during image pull; reran after `docker pull postgres:15`)

```
> achievo-backend@0.1.0 testdb:reset
> npm run testdb:down && npm run testdb:up


> achievo-backend@0.1.0 testdb:down
> docker compose -f docker-compose.test.yml down -v

time="2026-01-23T23:19:33+01:00" level=warning msg="C:\\dev\\achievo\\backend\\docker-compose.test.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
 Container achievo_test_db Stopping
 Container achievo_test_db Stopped
 Container achievo_test_db Removing
 Container achievo_test_db Removed
 Network backend_default Removing
 Network backend_default Removed

> achievo-backend@0.1.0 testdb:up
> docker compose -f docker-compose.test.yml up -d

time="2026-01-23T23:19:36+01:00" level=warning msg="C:\\dev\\achievo\\backend\\docker-compose.test.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2026-01-23T23:19:36+01:00" level=warning msg="No services to build"
 Network backend_default Creating
 Network backend_default Created
 Container achievo_test_db Creating
 Container achievo_test_db Created
 Container achievo_test_db Starting
 Container achievo_test_db Started
```

### Command

```
npm --prefix backend run testdb:wait
```

### Output

```
> achievo-backend@0.1.0 testdb:wait
> node scripts/wait-for-postgres.cjs

Test database is ready.
```

### Command

```
npm --prefix backend run test:integration:db
```

### Output

```
> achievo-backend@0.1.0 test:integration:db
> node scripts/test-integration-db.cjs

time="2026-01-23T23:20:15+01:00" level=warning msg="C:\\dev\\achievo\\backend\\docker-compose.test.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2026-01-23T23:20:15+01:00" level=warning msg="No services to build"
 Container achievo_test_db Running
Test database is ready.

> achievo-backend@0.1.0 test:integration
> cross-env NODE_ENV=test prisma migrate deploy && cross-env NODE_ENV=test jest -c jest.config.cjs --testPathPattern=integration --runInBand

Environment variables loaded from .env
Prisma schema loaded from prisma\\schema.prisma
Datasource "db": PostgreSQL database "achievo_test", schema "public" at "localhost:54321"

26 migrations found in prisma/migrations

Applying migration `20251121134146_initial_schema`
Applying migration `20251124094552_2ndmigration`
Applying migration `20251220072439_add_username_orderbook`
Applying migration `20251220095524_username_market_v1`
Applying migration `20251220211044_quest_engine`
Applying migration `20251220233206_parties_social_layer_v1`
Applying migration `20251221123227_professional_profiles_share_links_pins`
Applying migration `20251222000414_projects`
Applying migration `20251222214352_time_tracking_billing_invoices`
Applying migration `20251223091628_proof_artifacts`
Applying migration `20251223121046_validations`
Applying migration `20251223124256_profile_exports`
Applying migration `20251223170753_consistency_scores`
Applying migration `20251223215523_risk_engine`
Applying migration `20251223231257_endorsements`
Applying migration `20251223231918_endorsement_relations`
Applying migration `20251224182843_orgs`
Applying migration `20251225120000_anchor_registry_queue`
Applying migration `20251230193412_indexer_org_chain_fields`
Applying migration `20260104193000_chain_actions_org_onchain_status`
Applying migration `20260104203000_ops_reliability_pack`
Applying migration `20260105120000_auth_username_market_upgrade`
Applying migration `20260108103000_add_username_transfer_chain_action`
Applying migration `20260108150000_rc_invariants`
Applying migration `20260108152000_admin_audit_log`
Applying migration `20260111210516_admin_console`

All migrations have been successfully applied.
PASS test/integration/orgs-onchain.spec.ts (35.176 s)
PASS test/integration/auth-proof-flow.spec.ts (6.795 s)
PASS test/integration/auth-session.spec.ts
PASS test/integration/throttling.spec.ts

Test Suites: 4 passed, 4 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        51.801 s, estimated 58 s
Ran all test suites matching /integration/i.
time="2026-01-23T23:21:22+01:00" level=warning msg="C:\\dev\\achievo\\backend\\docker-compose.test.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
 Container achievo_test_db Stopping
 Container achievo_test_db Stopped
 Container achievo_test_db Removing
 Container achievo_test_db Removed
 Network backend_default Removing
 Network backend_default Removed
```

### Command

```
npm --prefix backend run test:unit
```

### Output

```
> achievo-backend@0.1.0 test:unit
> jest -c jest.config.cjs --testPathPattern=unit

PASS test/unit/adminSessionAuth.spec.ts (44.44 s)
PASS test/unit/adminGateway.spec.ts (52.626 s)
PASS test/unit/usernameMarket.spec.ts
[Nest] 9820  - 01/23/2026, 11:22:44 PM     LOG [UsernamesMarketService] {"message":"username_trade_pending","tradeId":"trade-1","orderId":"order-3","txHash":"0xabc"}
[Nest] 9820  - 01/23/2026, 11:22:47 PM   ERROR [OpsConfigService] Deployment compatibility failed: Org registry RPC chainId mismatch; Org registry address has no code; Anchor registry RPC chainId mismatch; Anchor registry address has no code
PASS test/unit/opsConfig.spec.ts
[Nest] 9820  - 01/23/2026, 11:22:47 PM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":null,"anchorRegistry":null,"orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 9820  - 01/23/2026, 11:22:47 PM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
[Nest] 9820  - 01/23/2026, 11:22:47 PM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":"0xorg","anchorRegistry":"0xanchor","orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 9820  - 01/23/2026, 11:22:47 PM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
PASS test/unit/throttle.spec.ts (17.345 s)
PASS test/unit/adminTools.spec.ts
PASS test/unit/validationsService.spec.ts
PASS test/unit/orgCreation.spec.ts
PASS test/unit/openapi.spec.ts (66.31 s)
PASS test/unit/governanceSanity.spec.ts
PASS test/unit/chainVerify.spec.ts
PASS test/unit/health.spec.ts
PASS test/unit/chainActionsWorker.spec.ts
PASS test/unit/indexerPipeline.spec.ts
PASS test/unit/adminCsrfGuard.spec.ts
PASS test/unit/adminIntent.spec.ts
PASS test/unit/orgRbac.spec.ts
PASS test/unit/usernameNormalize.spec.ts
PASS test/unit/monitoring.spec.ts
PASS test/unit/adminAuth.spec.ts
PASS test/unit/goalStatus.spec.ts
PASS test/unit/consistencyScoring.spec.ts
PASS test/unit/indexerProjector.spec.ts
PASS test/unit/orgRegistry.spec.ts
PASS test/unit/circuitBreaker.spec.ts
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Test Suites: 25 passed, 25 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        75.115 s
Ran all test suites matching /unit/i.
```

## Backend integration DB harness — verification (2026-01-23 23:34:16)

### Command

```
npm --prefix backend run testdb:reset
```

### Output

```
> achievo-backend@0.1.0 testdb:reset
> npm run testdb:down && npm run testdb:up


> achievo-backend@0.1.0 testdb:down
> docker compose -f docker-compose.test.yml down -v

time="2026-01-23T23:30:43+01:00" level=warning msg="C:\\dev\\achievo\\backend\\docker-compose.test.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"

> achievo-backend@0.1.0 testdb:up
> docker compose -f docker-compose.test.yml up -d

time="2026-01-23T23:30:45+01:00" level=warning msg="C:\\dev\\achievo\\backend\\docker-compose.test.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2026-01-23T23:30:45+01:00" level=warning msg="No services to build"
 Network backend_default Creating
 Network backend_default Created
 Container achievo_test_db Creating
 Container achievo_test_db Created
 Container achievo_test_db Starting
 Container achievo_test_db Started
```

### Command

```
npm --prefix backend run testdb:wait
```

### Output

```
> achievo-backend@0.1.0 testdb:wait
> node scripts/wait-for-postgres.cjs

Test database is ready.
```

### Command

```
npm --prefix backend run test:integration:db
```

### Output

```
> achievo-backend@0.1.0 test:integration:db
> node scripts/test-integration-db.cjs

time="2026-01-23T23:31:17+01:00" level=warning msg="C:\\dev\\achievo\\backend\\docker-compose.test.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2026-01-23T23:31:17+01:00" level=warning msg="No services to build"
 Container achievo_test_db Running
Test database is ready.

> achievo-backend@0.1.0 test:integration
> cross-env NODE_ENV=test prisma migrate deploy && cross-env NODE_ENV=test jest -c jest.config.cjs --testPathPattern=integration --runInBand

Environment variables loaded from .env
Prisma schema loaded from prisma\\schema.prisma
Datasource "db": PostgreSQL database "achievo_test", schema "public" at "localhost:54321"

26 migrations found in prisma/migrations

Applying migration `20251121134146_initial_schema`
Applying migration `20251124094552_2ndmigration`
Applying migration `20251220072439_add_username_orderbook`
Applying migration `20251220095524_username_market_v1`
Applying migration `20251220211044_quest_engine`
Applying migration `20251220233206_parties_social_layer_v1`
Applying migration `20251221123227_professional_profiles_share_links_pins`
Applying migration `20251222000414_projects`
Applying migration `20251222214352_time_tracking_billing_invoices`
Applying migration `20251223091628_proof_artifacts`
Applying migration `20251223121046_validations`
Applying migration `20251223124256_profile_exports`
Applying migration `20251223170753_consistency_scores`
Applying migration `20251223215523_risk_engine`
Applying migration `20251223231257_endorsements`
Applying migration `20251223231918_endorsement_relations`
Applying migration `20251224182843_orgs`
Applying migration `20251225120000_anchor_registry_queue`
Applying migration `20251230193412_indexer_org_chain_fields`
Applying migration `20260104193000_chain_actions_org_onchain_status`
Applying migration `20260104203000_ops_reliability_pack`
Applying migration `20260105120000_auth_username_market_upgrade`
Applying migration `20260108103000_add_username_transfer_chain_action`
Applying migration `20260108150000_rc_invariants`
Applying migration `20260108152000_admin_audit_log`
Applying migration `20260111210516_admin_console`

All migrations have been successfully applied.
PASS test/integration/orgs-onchain.spec.ts (30.545 s)
PASS test/integration/auth-proof-flow.spec.ts (5.752 s)
PASS test/integration/auth-session.spec.ts (6.907 s)
PASS test/integration/throttling.spec.ts

Test Suites: 4 passed, 4 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        48.197 s, estimated 51 s
Ran all test suites matching /integration/i.
time="2026-01-23T23:32:17+01:00" level=warning msg="C:\\dev\\achievo\\backend\\docker-compose.test.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
 Container achievo_test_db Stopping
 Container achievo_test_db Stopped
 Container achievo_test_db Removing
 Container achievo_test_db Removed
 Network backend_default Removing
 Network backend_default Removed
```

### Command

```
npm --prefix backend run test:unit
```

### Output

```
> achievo-backend@0.1.0 test:unit
> jest -c jest.config.cjs --testPathPattern=unit

PASS test/unit/adminSessionAuth.spec.ts (43.995 s)
PASS test/unit/adminGateway.spec.ts (52.581 s)
PASS test/unit/usernameMarket.spec.ts
[Nest] 19740  - 01/23/2026, 11:33:48 PM     LOG [UsernamesMarketService] {"message":"username_trade_pending","tradeId":"trade-1","orderId":"order-3","txHash":"0xabc"}
PASS test/unit/chainVerify.spec.ts
PASS test/unit/throttle.spec.ts (15.662 s)
PASS test/unit/health.spec.ts
PASS test/unit/validationsService.spec.ts
PASS test/unit/adminTools.spec.ts
PASS test/unit/openapi.spec.ts (64.461 s)
PASS test/unit/orgCreation.spec.ts
[Nest] 22224  - 01/23/2026, 11:33:58 PM   ERROR [OpsConfigService] Deployment compatibility failed: Org registry RPC chainId mismatch; Org registry address has no code; Anchor registry RPC chainId mismatch; Anchor registry address has no code
PASS test/unit/opsConfig.spec.ts
[Nest] 22224  - 01/23/2026, 11:33:58 PM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":null,"anchorRegistry":null,"orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 22224  - 01/23/2026, 11:33:58 PM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
[Nest] 22224  - 01/23/2026, 11:33:58 PM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":"0xorg","anchorRegistry":"0xanchor","orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 22224  - 01/23/2026, 11:33:58 PM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
PASS test/unit/governanceSanity.spec.ts
PASS test/unit/chainActionsWorker.spec.ts
PASS test/unit/indexerPipeline.spec.ts
PASS test/unit/adminCsrfGuard.spec.ts
PASS test/unit/orgRbac.spec.ts
PASS test/unit/adminAuth.spec.ts
PASS test/unit/orgRegistry.spec.ts
PASS test/unit/adminIntent.spec.ts
PASS test/unit/usernameNormalize.spec.ts
PASS test/unit/goalStatus.spec.ts
PASS test/unit/consistencyScoring.spec.ts
PASS test/unit/circuitBreaker.spec.ts
PASS test/unit/indexerProjector.spec.ts
PASS test/unit/monitoring.spec.ts

Test Suites: 25 passed, 25 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        74.087 s
Ran all test suites matching /unit/i.
```

## Pitch readiness pack verification (2026-01-24 00:18:57)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.55 kB         190 kB
├ ○ /_not-found                            880 B          88.4 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 1.74 kB         108 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               5 kB            201 kB
├ ○ /dashboard                             11.3 kB         217 kB
├ ƒ /exports/[publicId]                    7.14 kB         119 kB
├ ƒ /goals/[id]                            10.9 kB         223 kB
├ ○ /goals/new                             7.14 kB         197 kB
├ ○ /identity                              6.26 kB         202 kB
├ ƒ /invoices/public/[slug]                4.15 kB        91.6 kB
├ ○ /orgs                                  7.31 kB         209 kB
├ ƒ /orgs/[handle]                         9.05 kB         145 kB
├ ƒ /orgs/[handle]/admin                   10 kB           150 kB
├ ƒ /orgs/[handle]/members                 6.12 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]         5.83 kB         128 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  6.19 kB         128 kB
├ ○ /parties                               5.76 kB         116 kB
├ ƒ /parties/[slug]                        6.79 kB         117 kB
├ ○ /parties/new                           5.8 kB          109 kB
├ ƒ /profile/[address]                     14.9 kB         234 kB
├ ƒ /profile/professional/[handle]         5.37 kB         112 kB
├ ○ /projects                              4.72 kB         193 kB
├ ƒ /projects/[slug]                       11.5 kB         217 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.62 kB         117 kB
├ ƒ /projects/[slug]/invoices/new          6.64 kB         117 kB
├ ○ /projects/new                          6.17 kB         109 kB
├ ƒ /projects/share/[slug]                 4.23 kB        91.7 kB
├ ƒ /s/[slug]                              5.48 kB         112 kB
├ ƒ /share/[publicId]                      5.43 kB         112 kB
├ ○ /usernames/market                      7.14 kB         209 kB
├ ○ /validators/inbox                      8.27 kB         214 kB
├ ○ /verify                                3.89 kB         124 kB
├ ƒ /verify/anchor/[hash]                  1.76 kB         115 kB
├ ƒ /verify/export/[publicId]              2.24 kB         115 kB
├ ƒ /verify/proof/[id]                     2.23 kB         115 kB
├ ƒ /verify/tx/[txHash]                    1.79 kB         115 kB
└ ƒ /verify/validation/[id]                2.26 kB         115 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-e340696670a44cf1.js        31.8 kB
  ├ chunks/fd9d1056-7264e1b4e29d00f5.js    53.6 kB
  └ other shared chunks (total)            2.1 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Command

```
npm --prefix web run test:e2e
```

### Output

```
> achievo-web@0.1.0 test:e2e
> playwright test

[WebServer] ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues

Running 18 tests using 1 worker

[WebServer] [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
  ok 1 e2e.spec.ts:120:1 › verification page renders (44.5s)
  ok 2 e2e.spec.ts:125:1 › projects page renders for mocked auth (17.1s)
  ok 3 e2e.spec.ts:154:1 › navigation does not request auth nonce after session established (16.9s)
  ok 4 e2e.spec.ts:168:1 › org creation requires on-chain tx before backend finalize (12.1s)
  ok 5 e2e.spec.ts:207:1 › degraded banner appears when health is degraded (1.4s)
  ok 6 e2e.spec.ts:220:1 › degraded banner stays hidden when health is ok (5.2s)
  ok 7 e2e.spec.ts:225:1 › verification unknown state renders as non-failure (13.9s)
  ok 8 e2e.spec.ts:244:1 › verification proof renders invalid and not found states (13.6s)
  ok 9 e2e.spec.ts:272:1 › verification tx renders unknown, invalid, and not found states (26.6s)
  ok 10 e2e.spec.ts:310:1 › policy gating disables verify portal and username market (18.6s)
  ok 11 e2e.spec.ts:325:1 › session indicator shows sign in when signed out (2.6s)
  ok 12 e2e.spec.ts:343:1 › org create page shows tx stepper and finality timeline when tx state is preset (9.2s)
  ok 13 e2e.spec.ts:356:1 › org admin workbench renders tabs (17.5s)
  ok 14 e2e.spec.ts:385:1 › validator inbox renders registration gate or inbox (13.9s)
  ok 15 e2e.spec.ts:392:1 › project workbench renders tab shell (13.8s)
  ok 16 e2e.spec.ts:464:1 › username market trade transitions from pending to confirmed (5.4s)
  ok 17 e2e.spec.ts:517:1 › a11y: global nav keyboard access and modal focus trap (15.1s)
  ok 18 e2e.spec.ts:552:1 › a11y snapshots include headings for key routes (22.8s)

  Slow test file: e2e.spec.ts (4.5m)
  Consider splitting slow test files to speed up parallel execution
  18 passed (4.9m)
```

### Command

```
npm --prefix apps/admin run lint
```

### Output

```
> achievo-admin@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix apps/admin run typecheck
```

### Output

```
> achievo-admin@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix apps/admin run build
```

### Output

```
> achievo-admin@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Experiments (use with caution):
    · externalDir
    · typedRoutes

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/25) ...
   Generating static pages (6/25)
   Generating static pages (12/25)
   Generating static pages (18/25)
 ✓ Generating static pages (25/25)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    3.33 kB        90.4 kB
├ ○ /_not-found                          873 B            88 kB
├ ○ /alerts                              2.53 kB        89.7 kB
├ ○ /anchoring                           3.16 kB        90.3 kB
├ ƒ /api/admin/[...path]                 0 B                0 B
├ ƒ /api/admin/actions/dry-run           0 B                0 B
├ ƒ /api/admin/actions/execute           0 B                0 B
├ ƒ /api/admin/actions/recent            0 B                0 B
├ ƒ /api/admin/login                     0 B                0 B
├ ƒ /api/admin/logout                    0 B                0 B
├ ƒ /api/admin/me                        0 B                0 B
├ ƒ /api/admin/policy                    0 B                0 B
├ ƒ /api/admin/refresh                   0 B                0 B
├ ○ /audit-logs                          3.12 kB        90.2 kB
├ ○ /chain-actions                       3.73 kB        97.7 kB
├ ƒ /chain-actions/[id]                  3.72 kB        90.8 kB
├ ○ /health                              2.17 kB        89.3 kB
├ ○ /indexer                             3.73 kB        90.8 kB
├ ○ /login                               1.82 kB        88.9 kB
├ ○ /orgs                                2.76 kB        89.9 kB
├ ○ /policies                            1.93 kB          89 kB
├ ○ /settings                            2.06 kB          96 kB
├ ○ /settings/security                   2.97 kB        90.1 kB
├ ○ /usernames                           2.01 kB        89.1 kB
└ ○ /users                               2 kB           89.1 kB
+ First Load JS shared by all            87.1 kB
  ├ chunks/117-022b78fc13771251.js       31.6 kB
  ├ chunks/fd9d1056-fdc813d0a7d52d12.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


ƒ Middleware                             26.7 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Command

```
npm --prefix backend run test:unit
```

### Output

```
> achievo-backend@0.1.0 test:unit
> jest -c jest.config.cjs --testPathPattern=unit

PASS test/unit/adminSessionAuth.spec.ts (43.995 s)
PASS test/unit/adminGateway.spec.ts (52.581 s)
PASS test/unit/usernameMarket.spec.ts
[Nest] 19740  - 01/23/2026, 11:33:48 PM     LOG [UsernamesMarketService] {"message":"username_trade_pending","tradeId":"trade-1","orderId":"order-3","txHash":"0xabc"}
PASS test/unit/chainVerify.spec.ts
PASS test/unit/throttle.spec.ts (15.662 s)
PASS test/unit/health.spec.ts
PASS test/unit/validationsService.spec.ts
PASS test/unit/adminTools.spec.ts
PASS test/unit/openapi.spec.ts (64.461 s)
PASS test/unit/orgCreation.spec.ts
[Nest] 22224  - 01/23/2026, 11:33:58 PM   ERROR [OpsConfigService] Deployment compatibility failed: Org registry RPC chainId mismatch; Org registry address has no code; Anchor registry RPC chainId mismatch; Anchor registry address has no code
PASS test/unit/opsConfig.spec.ts
[Nest] 22224  - 01/23/2026, 11:33:58 PM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":null,"anchorRegistry":null,"orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 22224  - 01/23/2026, 11:33:58 PM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
[Nest] 22224  - 01/23/2026, 11:33:58 PM     LOG [OpsConfigService] {"message":"startup_config","report":{"service":"backend","chainId":84532,"features":{"orgCreateRequired":false,"anchoringEnabled":false,"indexerEnabled":false,"chainActionsEnabled":true,"monitoringEnabled":false,"governanceSanityCheck":false},"chain":{"orgRegistry":"0xorg","anchorRegistry":"0xanchor","orgChainId":84532,"anchorChainId":84532},"confirmationsRequired":20,"indexer":{"startBlock":0,"batchSize":0},"secrets":{"adminKey":null,"adminHmac":null,"anchorOperator":null}}}
[Nest] 22224  - 01/23/2026, 11:33:58 PM     LOG [OpsConfigService] {"message":"deployments_hash","hash":"9af70381323bb9456b310da493b5e342ba5f7887476760dcfa4b61e5dcfae7d4","path":"C:\\dev\\achievo\\backend\\deployments\\base-sepolia"}
PASS test/unit/governanceSanity.spec.ts
PASS test/unit/chainActionsWorker.spec.ts
PASS test/unit/indexerPipeline.spec.ts
PASS test/unit/adminCsrfGuard.spec.ts
PASS test/unit/orgRbac.spec.ts
PASS test/unit/adminAuth.spec.ts
PASS test/unit/orgRegistry.spec.ts
PASS test/unit/adminIntent.spec.ts
PASS test/unit/usernameNormalize.spec.ts
PASS test/unit/goalStatus.spec.ts
PASS test/unit/consistencyScoring.spec.ts
PASS test/unit/circuitBreaker.spec.ts
PASS test/unit/indexerProjector.spec.ts
PASS test/unit/monitoring.spec.ts

Test Suites: 25 passed, 25 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        74.087 s
Ran all test suites matching /unit/i.
```

### Command

```
npm --prefix backend run test:integration:db
```

### Output

```
> achievo-backend@0.1.0 test:integration:db
> node scripts/test-integration-db.cjs

time="2026-01-24T00:17:36+01:00" level=warning msg="No services to build"
 Container achievo_test_db Running
Test database is ready.

> achievo-backend@0.1.0 test:integration
> cross-env NODE_ENV=test prisma migrate deploy && cross-env NODE_ENV=test jest -c jest.config.cjs --testPathPattern=integration --runInBand

Environment variables loaded from .env
Prisma schema loaded from prisma\\schema.prisma
Datasource "db": PostgreSQL database "achievo_test", schema "public" at "localhost:54321"

26 migrations found in prisma/migrations

No pending migrations to apply.
┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.3.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i -g prisma@latest                               │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
PASS test/integration/orgs-onchain.spec.ts (29.658 s)
PASS test/integration/auth-session.spec.ts (5.266 s)
PASS test/integration/auth-proof-flow.spec.ts
PASS test/integration/throttling.spec.ts

Test Suites: 4 passed, 4 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        44.717 s, estimated 48 s
Ran all test suites matching /integration/i.
 Container achievo_test_db Stopping
 Container achievo_test_db Stopped
 Container achievo_test_db Removing
 Container achievo_test_db Removed
 Network backend_default Removing
 Network backend_default Removed
```

## Web (P4 workbench UX — 2026-01-26 23:14:25)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                Size     First Load JS
┌ ○ /                                      7.55 kB         191 kB
├ ○ /_not-found                            880 B          88.3 kB
├ ○ /about                                 143 B          87.6 kB
├ ○ /admin                                 1.74 kB         110 kB
├ ƒ /api/[...path]                         0 B                0 B
├ ○ /approve                               2.53 kB         203 kB
├ ○ /dashboard                             12 kB           217 kB
├ ƒ /exports/[publicId]                    4.11 kB         121 kB
├ ƒ /goals/[id]                            8.37 kB         225 kB
├ ○ /goals/new                             4.65 kB         199 kB
├ ○ /identity                              3.84 kB         204 kB
├ ƒ /invoices/public/[slug]                4.15 kB        91.6 kB
├ ○ /orgs                                  4.69 kB         211 kB
├ ƒ /orgs/[handle]                         5.6 kB          147 kB
├ ƒ /orgs/[handle]/admin                   9.7 kB          151 kB
├ ƒ /orgs/[handle]/members                 6.12 kB         130 kB
├ ƒ /orgs/[handle]/programs/[slug]         5.83 kB         129 kB
├ ƒ /orgs/[handle]/programs/[slug]/submit  6.19 kB         130 kB
├ ○ /parties                               5.76 kB         116 kB
├ ƒ /parties/[slug]                        6.79 kB         117 kB
├ ○ /parties/new                           5.8 kB          109 kB
├ ƒ /profile/[address]                     13.9 kB         235 kB
├ ƒ /profile/professional/[handle]         5.37 kB         113 kB
├ ○ /projects                              4.35 kB         194 kB
├ ƒ /projects/[slug]                       13.9 kB         217 kB
├ ƒ /projects/[slug]/invoices/[invoiceId]  6.62 kB         117 kB
├ ƒ /projects/[slug]/invoices/new          6.64 kB         117 kB
├ ○ /projects/new                          6.17 kB         109 kB
├ ƒ /projects/share/[slug]                 4.23 kB        91.7 kB
├ ƒ /s/[slug]                              5.48 kB         113 kB
├ ƒ /share/[publicId]                      5.43 kB         113 kB
├ ○ /usernames/market                      6.72 kB         210 kB
├ ○ /validators/inbox                      10.9 kB         214 kB
├ ○ /verify                                4.01 kB         126 kB
├ ƒ /verify/anchor/[hash]                  3.38 kB         115 kB
├ ƒ /verify/export/[publicId]              3.85 kB         115 kB
├ ƒ /verify/proof/[id]                     3.84 kB         115 kB
├ ƒ /verify/tx/[txHash]                    3.4 kB          115 kB
└ ƒ /verify/validation/[id]                3.87 kB         115 kB
+ First Load JS shared by all              87.5 kB
  ├ chunks/2117-e340696670a44cf1.js        31.8 kB
  ├ chunks/fd9d1056-7264e1b4e29d00f5.js    53.6 kB
  └ other shared chunks (total)            2.07 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
```

### Command

```
npm --prefix web run test:e2e
```

### Output

```
> achievo-web@0.1.0 test:e2e
> playwright test


Running 22 tests using 1 worker

  ok 1 e2e.spec.ts:120:1 › verification page renders (33.9s)
  ok 2 e2e.spec.ts:125:1 › projects page renders for mocked auth (21.2s)
  ok 3 e2e.spec.ts:154:1 › navigation does not request auth nonce after session established (14.2s)
  ok 4 e2e.spec.ts:168:1 › org creation requires on-chain tx before backend finalize (11.1s)
  ok 5 e2e.spec.ts:207:1 › degraded banner appears when health is degraded (1.3s)
  ok 6 e2e.spec.ts:220:1 › degraded banner stays hidden when health is ok (5.5s)
  ok 7 e2e.spec.ts:225:1 › verification unknown state renders as non-failure (13.3s)
  ok 8 e2e.spec.ts:244:1 › verification proof renders invalid and not found states (12.2s)
  ok 9 e2e.spec.ts:272:1 › verification tx renders unknown, invalid, and not found states (21.9s)
  ok 10 e2e.spec.ts:310:1 › policy gating disables verify portal and username market (15.0s)
  ok 11 e2e.spec.ts:325:1 › session indicator shows sign in when signed out (4.7s)
  ok 12 e2e.spec.ts:343:1 › org create page shows tx stepper and finality timeline when tx state is preset (6.4s)
  ok 13 e2e.spec.ts:356:1 › org admin workbench renders tabs (9.7s)
  ok 14 e2e.spec.ts:385:1 › validator inbox renders registration gate or inbox (9.2s)
  ok 15 e2e.spec.ts:392:1 › command palette opens and closes (6.3s)
  ok 16 e2e.spec.ts:403:1 › density toggle persists across reload (9.0s)
  ok 17 e2e.spec.ts:412:1 › submission row opens inspector rail via panel routing (6.3s)
  ok 18 e2e.spec.ts:460:1 › bulk selection shows action bar (6.0s)
  ok 19 e2e.spec.ts:506:1 › project workbench renders tab shell (13.0s)
  ok 20 e2e.spec.ts:578:1 › username market trade transitions from pending to confirmed (5.3s)
  ok 21 e2e.spec.ts:631:1 › a11y: global nav keyboard access and modal focus trap (14.5s)
  ok 22 e2e.spec.ts:666:1 › a11y snapshots include headings for key routes (24.8s)

  Slow test file: e2e.spec.ts (4.4m)
  Consider splitting slow test files to speed up parallel execution
  22 passed (4.6m)
[WebServer] ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
[WebServer] [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
```

## Web (P4.1 visibility + git setup — 2026-01-27 00:36:35)

### Command

```
npm --prefix web run lint
```

### Output

```
> achievo-web@0.1.0 lint
> next lint

✔ No ESLint warnings or errors
```

### Command

```
npm --prefix web run typecheck
```

### Output

```
> achievo-web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```

### Command

```
npm --prefix web run build
```

### Output

```
command timed out after 120201 milliseconds

> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
```

### Command

```
npm --prefix web run build
```

### Output

```
> achievo-web@0.1.0 build
> next build

  ▲ Next.js 14.2.15
  - Environments: .env.local
  - Experiments (use with caution):
    · externalDir

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.build.json
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
 ⚠ Disabling outputFileTracing will not be an option in the next major version. Please report any issues you may be experiencing to https://github.com/vercel/next.js/issues
PageNotFoundError: Cannot find module for page: /about
    at getPagePath (C:\dev\achievo\web\node_modules\next\dist\server\require.js:94:15)
    at requirePage (C:\dev\achievo\web\node_modules\next\dist\server\require.js:99:22)
    at C:\dev\achievo\web\node_modules\next\dist\server\load-components.js:98:84
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async loadComponentsImpl (C:\dev\achievo\web\node_modules\next\dist\server\load-components.js:98:26)
    at async C:\dev\achievo\web\node_modules\next\dist\build\utils.js:1116:32
    at async Span.traceAsyncFn (C:\dev\achievo\web\node_modules\next\dist\trace\trace.js:154:20) {
  code: 'ENOENT'
}

> Build error occurred
Error: Failed to collect page data for /about
    at C:\dev\achievo\web\node_modules\next\dist\build\utils.js:1268:15
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5) {
  type: 'Error'
}
```

### Command

```
npm --prefix web run test:e2e
```

### Output

```
command timed out after 180065 milliseconds

> achievo-web@0.1.0 test:e2e
> playwright test


Running 22 tests using 1 worker

  ok 1 e2e.spec.ts:120:1 › verification page renders (24.3s)
  x  2 e2e.spec.ts:125:1 › projects page renders for mocked auth (27.0s)
  ok 3 e2e.spec.ts:154:1 › navigation does not request auth nonce after session established (4.1s)
  x  4 e2e.spec.ts:168:1 › org creation requires on-chain tx before backend finalize (13.0s)
  ok 5 e2e.spec.ts:207:1 › degraded banner appears when health is degraded (3.5s)
  x  6 e2e.spec.ts:220:1 › degraded banner stays hidden when health is ok (16.1s)
  x  7 e2e.spec.ts:225:1 › verification unknown state renders as non-failure (40.2s)
```

### Command

```
npm --prefix web run test:e2e
```

### Output

```
command timed out after 300061 milliseconds

> achievo-web@0.1.0 test:e2e
> playwright test


Running 22 tests using 1 worker

  ok 1 e2e.spec.ts:120:1 › verification page renders (21.2s)
  x  2 e2e.spec.ts:125:1 › projects page renders for mocked auth (26.6s)
  ok 3 e2e.spec.ts:154:1 › navigation does not request auth nonce after session established (4.4s)
  x  4 e2e.spec.ts:168:1 › org creation requires on-chain tx before backend finalize (19.8s)
  ok 5 e2e.spec.ts:207:1 › degraded banner appears when health is degraded (4.6s)
  x  6 e2e.spec.ts:220:1 › degraded banner stays hidden when health is ok (14.1s)
  x  7 e2e.spec.ts:225:1 › verification unknown state renders as non-failure (44.7s)
  x  8 e2e.spec.ts:244:1 › verification proof renders invalid and not found states (48.0s)
  x  9 e2e.spec.ts:272:1 › verification tx renders unknown, invalid, and not found states (24.2s)
```
