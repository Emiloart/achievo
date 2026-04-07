# Achievo Backend

The backend is Achievo's authoritative off-chain service.

It owns the off-chain parts of the product that cannot be trusted to browser code alone:

- auth and sessions
- organization, program, and submission lifecycle
- proofs and evidence handling
- validations and attestations
- profile exports and public artifacts
- privacy and visibility enforcement
- admin gateways and operational coordination
- anchoring, indexer, and monitoring support

## Runtime

- NestJS `10.x`
- Express adapter via `@nestjs/platform-express`
- Prisma `5.22.0`
- PostgreSQL
- Recommended local Node.js baseline `20.11.1`

## Local development

```bash
npm --prefix backend run prisma:generate
npm --prefix backend run dev
```

Default port:

```text
4000
```

## Verification

### Typecheck

```bash
npm --prefix backend run typecheck
```

### Build

```bash
npm --prefix backend run build
```

### Unit tests

```bash
npm --prefix backend run test:unit
```

### Integration tests with disposable Postgres

```bash
npm --prefix backend run test:integration:db
```

### E2E

```bash
npm --prefix backend run test:e2e
```

## Test safety

The backend test harness is expected to use isolated test database URLs only.

Use one of:

- `backend/.env.test.local`
- `backend/.env.test`
- `backend/.env.test.example`

Do not point backend integration or E2E runs at a developer's main local database.

## Product alignment

The backend should strengthen the core hierarchy below, not create parallel product concepts:

1. Organization
2. Program
3. Milestone
4. Submission
5. Proof or Evidence
6. Validation or Attestation
7. Export or Artifact
8. Verification

