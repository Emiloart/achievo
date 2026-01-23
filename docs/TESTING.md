# Testing Guide

This document describes deterministic commands for unit and integration testing.

## Backend unit tests

```
npm --prefix backend run test:unit
```

## Backend integration tests (self-contained)

The integration test harness spins up a disposable Postgres instance via Docker Compose and loads test env vars.

```
npm --prefix backend run test:integration:db
```

### What it does

1. Starts Postgres via `backend/docker-compose.test.yml` on port `54321`.
2. Waits for healthcheck readiness.
3. Loads environment from `backend/.env.test` (or `.env.test.local`, then `.env.test.example`).
4. Runs `prisma migrate deploy` and integration tests.
5. Tears down the DB container and volume.

### Common failures

- **Docker not running**: start Docker Desktop and re-run the command.
- **Port 54321 in use**: stop the conflicting service or change the port in `backend/docker-compose.test.yml` and `backend/.env.test.example`.
- **Missing test env**: copy `backend/.env.test.example` to `backend/.env.test` and adjust values if needed.

### Expected warnings

- **OpsConfigService deployment compatibility**: unit tests log warnings when RPC URLs or contract addresses are not set in the test environment. This is expected during local unit runs and does not fail tests.
