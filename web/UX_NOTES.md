# Web UX Engineering Notes

These rules govern UI work in `web/`.

## Component placement
- `web/components/ui/`: low-level primitives (buttons, cards, skeletons)
- `web/components/states/`: loading/empty/error/auth/chain states
- `web/components/tx/`: transaction UX (TxStepper, hooks)
- `web/components/nav/`: navigation, page header, layout helpers
- `web/components/domain/`: domain-specific widgets (verify cards, market panels)

## Page structure
- All pages render inside PageLayout (RootLayout).
- Use `PageHeader` at the top of content for title + breadcrumbs + actions.
- Keep content blocks inside responsive containers; avoid fixed widths.

## State handling
- Use LoadingState for initial fetches.
- Use EmptyState with a direct CTA for first-run flows.
- Use ErrorState with retry callback and requestId when available.
- Use AuthRequired for signed-in screens; do not trigger signing automatically.
- Use ChainRequired when on-chain actions need a specific network.
- Refer to `web/components/states/StateContracts.md` for required state contracts.

## Transaction UX
- All on-chain actions use `useTxLifecycle` + `TxStepper`.
- Never call backend finalize before tx hash is available.
- Always surface user rejection vs revert vs unknown.

## Copy rules
- Buttons: Continue, Create, Save changes, Submit, Approve, Retry.
- Errors: concise, actionable, no stack traces.
- Avoid placeholder “TODO” messaging in user-visible text.

## No new endpoints
- UI work must use existing backend routes and contract interfaces.
- No new routes; only refactor existing pages.
