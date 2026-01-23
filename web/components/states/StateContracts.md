# State Contracts

This document defines the required rendering behavior for shared UX states.

## ApiLoadState (AsyncState<T>)

- `idle`: no request in flight; render nothing or an EmptyState with a CTA.
- `loading`: show `LoadingState` with skeleton rows and a concise description.
- `pending`: show a non-blocking status badge or inline note indicating on-chain or background confirmation.
- `confirmed`: render the data; if the data is empty, render `EmptyState`.
- `failed`: render `ErrorState` with a user-safe message and a retry callback when available.
- `unknown`: render `ErrorState` or a warning badge stating verification is unavailable (do not mark as failed).

## TxState (useTxLifecycle + TxStepper)

- `walletPrompt`: show the wallet confirmation step as active; do not call backend finalize yet.
- `submitted`: show the transaction hash and “Submitted”.
- `confirming`: show confirmation progress or a spinner; never mark success early.
- `finalized`: show success **only** if a transaction hash exists.
- `failed`: show failure with user-rejection vs revert messaging.
- `unknown`: show “Unable to confirm right now” (RPC/circuit breaker) and allow retry.
- `reorged`: show “Reorg detected” and prompt for retry or resync.

## Visibility & Access

- Auth-required screens must render `AuthRequired` (never auto-trigger signature).
- Wrong-chain actions must render `ChainRequired` with a switch CTA.
- Privacy visibility must be explicit: Public | Unlisted | Private.
- Unlisted content must show a share token with copy and revoke controls.
