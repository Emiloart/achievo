# Demo Script (Pitch Readiness Pack)

## A) Environment checklist

- Backend: `http://localhost:4000`
- Web dApp: `http://localhost:3000`
- Admin console: `http://localhost:3001`
- Chain RPC configured (Base Sepolia or local test RPC)
- Test DB ready: `npm --prefix backend run test:integration:db`

## B) 8–12 minute flow (happy path)

1. **Identity sign-in**
   - Route: `/identity` (`web/app/identity/page.tsx`)
   - Expected: connect wallet → sign-in; session indicator shows “Signed in”.
2. **Username availability + claim (if enabled)**
   - Route: `/identity`
   - Expected: availability check → on-chain claim → confirm → backend bind.
3. **Create org (on-chain)**
   - Route: `/orgs` (`web/app/orgs/page.tsx`)
   - Expected: prepare → wallet tx → confirmations → finalize; TxStepper + FinalityTimeline.
   - If chain not available: open an existing org and explain.
4. **Org admin publish**
   - Route: `/orgs/:handle/admin` (`web/app/orgs/[handle]/admin/page.tsx`)
   - Expected: create program → publish → milestone add.
5. **Validator inbox**
   - Route: `/validators/inbox` (`web/app/validators/inbox/page.tsx`)
   - Expected: register if needed → open request → attestation wizard (prepare → sign → submit).
6. **Verify portal**
   - Route: `/verify` (`web/app/verify/page.tsx`)
   - Expected: open proof/validation verify detail; “UNKNOWN” handled distinctly from “INVALID”.
7. **Admin overview**
   - Route: `/login` → `/` (`apps/admin/app/login/page.tsx`, `apps/admin/app/page.tsx`)
   - Expected: health cards + alerts list.
8. **Admin chain actions**
   - Route: `/chain-actions` (`apps/admin/app/(protected)/chain-actions/page.tsx`)
   - Expected: list + detail view.
9. **Safe mutation demo**
   - Route: `/indexer` (`apps/admin/app/(protected)/indexer/page.tsx`)
   - Expected: TwoStepAction preview → type confirm → execute (use a harmless range).

## C) Contingency paths

- **RPC down / degraded**: show DegradedBanner + “UNKNOWN” verify status (no false failures).
- **No test data**: show EmptyState with CTA (org/programs/submissions/validator inbox).
- **No wallet**: show AuthRequired and explain the flow without signing.
