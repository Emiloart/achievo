# Testing Guide

This document defines the active verification commands for the current stabilization phase.

## Phase 1 release gate

The working gate is:

- backend unit tests
- backend E2E
- one web E2E smoke path
- web build
- admin build

## Backend

### Unit tests

```bash
npm --prefix backend run test:unit
```

### Integration tests with disposable Postgres

```bash
npm --prefix backend run test:integration:db
```

What the harness does:

1. starts Postgres via `backend/docker-compose.test.yml` on port `54321`
2. loads env from `backend/.env.test.local`, then `.env.test`, then `.env.test.example`
3. runs migrations and integration tests
4. tears down the container and volume

### E2E

```bash
npm --prefix backend run test:e2e
```

E2E requires:

- Docker or another isolated test database target
- local chain tooling available to the harness
- a safe `DATABASE_URL` that points to an isolated test database

The backend test harness should refuse obvious non-test database URLs.

## Web

### Build

```bash
npm --prefix web run build
```

### E2E smoke

```bash
npm --prefix web run test:e2e
```

## Admin

### Build

```bash
npm --prefix apps/admin run build
```

### Typecheck

```bash
npm --prefix apps/admin run typecheck
```

## Common failure cases

- Docker daemon not running
- local ports already in use
- Prisma client not generated after schema changes
- backend unavailable during web or admin proxy-driven flows
- wrong environment values leaking from a developer machine into test runs
