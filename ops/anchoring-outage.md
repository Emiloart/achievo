# Anchoring / Chain Outage

## Symptoms

- Anchor jobs failing or stuck
- RPC timeouts from Base Sepolia

## Commands

Pause anchoring:

```bash
export ANCHORING_ENABLED=false
```

PowerShell:

```
$env:ANCHORING_ENABLED="false"
```

Resume anchoring:

```bash
export ANCHORING_ENABLED=true
```

PowerShell:

```
$env:ANCHORING_ENABLED="true"
```

Confirm RPC health:

```bash
curl -X POST "$ANCHOR_RPC_URL" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Recovery

- Leave anchors queued while RPC is down.
- After RPC recovers, re-enable anchoring and monitor job backlog.
