# UX/UI Blueprint (P0 Foundation)

This document captures the UX/UI foundation for Achievo web. It is grounded in existing routes and features and does not introduce new backend or contract logic.

## Goals

- Establish a consistent navigation and layout system across all 37 routes.
- Normalize loading, empty, error, and gated states.
- Standardize on-chain transaction UX across wallet-driven flows.
- Improve first-run guidance without altering business logic.
- Keep all UI changes typed, reusable, and App Router compatible.

## Information Architecture

Top-level navigation (existing routes only):

- Dashboard (/dashboard)
- Identity (/identity)
- Goals (/goals/new, /approve)
- Orgs (/orgs)
- Projects (/projects)
- Parties (/parties)
- Usernames (/usernames/market)
- Verify (/verify)

User menu:

- Profile (/profile/:address)
- Professional profile (/profile/professional/:handle) when session available
- Settings (anchors to /dashboard editors)
- Logout

## Layout System

- PageLayout is the single canonical layout (`web/components/layout/PageLayout.tsx`).
- GlobalNav renders the main nav and user menu (`web/components/nav/GlobalNav.tsx`).
- PageHeader provides title, breadcrumbs, and right-side actions (`web/components/nav/PageHeader.tsx`).
- Content container width is consistent and responsive.

## State System

Every page uses standard state components:

- LoadingState (`web/components/states/LoadingState.tsx`)
- EmptyState (`web/components/states/EmptyState.tsx`)
- ErrorState (`web/components/states/ErrorState.tsx`)
- AuthRequired (`web/components/states/AuthRequired.tsx`)
- ChainRequired (`web/components/states/ChainRequired.tsx`)

These components enforce consistent messaging and CTAs (Create, Save changes, Continue, Retry).
State contracts are defined in `web/components/states/StateContracts.md`.

## Transaction UX

All on-chain flows share TxStepper + useTxLifecycle:

- Wallet prompt
- Submitted (tx hash)
- Confirming
- Finalized
- Failed / Reorged / Unknown

Core building blocks:

- `web/components/tx/TxStepper.tsx`
- `web/components/tx/useTxLifecycle.ts`
- `web/components/tx/TxTypes.ts`

Wallet rejection and reverts are always called out explicitly. Pages decide when to show retry and what "retry" means.

## Verify Portal

VerifyResultCard normalizes status:

- VERIFIED
- NOT_FOUND
- INVALID
- UNKNOWN
- ERROR

UNKNOWN is used for RPC/network outages and never displayed as failure (`web/components/domain/verify/VerifyResultCard.tsx`).

## Marketplace Clarity

The market page presents:

- Order status and settlement status clearly
- "How settlement works" panel (uses USERNAME_SETTLEMENT_MODE when available)
- Pending states: awaiting hash vs awaiting confirmations vs finalized
  Implementation: `web/app/usernames/market/page.tsx`

## Copy Conventions

- Buttons: Continue, Create, Save changes, Submit, Approve, Retry
- Errors: concise, actionable, no stack traces
- First-run guidance: direct CTA

## P0 Coverage Checklist

- PageLayout + GlobalNav
- State components wired into: /dashboard, /identity, /orgs, /orgs/:handle, /projects, /usernames/market, /verify, /verify/proof/:id, /verify/validation/:id, /verify/export/:publicId, /verify/anchor/:hash, /verify/tx/:txHash
- TxStepper wired into: org creation, identity claim, goal create, approve
- VerifyResultCard wired into all verify pages

## P0 Implemented (Code Pointers)

- Layout + nav: `web/components/layout/PageLayout.tsx`, `web/components/nav/GlobalNav.tsx`
- State system: `web/components/states/*`
- Transaction UX: `web/components/tx/*`
- Verify normalization: `web/components/domain/verify/VerifyResultCard.tsx`
- Updated routes:
  - `web/app/dashboard/page.tsx`
  - `web/app/identity/page.tsx`
  - `web/app/orgs/page.tsx`
  - `web/app/orgs/[handle]/page.tsx`
  - `web/app/projects/page.tsx`
  - `web/app/usernames/market/page.tsx`
  - `web/app/verify/page.tsx`
  - `web/app/verify/proof/[id]/page.tsx`
  - `web/app/verify/validation/[id]/page.tsx`
  - `web/app/verify/export/[publicId]/page.tsx`
  - `web/app/verify/anchor/[hash]/page.tsx`
  - `web/app/verify/tx/[txHash]/page.tsx`
  - `web/app/goals/new/page.tsx`
  - `web/app/approve/page.tsx`

## P0.5 Trust & Reliability Layer (Implemented)

- Policy layer principles:
  - Policies define meaning, not appearance.
  - No admin-controlled styling, only feature flags, thresholds, and messages.
  - UI consumes policy to enable/disable features and render plain messaging.
- Policy provider wiring:
  - `web/app/layout.tsx` wraps `PolicyProvider` to supply policy context.
  - `web/components/layout/PageLayout.tsx` renders `PolicyBanner` and `DegradedBanner`.
