# P0 UX Smoke Tests (Deterministic)

Each test references an exact route and the expected UI states. These are safe to run in local/dev without changing backend or contracts.

## Global Preconditions
- Wallet available and connected.
- Backend running.
- If on-chain actions are required, ensure the configured chain is available.

## Route-by-Route Tests

### /dashboard (`web/app/dashboard/page.tsx`)
1) Visit `/dashboard` with no wallet connected.
   - Expect `AuthRequired` state and no auto-sign prompts.
2) Connect wallet and sign in.
   - Expect dashboard content to render.
3) Force a backend error (optional):
   - Expect `ErrorState` with Retry and request id if present.

### /identity (`web/app/identity/page.tsx`)
1) Visit `/identity` without wallet.
   - Expect connect CTA.
2) Connect wallet, click “Claim Achievo ID”.
   - Expect TxStepper: Wallet prompt → Submitted → Confirming → Finalized.
3) Reject signature.
   - Expect TxStepper to show “Failed” and error message “Transaction cancelled.”
4) Wrong chain (if applicable).
   - Expect chain switch prompt.

### /orgs (`web/app/orgs/page.tsx`)
1) Attempt to create org without signing in.
   - Expect `AuthRequired`.
2) Create org with on-chain required:
   - Prepare → Wallet prompt → Submitted → Confirming → Finalized → Finalize backend.
3) Reject signature.
   - Expect “Transaction cancelled.”
4) Wrong chain.
   - Expect `ChainRequired` and switch CTA.
5) Backend finalize failure after tx confirmation.
   - Expect “Retry sync” and ErrorState with request id if present.

### /orgs/:handle (`web/app/orgs/[handle]/page.tsx`)
1) Load a valid org handle.
   - Expect org summary + programs.
2) Load an invalid handle.
   - Expect EmptyState “Organization not found.”

### /projects (`web/app/projects/page.tsx`)
1) Visit without signing in.
   - Expect AuthRequired.
2) Visit with signing in but zero projects.
   - Expect EmptyState with “Create project” CTA.
3) Simulate backend error.
   - Expect ErrorState with Retry.

### /usernames/market (`web/app/usernames/market/page.tsx`)
1) Visit and check settlement panel.
   - Expect clear settlement mode messaging (OPERATOR/SELLER_TX/Coordinated).
2) Accept a listing (signed-in).
   - Expect pending trade banner.
   - If no tx hash: “Awaiting transfer submission (seller signature)”.
   - With tx hash: “Awaiting on-chain confirmations”.
3) RPC outage or backend failure:
   - Expect ErrorState with Retry.

### /verify (`web/app/verify/page.tsx`)
1) Paste a proof/export/validation/anchor/tx identifier.
   - Expect correct routing to the detail page.

### /verify/proof/:id (`web/app/verify/proof/[id]/page.tsx`)
1) Load a valid proof id.
   - Expect VerifyResultCard and TrustCard.
2) RPC failure.
   - Expect status UNKNOWN with copy “Unable to confirm right now… Not a failure.”
3) Not found.
   - Expect NOT_FOUND status (distinct from INVALID).

### /verify/validation/:id (`web/app/verify/validation/[id]/page.tsx`)
Same as proof verification with validation-specific metadata.

### /verify/export/:publicId (`web/app/verify/export/[publicId]/page.tsx`)
Same as proof verification with export-specific metadata.

### /verify/anchor/:hash (`web/app/verify/anchor/[hash]/page.tsx`)
1) Valid anchored hash:
   - Expect VERIFIED.
2) RPC failure:
   - Expect UNKNOWN and not failure.

### /verify/tx/:txHash (`web/app/verify/tx/[txHash]/page.tsx`)
1) Valid tx with anchor event:
   - Expect VERIFIED.
2) Tx without anchor event:
   - Expect INVALID (not NOT_FOUND).

### /goals/new (`web/app/goals/new/page.tsx`)
1) Submit a goal with a valid title/description.
   - Expect TxStepper transitions and goal CID in the confirmation panel.
2) Reject signature.
   - Expect TxStepper failed with “Transaction cancelled.”

### /approve (`web/app/approve/page.tsx`)
1) Enter goal id and approve.
   - Expect TxStepper transitions.
2) Reject signature.
   - Expect TxStepper failed with “Transaction cancelled.”

## On-chain Failure Cases (Expected UI)
- **User rejected**: TxStepper `failed` + “Transaction cancelled.”
- **Revert**: TxStepper `failed` + revert message.
- **Wrong chain**: `ChainRequired` with switch CTA.
- **RPC error**: VerifyResultCard `UNKNOWN` with “Unable to confirm right now… Not a failure.”
