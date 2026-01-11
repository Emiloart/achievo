# Admin Console Runbook

## Scope

This runbook covers the Achievo Admin Console (`apps/admin`) and the admin gateway endpoints in the backend.

## Bootstrap

Create a SUPERADMIN on a new environment:

```bash
ADMIN_BOOTSTRAP_EMAIL=admin@example.com \
ADMIN_BOOTSTRAP_PASSWORD='replace-with-strong-password' \
npx ts-node backend/scripts/admin-bootstrap-superadmin.ts
```

Use `--force` to reset an existing SUPERADMIN.

## Local Development

```bash
npm --prefix backend run dev
npm --prefix apps/admin run dev
```

Ensure `NEXT_PUBLIC_ADMIN_API_BASE_URL` points to the backend.

## Two-Step Commit (Required)

All mutations follow:

1) Dry-run: `POST /admin-gateway/dry-run` with `{ action, payload }`
2) Execute: `POST /admin-gateway/execute` with `{ intentId, confirmPhrase, payload }`

The confirmation phrase must match exactly.

## Common Operations

- Retry chain action: action `chain_action_retry`
- Replay chain actions range: `chain_action_replay`
- Indexer backfill: `indexer_backfill`
- Rebuild projections: `indexer_rebuild`
- Reverify org creation: `org_reverify`
- Retry anchor: `anchor_retry`
- Flag suspicious username: `username_mark_suspicious`

## Incident Checks

- `/admin-gateway/overview`: top-level status and counts
- `/admin-gateway/health`: dependency health
- `/admin-gateway/alerts`: operational alerts
- `/admin-gateway/chain-actions`: pending/failed chain actions

## Troubleshooting

- CSRF errors: refresh the session (`/admin-auth/refresh`) or re-login.
- Lockout: SUPERADMIN can update an admin user role/status.
- Stuck actions: use dry-run before executing a retry or replay.
