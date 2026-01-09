# Repository Governance

This document provides the commands needed to enforce branch protections on `main`.

## Prerequisites

- Install GitHub CLI: https://cli.github.com/
- Authenticate: `gh auth login`

## Enforce Branch Protection (main)

Set the repo owner and name:

```bash
OWNER="$(gh repo view --json owner -q .owner.login)"
REPO="$(gh repo view --json name -q .name)"
```

Apply branch protections:

```bash
gh api --method PUT "repos/${OWNER}/${REPO}/branches/main/protection" \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]="CI / ci" \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f required_conversation_resolution=true
```

Notes:
- If your CI job name changes, update the required status check context.
- Keep required approvals at 1 or higher for protected branches.
