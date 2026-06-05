# About Achievo

## What is Achievo?

Achievo is a **verifiable achievement, milestone, validation, and reputation infrastructure** platform. It enables organizations, ecosystems, and contributor networks to define structured programs, validate accomplishments, and generate portable proof artifacts that can be publicly verified.

Unlike generic Web3 experiments or badge toys, Achievo is a production-grade system focused on credibility and trust.

---

## The Core Loop

Achievo enables this complete product cycle:

1. **An organization publishes a program** — Organizations define structured achievement programs with clear goals.
2. **The program defines milestones** — Programs break down into measurable milestones that participants can work toward.
3. **A participant submits evidence** — Contributors submit evidence of their work and accomplishment.
4. **A validator/reviewer attests** — Reviewers validate submissions and create attestations.
5. **Achievo produces a verifiable outcome** — The platform generates cryptographically verifiable proof.
6. **That outcome can be exported, shared, and publicly verified** — Participants can share portable proof artifacts that others can independently verify.

---

## What Achievo Does

**Verifiable Programs**
- Organizations can publish programs with clear milestone definitions
- Programs enforce structured workflows for submission, validation, and attestation
- All actions are auditable and traceable

**Evidence & Validation**
- Participants submit proof of work with supporting evidence
- Validators review submissions and create attestations
- The validation workflow is explicit, not hidden behind opaque gates

**Portable Proofs**
- Achievo exports credentials as verifiable artifacts
- These artifacts can be shared publicly
- Third parties can independently verify claims without trusting Achievo directly

**Reputation & Identity**
- Users build durable reputation tied to real, validated work
- Profiles aggregate verified achievements
- Identity anchors are portable and on-chain where it matters

---

## Architecture

Achievo is a full-stack monorepo with clear responsibility boundaries:

### `web/` — Public Product App
The main user-facing interface for:
- Organization discovery and program browsing
- Program management and milestone submission
- Validation inbox (for reviewers)
- Public verification portal
- Profile and export management

### `backend/` — Authoritative Off-Chain Service
The source of truth for all off-chain state:
- Authentication and session management
- Organization, program, and submission lifecycle
- Validation and attestation workflows
- Proof and export generation
- Privacy and visibility enforcement
- Chain coordination and admin gateways

### `apps/admin/` — Operator Control Plane
An internal tool for system operators:
- System health and monitoring
- Chain action management
- Organization and admin search
- Policy and settings control
- Audit trail visibility

### `contracts/` — On-Chain Registries
Minimal, justified smart contracts for:
- Credential verification on-chain
- Identity registry
- Composable proof verification
- Public verifiability of attestations

### `packages/` — Shared Code
Reusable modules including:
- Contract ABIs and deployment configs
- Type definitions and utilities
- Configuration across apps

---

## Design Principles

### Coherence Over Breadth
Achievo focuses on completing core flows rather than adding unrelated features. The platform stays true to its mission as reputation infrastructure.

### Trust Over Spectacle
UI prioritizes legibility, state clarity, and transaction transparency. System credibility matters more than visual polish.

### Completion Over Expansion
When choosing between finishing proofs, improving validation workflows, or adding new features, completion takes priority.

### Explicit State Over Hidden Magic
Every critical object has a clear lifecycle:
- Organization creation
- Program publication
- Submission state
- Validation decisions
- Attestation generation
- Export status
- Verification outcomes

### Safety Before Convenience
For admin operations, auth, chain writes, and exports:
- Explicit authorization is required
- All actions are auditable
- Silent mutations are avoided
- Dangerous operations preserve dry-run capability

---

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript (94% of codebase)
- **Backend**: NestJS 10, Prisma 5, PostgreSQL
- **Blockchain**: Solidity smart contracts (2.8% of codebase), Base Sepolia testnet
- **Package Manager**: npm
- **Runtime**: Node.js 20.11.1+

---

## Core Product Surfaces

### Primary (V1 Center)
- Identity and profiles
- Organizations and org management
- Programs and program workflows
- Milestones and submissions
- Validations and attestations
- Public verification portal
- Profile exports and artifacts
- Admin control plane

### Secondary
- Project tracking
- Privacy and visibility controls
- Anchoring and indexer support

### Deferred
- Social/parties layer
- Leaderboards and streaks
- Username marketplace
- Risk engine as front-and-center feature

---

## Why Achievo Exists

Most reputation systems are either:
- **Centralized and opaque** — You can't verify claims without trusting the issuer
- **Speculative and gamified** — They prioritize engagement over credibility
- **Generic badge platforms** — They don't reflect real work or structured achievement

Achievo solves this by creating a **verifiable, structured, and trustworthy** alternative where:
- Achievement is tied to real, validated work
- Proofs are portable and independently verifiable
- Reputation is built through completed programs, not speculation
- Organizations have the tools to define, validate, and attest to accomplishments
- The system stays focused on credibility, not feature bloat

---

## License

ISC

## Author

Emiloart