- Degraded awareness:
  - `web/lib/health.ts`
  - `web/hooks/useDegradedMode.ts`
  - `web/components/states/DegradedBanner.tsx`
  - `web/components/states/DegradedHint.tsx`
- Policy schema + provider:
  - `web/lib/policy/schema.ts`
  - `web/lib/policy/source.ts`
  - `web/hooks/usePolicy.ts`
  - `web/components/policy/PolicyProvider.tsx`
  - `web/components/policy/PolicyBanner.tsx`
  - `web/components/policy/PolicyMarkdown.tsx`
- Policy keys and defaults (see `docs/POLICY_KEYS.md` for full mapping):
  - `featureFlags.verifyPortalEnabled` (default `true`)
  - `featureFlags.usernameMarketEnabled` (default `true`)
  - `featureFlags.anchoringEnabled` (default `true`)
  - `featureFlags.orgCreateRequired` (default `true`, unused in UI)
  - `featureFlags.endorsementsEnabled` (default `true`)
  - `thresholds.finalityConfirmations` (default `1`)
  - `thresholds.degradedStalenessSeconds` (default `300`)
  - `displayPolicies.showRiskSignalsToPublic` (default `true`)
  - `displayPolicies.showVerificationAsExperimental` (default `false`)
  - `displayPolicies.anonymizeUsernameOwner` (default `false`)
  - `messaging.globalBanner` (enabled `false`, level `info`, markdown empty)
  - `messaging.featureNotices.usernameMarket` (default empty)
  - `messaging.featureNotices.anchoring` (default empty)
  - `messaging.featureNotices.verifyPortal` (default empty)
- Session awareness:
  - `web/hooks/useSessionStatus.ts`
  - `web/components/nav/SessionIndicator.tsx`
- Error taxonomy:
  - `web/lib/errorTaxonomy.ts`
  - `web/lib/apiError.ts`
  - `web/components/states/ErrorState.tsx`
- Finality timeline:
  - `web/components/tx/FinalityTimeline.tsx`
  - Integrated in:
    - `web/app/orgs/page.tsx`
    - `web/app/identity/page.tsx`
    - `web/app/goals/new/page.tsx`
    - `web/app/approve/page.tsx`
    - `web/app/usernames/market/page.tsx`
- Verification inspector:
  - `web/components/domain/verify/VerificationInspector.tsx`
  - `web/components/domain/verify/types.ts`
  - `web/components/domain/verify/VerifyResultCard.tsx`
  - Integrated in:
    - `web/app/verify/proof/[id]/page.tsx`
    - `web/app/verify/validation/[id]/page.tsx`
    - `web/app/verify/export/[publicId]/page.tsx`
  - `web/app/verify/anchor/[hash]/page.tsx`
  - `web/app/verify/tx/[txHash]/page.tsx`

## P1 Workbench UX (Implemented)

- Org Admin Workbench:
  - Route: `/orgs/:handle/admin` (`web/app/orgs/[handle]/admin/page.tsx`)
  - Components: `web/components/domain/orgs/OrgAdminTabs.tsx`, `web/components/domain/orgs/ProgramEditorModal.tsx`, `web/components/domain/orgs/MilestoneEditorModal.tsx`, `web/components/domain/orgs/SubmissionsTable.tsx`
- Validator Inbox Workbench:
  - Route: `/validators/inbox` (`web/app/validators/inbox/page.tsx`)
  - Components: `web/components/domain/validators/ValidatorInboxTabs.tsx`, `web/components/domain/validators/AttestationWizard.tsx`
- Projects Workbench:
  - Route: `/projects/:slug` (`web/app/projects/[slug]/page.tsx`)
  - Components: `web/components/domain/projects/ProjectTabs.tsx`, `web/components/domain/projects/TimeEntryTable.tsx`, `web/components/domain/projects/InvoiceTable.tsx`, `web/components/domain/projects/ProjectShareLinksManager.tsx`
- Workbench behaviors:
  - Org admin: overview, programs, submissions review tabs with publish and milestone modals.
  - Validator inbox: registration gate + attestation wizard with prepare -> sign -> submit steps. Completed tab is a client-side filter of the validator requests list.
  - Projects: overview, time tracking, invoices, and share links tabs with consistent empty/error states. Leave-project action is not implemented in the P1 UI.

## P3 Product-grade polish (Implemented)

- Page headers + breadcrumbs:
  - Breadcrumb helpers: `web/components/nav/breadcrumbs.ts`
  - Consistent headers across:
    - `web/app/orgs/[handle]/page.tsx`
    - `web/app/orgs/[handle]/admin/page.tsx`
    - `web/app/projects/[slug]/page.tsx`
    - `web/app/validators/inbox/page.tsx`
    - `web/app/verify/proof/[id]/page.tsx`
    - `web/app/verify/validation/[id]/page.tsx`
    - `web/app/verify/export/[publicId]/page.tsx`
    - `web/app/verify/anchor/[hash]/page.tsx`
    - `web/app/verify/tx/[txHash]/page.tsx`
