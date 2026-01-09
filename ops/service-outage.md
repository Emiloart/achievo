# Service Outage Response

## Symptoms

- `GET /health` fails or returns non-200
- API latency spikes or 5xx responses

## Immediate Checks

1. Confirm backend process is running
2. Check logs for startup or runtime errors
3. Verify DB connectivity

## Commands

Health check:

```bash
curl http://127.0.0.1:4000/health
```

Start backend locally:

```bash
npm --prefix backend run dev
```

Build + run backend:

```bash
npm --prefix backend run build
npm --prefix backend run start
```

DB connectivity:

```bash
psql "$DATABASE_URL" -c "select 1;"
```

## Recovery

- Restart the backend service after fixing config or DB issues.
- If persistent, roll back the last deploy or restore from the last known-good build.
