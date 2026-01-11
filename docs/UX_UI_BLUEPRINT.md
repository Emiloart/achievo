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
- State components wired into: /dashboard, /identity, /orgs, /orgs/:handle, /projects, /usernames/market, /verify + detail routes
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

## Non-Goals
- No new routes
- No backend/contract changes
- No new dependencies
