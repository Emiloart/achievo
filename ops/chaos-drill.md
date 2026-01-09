# Minimal Chaos Drill

## Goal

Validate safe degradation and recovery when dependencies fail.

## Drill Steps

1. Stop Postgres and verify API returns structured 5xx errors.
2. Restart Postgres and confirm `/health` returns OK.
3. Disable anchoring (`ANCHORING_ENABLED=false`) and submit a proof; ensure flow completes.
4. Re-enable anchoring and confirm queued jobs resume.

## Expected Results

- Errors are structured and include `requestId`.
- No data corruption or partial writes.
- Queue resumes without manual intervention.
