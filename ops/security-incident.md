# Auth or Security Incident

## Immediate Actions

1. Disable sensitive operations (if needed)
2. Rotate secrets (JWT, API keys)
3. Capture logs and preserve evidence

## Commands

Rotate JWT secret (forces re-login):

```bash
export JWT_SECRET="<new-random-secret>"
```

PowerShell:

```
$env:JWT_SECRET="<new-random-secret>"
```

Disable optional surfaces:

```bash
export VERIFY_PORTAL_ENABLED=false
export ENDORSEMENTS_ENABLED=false
```

PowerShell:

```
$env:VERIFY_PORTAL_ENABLED="false"
$env:ENDORSEMENTS_ENABLED="false"
```

## Recovery

- Redeploy with rotated secrets.
- Review access logs by `requestId` and correlate with DB changes.
- Re-enable features after confirming integrity.
