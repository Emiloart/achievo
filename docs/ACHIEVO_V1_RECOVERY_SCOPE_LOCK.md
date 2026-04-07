# Achievo v1 Recovery + Scope Lock

## Status

This document is the working scope-lock and recovery-governance baseline for Achievo v1.

It is not a brainstorming note.

It defines:

- what Achievo is now
- what Achievo v1 is
- what remains in scope
- what must be hidden, cut, or postponed
- the primary product hierarchy and golden path
- the engineering stabilization order
- the dependency-upgrade gate
- the v1 exit criteria

If later ideas conflict with this document, this document wins until it is explicitly revised.

## What Achievo Is Now

Achievo is currently a broad monorepo spanning:

- smart contracts for identity, usernames, goals, badges, anchoring, and org registry
- a public web app
- an admin console
- a NestJS backend
- Postgres and Prisma data models
- operational layers for health, indexer, anchoring, monitoring, and admin workflows

In product terms, Achievo has evolved into a mixed system containing:

- wallet identity and session auth
- organization creation and management
- organization programs and milestone submissions
- validator inbox and attestations
- public verification
- profile exports
- projects, invoices, and time tracking
- username registry and marketplace
- parties and social features
- admin control-plane tooling

This breadth is real, but it is no longer acceptable as the v1 product frame.

The current problem is not lack of features.

The current problem is surface-area sprawl, uneven completion, and insufficient convergence around one dominant workflow.

## What Achievo v1 Is

Achievo v1 is:

**Verifiable program and credential infrastructure for ecosystems, cohorts, and contributor networks.**

Achievo v1 is not:

- a generic productivity app
- a social/community app
- a username trading product
- a broad on-chain dashboard
- a bundle of parallel feature bets with equal weight

The v1 product center is:

- identity
- organizations
- programs
- milestones
- submissions
- evidence
- validation
- verification
- exports
- issuer/admin operations

## Scope Lock

All product, UX, backend, and ops work must strengthen the core v1 workflow.

If a change does not materially improve one of the following, it is out of scope for v1:

- issuer setup and organization control
- program authoring
- milestone definition
- submission and evidence handling
- validator review and attestation
- public verification
- export and sharing of verifiable outputs
- admin control and operational trust

## Keep / Hide / Cut / Postpone

### Keep

These remain primary v1 product surfaces and may be improved directly:

- Identity
- Organizations
- Programs
- Milestones
- Submissions
- Evidence / Proofs
- Validator inbox
- Validation / Attestation
- Verification portal
- Profile exports
- Admin control plane
- Privacy and trust-state presentation where required for the core workflow

### Hide

These may remain in the repository, but must leave the primary v1 pitch, top-level IA, and default demo path:

- Projects
- Parties
- Username market
- Goal-first public framing
- Quests
- Streaks
- Leaderboard
- Risk engine as a user-facing theme
- Legacy views and legacy framing

Hide means:

- remove from primary navigation where applicable
- do not present as equal peers to the v1 core
- no new polish work unless directly required by stabilization or compatibility

### Cut

These are cut from the v1 product story and must not be sold as defining capabilities:

- Achievo as a social platform
- Achievo as a productivity/gamification app
- Achievo as a username marketplace product
- parallel public narratives built around goals, parties, projects, and trading at the same level as programs and validation

Cut does not require immediate code deletion.

Cut does require product, demo, IA, and roadmap removal.

### Postpone

These are explicitly deferred until after v1 exit criteria are met:

- expanded project workspace investment
- escrow or richer marketplace settlement rails
- party onboarding and deeper social loops
- broader gamification loops
- user-facing risk scoring features
- non-essential legacy migration surfaces
- major cosmetic exploration that does not improve trust, clarity, or core workflow completion

## Primary Product Hierarchy

Achievo v1 adopts one dominant hierarchy:

1. Organization
2. Program
3. Milestone
4. Submission
5. Evidence / Proof
6. Validation / Attestation
7. Credential Artifact
8. Verification

This hierarchy replaces the previous tendency to treat multiple concepts as parallel first-class product centers.

Specific implications:

- programs outrank standalone goals in v1 framing
- milestones are subordinate to programs
- submissions are subordinate to milestones
- evidence exists to support submissions and validation
- validation exists to turn evidence into trusted outcome
- exports and public views are artifact and verification surfaces, not separate product families

## Golden Path

The single v1 golden path is:

1. Create organization
2. Create or publish program
3. Define milestone
4. User submits evidence
5. Validator reviews and attests
6. Trusted output becomes visible
7. Export and public verification succeed

In compact form:

**Org -> Program -> Milestone -> Submission -> Evidence -> Validation -> Verification -> Export**