- Table ergonomics:
  - Filter row component: `web/components/ui/TableFilters.tsx`
  - Standardized usage in:
    - `web/components/domain/orgs/SubmissionsTable.tsx`
    - `web/app/validators/inbox/page.tsx`
    - `web/app/projects/[slug]/page.tsx`
    - `web/app/projects/page.tsx`
- Copy + error taxonomy:
  - Label registry: `web/lib/uiCopy.ts`
  - Error normalization: `web/lib/errorTaxonomy.ts`
  - Error rendering: `web/components/states/ErrorState.tsx`
- Accessibility polish for modal/drawer:
  - Local modal primitives: `web/components/ui/Modal.tsx`
  - Confirm dialog wrapper: `web/components/ui/ConfirmDialog.tsx`
- Degraded hints aligned on data-heavy views:
  - `web/app/profile/[address]/page.tsx`
  - `web/app/orgs/[handle]/page.tsx`
  - `web/app/projects/[slug]/page.tsx`

## P4 Power UX + Paneling + Density (Implemented)

- Command palette (Ctrl/Cmd+K) with scoped registry:
  - Action registry + types: `web/lib/actions/registry.ts`, `web/lib/actions/types.ts`
  - UI + modal: `web/components/command/CommandPalette.tsx`, `web/components/command/CommandPaletteModal.tsx`
  - Mounted once in root layout: `web/app/layout.tsx`
- Panel routing + Inspector rail (query param, no new routes):
  - Routing helpers: `web/lib/panelRouting.ts`
  - Rail shell: `web/components/layout/InspectorRail.tsx`
  - Panel renderers: `web/components/panels/SubmissionPanel.tsx`, `web/components/panels/ValidationRequestPanel.tsx`, `web/components/panels/TimeEntryPanel.tsx`
  - Layout integration: `web/components/layout/PageLayout.tsx`
- DataTable selection + bulk actions (opt-in):
  - Selection-capable table: `web/components/ui/DataTable.tsx`
  - Bulk action bar: `web/components/ui/BulkActionBar.tsx`
  - Workbench integrations: `web/components/domain/orgs/SubmissionsTable.tsx`, `web/app/validators/inbox/page.tsx`
- Density toggle (compact/comfortable):
  - Storage + class helpers: `web/lib/density.ts`
  - Provider + root class: `web/components/layout/DensityProvider.tsx`, `web/components/layout/PageLayout.tsx`
  - UI control in user menu: `web/components/nav/GlobalNav.tsx`
  - Token deltas: `web/styles/globals.css`
- Toast grouping / de-duplication:
  - Toast wrapper: `web/components/ui/toast.tsx`
  - Grouped toasts in high-churn flows:
    - Attestation wizard: `web/components/domain/validators/AttestationWizard.tsx`
    - Program publish: `web/app/orgs/[handle]/admin/page.tsx`
    - On-chain goal flows: `web/app/goals/new/page.tsx`, `web/app/approve/page.tsx`

## P5 Cinematic theme layer (Implemented)

- Theme tokens + global theme class:
  - Token definitions: `web/styles/theme.css`
  - Theme class + dark tokens: `web/app/layout.tsx` (html/body + `data-theme=\"dark\"`)
- Background FX system (aurora, noise, grid):
  - Background component: `web/components/theme/BackgroundFX.tsx`
  - Mounted behind layout: `web/components/layout/PageLayout.tsx`
  - Effects preference + persistence: `web/lib/effects.ts`, `web/components/layout/EffectsProvider.tsx`, `web/components/nav/GlobalNav.tsx`
- Glass surfaces + glow rules:
  - Card primitive: `packages/ui/src/Card.tsx`
  - Modal/drawer shell: `web/components/ui/Modal.tsx`
  - Inspector rail: `web/components/layout/InspectorRail.tsx`
  - Page headers: `web/components/nav/PageHeader.tsx`
  - Primary CTA glow: `packages/ui/src/Button.tsx`
- Motion helpers (reduced-motion safe):
  - Motion helper: `web/lib/motion.ts`
  - Panel/modal animations + hover lift: `web/styles/theme.css`

## Regression safety (UX reliability)

- UX regression tests: `web/tests/e2e.spec.ts`
  - Verify UNKNOWN/INVALID/NOT_FOUND status rendering.
  - Policy gating on `/verify` and `/usernames/market`.
  - Degraded banner visibility and details modal.
  - Session indicator signed-out CTA.
  - Workbench tab shell presence for `/orgs/:handle/admin`, `/validators/inbox`, `/projects/:slug`.
  - Accessibility checks: keyboard nav focus + modal focus trap + headings snapshot.
- Dev-only invariants:
  - Page layout guard: `web/components/layout/LayoutInvariant.tsx`.
  - Error taxonomy warnings: `web/lib/errorTaxonomy.ts`, `web/components/states/ErrorState.tsx`.

## Non-Goals

- No new routes
- No backend/contract changes
- No new dependencies
