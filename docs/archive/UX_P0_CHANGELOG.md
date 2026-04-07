# P0 UX Foundation Changelog

This changelog captures the P0 UX foundation work. It lists all modified files with exact paths and ties changes to routes.
> **User-friendly release notes** (for customers and stakeholders): [UX_P0_RELEASE_NOTES.md](./UX_P0_RELEASE_NOTES.md)

## Changed Files

### Docs
- `docs/UX_UI_BLUEPRINT.md` — updated blueprint with explicit file paths and P0 implementation pointers.
- `docs/UX_BACKLOG.md` — P0/P1 backlog framing and next steps.
- `docs/UX_P0_CHANGELOG.md` — audit-grade change report (this document).
- `docs/SMOKE_TEST_P0.md` — route-by-route smoke test script.
- `web/UX_NOTES.md` — engineering rules for UI structure and state handling.
- `web/components/states/StateContracts.md` — explicit state contracts for load, tx, and access gating.

### Components / Shared UI
- `web/components/layout/PageLayout.tsx` — canonical layout wrapper.
- `web/components/nav/GlobalNav.tsx` — primary navigation + account menu + admin heuristic.
- `web/components/nav/PageHeader.tsx` — title, breadcrumbs, actions.
- `web/components/states/LoadingState.tsx` — consistent loading skeleton.
- `web/components/states/EmptyState.tsx` — empty state with CTA(s).
- `web/components/states/ErrorState.tsx` — error state with retry and request id rendering.
- `web/components/states/AuthRequired.tsx` — sign-in gated state.
- `web/components/states/ChainRequired.tsx` — wrong-chain gating state.
- `web/components/tx/TxTypes.ts` — transaction state types.
- `web/components/tx/TxStepper.tsx` — transaction progress UI + dev invariants.
- `web/components/tx/useTxLifecycle.ts` — tx lifecycle hook returning deterministic results.
- `web/components/domain/verify/VerifyResultCard.tsx` — normalized verify status card.
- `web/components/StatusPill.tsx` — normalized status pill for goals/orders/trades.

### Hooks / Lib
- `web/hooks/useIdentity.ts` — identity registration now uses TxStepper lifecycle.
- `web/lib/apiError.ts` — request id extraction for error states.

### Pages / Routes
- `web/app/dashboard/page.tsx` — PageHeader + AuthRequired + ErrorState integration.
- `web/app/identity/page.tsx` — PageHeader, TxStepper, and accurate identity copy.
- `web/app/orgs/page.tsx` — TxStepper org create flow + ChainRequired + ErrorState w/ request id.
- `web/app/orgs/[handle]/page.tsx` — Loading/Empty/Error state normalization.
- `web/app/projects/page.tsx` — PageHeader + state handling + request id surfacing.
- `web/app/usernames/market/page.tsx` — settlement clarity + status precision + state handling.
- `web/app/verify/page.tsx` — PageHeader normalization.
- `web/app/verify/proof/[id]/page.tsx` — VerifyResultCard + unknown/invalid normalization.
- `web/app/verify/validation/[id]/page.tsx` — VerifyResultCard + unknown/invalid normalization.
- `web/app/verify/export/[publicId]/page.tsx` — VerifyResultCard + unknown/invalid normalization.
- `web/app/verify/anchor/[hash]/page.tsx` — VerifyResultCard + unknown/invalid normalization.
- `web/app/verify/tx/[txHash]/page.tsx` — VerifyResultCard + unknown/invalid normalization.
- `web/app/goals/new/page.tsx` — TxStepper integration and standardized header.
- `web/app/approve/page.tsx` — TxStepper integration and standardized header.

## Route Changes (Key UX Updates)

- `/dashboard` → `web/app/dashboard/page.tsx`
  - Added `PageHeader`.
  - Added `AuthRequired` gate.
  - Standardized errors via `ErrorState`.

- `/identity` → `web/app/identity/page.tsx`
  - Added `PageHeader`.
  - Integrated `TxStepper` for identity claim.
  - Copy updated to reflect partial recovery/sub-wallet UI.

- `/orgs` → `web/app/orgs/page.tsx`
  - Prepare → sign → confirm → finalize flow surfaced via `TxStepper`.
  - Added `ChainRequired` and `ErrorState` with request id.

- `/orgs/[handle]` → `web/app/orgs/[handle]/page.tsx`
  - Standardized loading/empty/error states.
  - Added `PageHeader` with actions.

- `/projects` → `web/app/projects/page.tsx`
  - Standardized loading/empty/error/auth states.
  - Added `PageHeader` with primary CTA.

- `/usernames/market` → `web/app/usernames/market/page.tsx`
  - Added settlement mode panel.
  - Normalized order/trade statuses and pending states.

- `/verify` → `web/app/verify/page.tsx`
  - Added `PageHeader` for consistent layout.

- `/verify/proof/[id]` → `web/app/verify/proof/[id]/page.tsx`
  - Added `VerifyResultCard` with UNKNOWN/NOT_FOUND distinctions.

- `/verify/validation/[id]` → `web/app/verify/validation/[id]/page.tsx`
  - Added `VerifyResultCard` with UNKNOWN/NOT_FOUND distinctions.

- `/verify/export/[publicId]` → `web/app/verify/export/[publicId]/page.tsx`
  - Added `VerifyResultCard` with UNKNOWN/NOT_FOUND distinctions.

- `/verify/anchor/[hash]` → `web/app/verify/anchor/[hash]/page.tsx`
  - Added `VerifyResultCard` with UNKNOWN vs INVALID messaging.

- `/verify/tx/[txHash]` → `web/app/verify/tx/[txHash]/page.tsx`
  - Added `VerifyResultCard` with UNKNOWN vs INVALID messaging.

- `/goals/new` → `web/app/goals/new/page.tsx`
  - Integrated `TxStepper` for goal creation.

- `/approve` → `web/app/approve/page.tsx`
  - Integrated `TxStepper` for approval submission.

## Modified Files Not Directly Bound to a Route

- `web/components/layout/PageLayout.tsx` — layout wrapper used by all routes.
- `web/components/nav/GlobalNav.tsx` — shared navigation used by all routes.
- `web/components/nav/PageHeader.tsx` — shared header used by multiple routes.
- `web/components/states/*` — shared loading/empty/error/auth/chain states.
- `web/components/tx/*` — shared transaction UX.
- `web/components/domain/verify/VerifyResultCard.tsx` — shared verify status card.
- `web/components/StatusPill.tsx` — shared status badge rendering.
- `web/hooks/useIdentity.ts` — shared identity registration hook.
- `web/lib/apiError.ts` — shared API error parsing + request id extraction.
- `web/components/states/StateContracts.md` — shared state contract definitions.

These files are shared primitives or documentation used by multiple routes and are not route-specific by design.
