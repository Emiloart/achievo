# State Contracts (UI Runtime Guarantees)

This document defines the expected rendering contracts for shared state components. It applies to all App Router pages in `web/app`.

## ApiLoadState Contract

Required rendering contract:
- **Loading**: Use `LoadingState` for initial fetches or refreshes that replace the whole view.
- **Empty**: Use `EmptyState` with a direct CTA for first-run or zero-data conditions.
- **Error**: Use `ErrorState` with a retry callback if the action is retryable.
- **Auth gated**: Use `AuthRequired` for flows that require a signed-in session.
- **Chain gated**: Use `ChainRequired` when the user is connected to the wrong network.

Guarantees:
- Loading must never render empty/error states simultaneously.
- Errors must never hide a previously loaded successful state unless explicitly re-fetching.
- If a requestId/traceId is available, it must be passed to `ErrorState`.

## TxState Contract

Tx state machine (`TxTypes.TxState`):
- `idle` → `walletPrompt` → `submitted` → `confirming` → `finalized`
- Failure states: `failed`, `reorged`, `unknown`

Required rendering contract:
- Always use `TxStepper` for on-chain actions that require confirmation.
- `finalized` must include a transaction hash.
- `unknown` must not be presented as a failure; it must be explicit that RPC confirmation is unavailable.

## Visibility/Access Contract

Required rendering contract:
- Auth-required screens must show `AuthRequired` rather than triggering implicit signing.
- Chain-required screens must show `ChainRequired` with a clear switch CTA.
- When a feature is partial or not implemented, copy must state the limitation explicitly.