This path is the standard by which v1 scope decisions are made.

If a feature does not improve this path, it is not a v1 priority.

## Product Rules

The following rules are in force for v1:

- No new primary-nav destinations outside the locked v1 core.
- No new product pillar may be introduced without explicit revision of this document.
- No demo path should depend on hidden or postponed modules.
- No homepage or top-level messaging should frame Achievo primarily around goals, parties, projects, or username trading.
- Programs, validation, verification, and exports must be legible as one connected system.
- Trust state must remain explicit wherever the user can act on or inspect a credential-related object.

## Engineering Stabilization Order

Engineering recovery must proceed in this order.

### 1. Restore source-of-truth integrity

- stop tolerating generated or transpiled-looking source in backend `src`
- reduce `@ts-nocheck` coverage materially
- re-establish readable, reviewable source for the core v1 domains

### 2. Complete proofs as a first-class core domain

- implement proof creation, retrieval, listing, file access, and anchoring flows end to end
- remove proof-domain stubs from the primary path

### 3. Fix schema, migration, and test alignment

- ensure Prisma schema and migrations agree
- eliminate missing-table failures in e2e and worker startup
- make proof, validation, admin, and operational tables trustworthy across environments

### 4. Build the golden path end to end

- org create
- program create/publish
- milestone create
- submission create
- evidence attach
- attestation
- verify
- export

Every step must be functional, not only present in UI.

### 5. Clean admin trust boundaries

- make the documented admin security model true in code
- remove ambiguity between direct browser-to-backend calls and server-side admin proxy flow
- preserve CSRF, RBAC, auditability, and session boundaries as non-negotiable controls

### 6. Converge docs, runbooks, and commands

- docs must reflect actual scripts, ports, and runtime behavior
- remove stale or contradictory instructions

### 7. Rebuild CI confidence

- root quality gates must reflect real health
- backend confidence cannot rely on typecheck alone
- e2e and integration confidence must be credible before expansion resumes

## Forbidden Expansion Areas

Until v1 exit criteria are met, the following are forbidden:

- adding new top-level product modules
- deepening party/social features
- deepening marketplace or payment complexity
- expanding projects into a co-equal product line
- adding new gamification systems
- polishing hidden surfaces instead of fixing core workflow gaps
- major design/theme work that does not improve trust, clarity, accessibility, or golden-path completion
- introducing additional architectural layers to support non-core features

The following are also forbidden until stabilization is complete:

- large framework migrations
- dependency-major upgrade campaigns
- broad refactors outside the core v1 path

## Dependency-Upgrade Gate

Major dependency upgrades are gated behind stabilization.

No major upgrade campaign for Next, React, Nest, Prisma, Tailwind, wagmi, or related core infrastructure may begin until all of the following are true:

- the core v1 golden path works end to end
- proofs are implemented and no longer stubbed
- backend source integrity has been materially restored in the core domains
- schema and migrations are aligned
- admin trust-boundary behavior is consistent with the documented model
- docs and runbooks reflect reality
- test confidence is credible at unit, integration, and e2e levels

Minor safe updates may proceed only if they are:

- security-related
- low-risk
- isolated
- required for the stabilization path

## V1 Exit Criteria

Achievo v1 is ready only when all of the following are true.

### Product exit criteria

- The product presents one coherent story: verifiable program and credential infrastructure.
- Primary IA reflects the locked v1 core.
- Hidden and postponed modules are no longer primary surfaces.
- Programs, milestones, submissions, evidence, validation, verification, and exports read as one connected system.

### Workflow exit criteria

- A user can move through the entire golden path without hitting stubs or conceptual dead ends.
- Evidence and validation outcomes are legible and trustworthy.
- Public verification is clear, stable, and non-ambiguous.
- Exported artifacts are usable and verifiable.

### Engineering exit criteria

- Core v1 backend domains are implemented as real source, not tolerated as opaque generated-style code.
- Proofs are fully implemented for the v1 path.
- Schema and migrations are aligned.
- Critical integration and e2e paths pass reliably.
- Admin trust boundaries match the intended architecture.
- Docs, runbooks, ports, and scripts are consistent.

### Governance exit criteria

- Any proposal to expand beyond the v1 lock is deferred until this document is revised explicitly.
- The repo has a clear rule that convergence outranks expansion.

## Decision Rule

When evaluating work during the v1 recovery period, ask:

1. Does this strengthen the golden path?
2. Does this reduce ambiguity in product scope?
3. Does this improve trust, clarity, or operational reliability?
4. Does this help the repo converge?

If the answer is no, the work is out of scope for Achievo v1.
