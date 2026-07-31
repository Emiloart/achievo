# Achievo
 paused, will continue when the world is ready
**Verifiable on-chain achievement and identity infrastructure.**

Achievo is a production-grade platform for building trust through structured programs, evidence collection, validation, and portable proof artifacts. Organizations issue milestones. Contributors submit evidence. Validators attest. Achievo produces cryptographically verifiable outcomes that can be exported, shared, and publicly confirmed.

## The Core Loop

```
Organization publishes program
        ↓
Program defines milestones
        ↓
Participant submits evidence
        ↓
Reviewer validates submission
        ↓
Achievo produces verifiable outcome
        ↓
Outcome exported & publicly verified
```

## Product Surface

### Primary: Verifiable Program & Reputation System

- **Identity & Profiles** – On-chain identity registration with portable reputation export
- **Organizations** – Program publishers with role-based control
- **Programs & Milestones** – Structured achievement templates with clear submission requirements
- **Submissions & Evidence** – Participant work artifacts with versioning and audit trail
- **Validations & Attestations** – Reviewer decision logs with cryptographic proof
- **Verification Portal** – Public, permission-less proof verification
- **Exports & Artifacts** – Portable credentials for LinkedIn, wallets, and external systems
- **Admin Control Plane** – Operator dashboard for health, auditing, and policy



### Secondary (Supported, Not Primary)

- Projects, privacy controls, anchoring & indexing

## Repository Structure

```
.
├── web/                    # Public product app (Next.js 14 + React 18)
├── apps/admin/             # Operator control plane
├── backend/                # Authoritative off-chain service (NestJS 10)
├── contracts/              # On-chain registries & proof logic (Solidity)
├── packages/               # Shared ABIs, config, typed utilities
└── docs/                   # Authoritative documentation
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js, React | 14.2.15, 18.3.1 |
| **Backend** | NestJS, Prisma | 10.x, 5.22.0 |
| **Database** | PostgreSQL | 14+ |
| **Smart Contracts** | Solidity, Hardhat | ^0.8.0, 3.0.11 |
| **Node.js** | (Recommended) | 20.11.1 |
| **Package Manager** | npm | 10.x |
| **Blockchain** | Base Sepolia (testnet), Base (mainnet) |

## Quick Start

### Prerequisites

- Node.js 20.11.1+
- npm 10.x
- PostgreSQL 14+

### Setup

```bash
# Install dependencies
npm ci

# Generate Prisma client
npm --prefix backend run prisma:generate

# Configure environment (see docs/ for details)
cp backend/.env.example backend/.env.local
cp web/.env.example web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

### Local Development

```bash
# Terminal 1: Backend (port 4000)
npm --prefix backend run dev

# Terminal 2: Web app (port 3000)
npm --prefix web run dev

# Terminal 3: Admin app (port 3001)
npm --prefix apps/admin run dev
```

### Build

```bash
npm --prefix backend run build
npm --prefix web run build
npm --prefix apps/admin run build
```

## Quality Gates

**No new domain feature work** should merge unless the Phase 1 stability gate passes:

- ✅ Backend unit tests
- ✅ Backend E2E tests
- ✅ Web E2E smoke path
- ✅ Web build
- ✅ Admin build

Run locally:

```bash
npm --prefix backend run test:unit
npm --prefix backend run test:e2e
npm --prefix web run test:e2e
npm --prefix web run build
npm --prefix apps/admin run build
```

## Verification & Testing

### Backend

```bash
# Type checking
npm --prefix backend run typecheck

# Unit tests
npm --prefix backend run test:unit

# Integration tests (isolated DB)
npm --prefix backend run test:integration:db

# E2E tests
npm --prefix backend run test:e2e
```

### Frontend

```bash
# Web
npm --prefix web run test
npm --prefix web run test:e2e

# Admin
npm --prefix apps/admin run test
```

### Smart Contracts

```bash
npm --prefix contracts run test
npm --prefix contracts run build
```

## Design Principles

### 1. Coherence Over Breadth
Focus on finishing incomplete flows, removing ambiguity, and reducing duplication. Do not add modules merely because the architecture can support them.

### 2. Trust Over Spectacle
Achievo should feel credible and auditable, not ornamental. Prioritize legibility, transaction clarity, failure handling, and reviewability.

### 3. Completion Over Expansion
When choosing between finishing core proofs and adding new features, prefer the core product loop.

### 4. Explicit State Over Hidden Magic
Every critical object has a clear lifecycle. Avoid designs where state is inferred from scattered booleans or side effects.

### 5. Safety Before Convenience
For auth, chain writes, exports, and verification logic:
- Require explicit authorization
- Preserve auditability
- Avoid silent mutations
- Keep dangerous operations dry-runable

## Documentation

- **[docs/README.md](./docs/README.md)** – Authoritative entry point
- **[backend/README.md](./backend/README.md)** – Backend architecture & test guide
- **[contracts/README.md](./contracts/README.md)** – Smart contract deployment & interaction

> **Note:** Historical planning notes, roadmaps, and archived documentation are in `docs/archive/` and are not authoritative.

## Deployment

### Base Sepolia (Testnet)

| Contract | Address |
|----------|---------|
| AchievoCoreV11 | `0x4c3397505Ebc1d517237B5336610951e42209656` |
| AchievoBadgeV11 | `0x13Dd9D0DF3b84A70D7E0CE449aDEBFb308215aC7` |
| AchievoIdentity | `0x5BE61bF52AE08790355232F7114f4DBD2dd0848d` |
| AchievoUsernameRegistry | `0x386CddDf734008f836437dE968D275f702565437` |

### Configuration

Use shared packages for contract addresses and ABIs:

```typescript
import {
  BASE_SEPOLIA_RPC,
  ACHIEVO_CORE_V11_ADDRESS,
  ACHIEVO_BADGE_V11_ADDRESS,
  ACHIEVO_IDENTITY_ADDRESS,
  ACHIEVO_USERNAME_REGISTRY_ADDRESS,
} from "@achievo/config";

import {
  achievoCoreV11Abi,
  achievoBadgeV11Abi,
  achievoUsernameRegistryV1Abi,
} from "@achievo/abi";
```

See `packages/achievo-config` and `packages/achievo-abi` for full details.

## Agent & Contributor Guidelines

All work must push Achievo toward a more coherent, trust-grade, production-capable system. See [AGENTS.md](./AGENTS.md) for operating principles and scope boundaries.

## Contributing

1. **Understand the product loop** – Read [docs/README.md](./docs/README.md) first
2. **Check the quality gate** – Ensure stability tests pass locally
3. **Follow design principles** – Prefer coherence, trust, and completion
4. **Write for auditability** – Clear state transitions, explicit authorization, dry-runable operations
5. **Test thoroughly** – Unit, integration, E2E coverage required

## License

Refer to the LICENSE file in the repository.

## Support & Questions

For product questions, check the [docs](./docs/README.md).  
For infrastructure or deployment issues, review [backend/README.md](./backend/README.md) and [contracts/README.md](./contracts/README.md).
