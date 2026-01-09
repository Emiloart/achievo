# Queue Backlog Handling

## Symptoms

- Anchor jobs stuck in PENDING/PROCESSING
- Anchoring delays or missing on-chain anchors

## Commands

Inspect backlog counts:

```bash
psql "$DATABASE_URL" -c "select status, count(*) from \"AnchorJob\" group by status;"
```

Re-enable queue processing:

```bash
export ANCHOR_QUEUE_ENABLED=true
```

PowerShell:

```
$env:ANCHOR_QUEUE_ENABLED="true"
```

Increase batch size (temporarily):

```bash
export ANCHOR_BATCH_SIZE=50
```

PowerShell:

```
$env:ANCHOR_BATCH_SIZE="50"
```

## Recovery

- Restart the backend after changing env vars.
- If RPC is unhealthy, set `ANCHORING_ENABLED=false` to pause new anchors.
- Re-run processing after RPC recovery.
