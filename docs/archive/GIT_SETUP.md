# Git Remote & Credential Setup (HTTPS)

## Purpose

Provide a repeatable fix for `fatal: could not read Username for 'https://github.com': No such device or address` when pushing over HTTPS.

## Confirm remote

```bash
git remote -v
```

Expected:

- `origin https://github.com/Emiloart/achievo.git (fetch)`
- `origin https://github.com/Emiloart/achievo.git (push)`

If the remote is SSH, switch it:

```bash
git remote set-url origin https://github.com/Emiloart/achievo.git
```

## Ensure Git Credential Manager (GCM) is active

```bash
git config --global credential.helper manager-core
```

If `git credential-manager-core` is not available (common in WSL/Linux), install Git Credential Manager or use an existing GitHub auth tool (e.g., `gh auth login`) and then retry the steps below from an interactive shell.

## Trigger authentication

```bash
git ls-remote origin
```

If prompted, complete GitHub sign-in via the Git Credential Manager UI.

## Verify push works

```bash
git push origin HEAD
```

## Notes

- Do not store credentials in the repo.
- If authentication prompts do not appear in a non-interactive shell, re-run the commands from an interactive terminal.

## Incident log (2026-01-27)
- Broken remote string found: none. `origin` was already `https://github.com/Emiloart/achievo.git`, but HTTPS auth failed with `could not read Username for 'https://github.com': No such device or address`.
- Fix command used (idempotent):
  ```bash
  git remote set-url origin https://github.com/Emiloart/achievo.git
  ```
- Credential helper fix (WSL + Windows Git):
  ```bash
  git config --global credential.helper "/mnt/c/Program\\ Files/Git/mingw64/bin/git-credential-manager.exe"
  ```
- `git ls-remote origin` success summary: fetched refs; HEAD resolved to `2549f26d01bd3d12b5343a12cba2b46d0726c312` and `refs/heads/main` matched.
