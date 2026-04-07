# AGENTS.md

## Purpose

This file defines how coding agents, automation agents, and human contributors must operate in the Achievo repository.

Achievo is not a generic Web3 sandbox. It is a **verifiable achievement, milestone, validation, and reputation infrastructure** product. All work must push the repository toward a more coherent, trust-grade, production-capable system.

This document is authoritative for agent behavior at the repository root.

---

# 1. Mission

Achievo exists to help organizations, ecosystems, cohorts, and contributor networks:

- define structured programs
- issue milestones
- collect submissions and evidence
- validate those submissions
- generate portable proof artifacts
- verify those artifacts publicly
- build durable reputation from real work

Agents must optimize for this mission.

Agents must not treat Achievo as:

- a generic social app
- a random on-chain experiment playground
- a badge toy
- a thin productivity game
- a miscellaneous feature bucket

If a proposed change improves code quality but weakens product coherence, the agent must prefer coherence.

---

# 2. Product Definition

## Core product

Achievo is a **verifiable program and reputation system**.

The core product loop is:

1. an organization exists
2. the organization publishes a program
3. the program defines milestones
4. a participant submits evidence
5. a validator/reviewer attests or reviews
6. Achievo produces a verifiable outcome
7. that outcome can be exported, shared, and publicly verified

All major changes should strengthen this loop.

## V1 product center

The primary Achievo surface for near-term delivery is:

- identity
- organizations
- programs
- milestones
- submissions
- validations / attestations
- verification portal
- profile exports
- admin control plane

## Secondary surfaces

These may remain in the codebase, but they are not the main product narrative and must not distort the main information architecture:

- projects
- username claim
- privacy controls
- anchoring / indexer / monitoring

## Deferred or de-emphasized surfaces

These are explicitly not primary product priorities unless the repository owner requests otherwise:

- parties / community social layer
- username marketplace as a headline feature
- quests / streaks / leaderboard as primary product identity
- legacy views as user-facing product areas
- risk engine as a front-and-center user feature

Agents must not elevate deferred surfaces into the main navigation, core architecture, or primary pitch unless directly instructed.

---

# 3. Root Operating Principles

## 3.1 Coherence over breadth

Do not add new modules merely because the architecture can support them.

Prefer:

- finishing incomplete flows
- removing ambiguity
- reducing duplication
- simplifying state transitions
- clarifying trust boundaries

## 3.2 Trust over spectacle

Achievo should feel credible, not ornamental.

UI work must prioritize:

- legibility
- state clarity
- transaction clarity
- failure handling
- reviewability
- verification trust

Visual polish is valuable, but not at the expense of system understanding.

## 3.3 Completion over expansion

When choosing between:

- finishing proofs
- improving validation UX
- tightening org program workflows
- adding a new community or marketplace feature

agents must prefer the first group.

## 3.4 Explicit state over hidden magic

Every critical object should have a clear lifecycle.

Examples include:

- org creation
- program publication
- milestone submission
- review decision
- attestation
- anchor status
- export generation
- verification outcome
- chain action status

Agents must avoid designs where state is inferred from scattered booleans or side effects.

## 3.5 Safety before convenience

For admin actions, auth, chain writes, file access, exports, and verification logic:

- require explicit authorization
- preserve auditability
- avoid silent mutation
- avoid browser exposure of secrets
- keep dangerous operations dry-runable when appropriate

---

# 4. Repository Scope Boundaries

Agents must understand the intended scope of each major area.

## `web/`

Public product surface for:

- identity
- org discovery and management
- programs and milestone submissions
- validations and validator inbox
- verification portal
- profile exports
- selected secondary features

The web app is a product app, not a developer console.

## `apps/admin/`

Issuer and operator control plane for:

- system health
- chain actions
- anchoring
- indexer status
- org/admin search and management
- policy and settings
- audit visibility

The admin app must remain operationally safe and auditable.

## `backend/`

Authoritative off-chain service for:

- sessions and auth
- org/program/submission lifecycle
- proofs and validations
- exports
- privacy and visibility rules
- admin gateways
- chain and ops coordination
- indexer and anchoring workers

The backend is the product truth layer for off-chain state.

## `contracts/`

Only contains logic that genuinely belongs on-chain.

Do not push off-chain workflow complexity into contracts unless there is a strong trust or composability reason.

## `packages/`

Shared code only. Keep package boundaries meaningful.

Do not create shared packages just to move files around.

---

# 5. Source-of-Truth Rules

Agents must not invent product scope.

When making changes, use this order of truth:

1. this `AGENTS.md`
2. repository code as currently implemented
3. feature inventory / architecture docs
4. route maps and verification docs
5. backlog docs
6. older notes only when still consistent with current code

If docs and code disagree, the agent must:

- treat current code as implementation truth
- identify the discrepancy
- update docs if the code is intentional
- or fix the code if the docs reflect the intended product direction

Agents must never quietly ignore drift.

---

# 6. What Agents Must Prioritize

Agents should prefer work in this order unless instructed otherwise.

## Tier 1

- complete incomplete core flows
- fix broken or stubbed core services
- reduce product ambiguity
- improve reliability of build, test, and runtime workflows
- tighten trust and verification states

## Tier 2

- improve issuer/admin workflows
- strengthen documentation and onboarding
- improve observability and operational readiness
- reduce duplication and architectural drift

## Tier 3

- visual polish
- ergonomics improvements
- secondary workflow enhancements
- deferred modules

---

# 7. Explicit Do-Not-Build Rules

Agents must not introduce the following without direct instruction:

- new top-level product categories
- tokenomics, governance tokens, or speculative crypto mechanisms
- broad social features that shift focus away from trust infrastructure
- new marketplace systems beyond the existing justified scope
- new chains, chain abstractions, or protocol rewrites for novelty
- GraphQL migration just because it is fashionable
- repo-wide framework migrations without a concrete bottleneck
- large UI rewrites that do not improve core workflow clarity

Agents must not create a second product inside Achievo.

---

# 8. Core Architecture Rules

## 8.1 Keep the main domain hierarchy clear

Agents should preserve or strengthen this conceptual model:

- Organization
- Program
- Milestone
- Submission
- Proof / Evidence
- Validation / Attestation
- Export / Artifact
- Verification

If a change makes this hierarchy harder to understand, it is suspect.

## 8.2 Avoid parallel concepts that mean nearly the same thing

Agents must reduce duplication such as multiple public sharing models or overlapping workflow terms when possible.

For example, if there are multiple sharing surfaces, the agent should prefer unification instead of adding another variant.

## 8.3 On-chain vs off-chain responsibility

Use on-chain logic only where it improves:

- ownership
- verifiability
- public composability
- irreversible proof or registry behavior

Keep off-chain:

- session logic
- admin workflow state
- rich content lifecycle
- review queues
- non-essential coordination
- operational systems

## 8.4 Backward compatibility is not absolute

If a cleanup meaningfully improves product clarity, agents may propose or implement controlled breaking changes, provided they:

- explain the reason
- document migration or deprecation
- avoid careless breakage

---

# 9. Rules for Web App Work

## 9.1 Web information architecture

The public app should emphasize:

- Dashboard
- Identity
- Organizations
- Programs / workbench flows
- Verify
- supporting secondary areas only where justified

Agents must avoid nav clutter.

## 9.2 UX standards

All critical pages should have explicit:

- loading state
- empty state
- error state
- unauthorized state
- wrong-chain or unavailable-chain state when relevant
- degraded mode handling when backend or RPC is impaired

## 9.3 Transaction UX

For every on-chain action, show:

- what action is happening
- when wallet confirmation is required
- when submission succeeded
- when confirmation is pending
- when finality is reached
- what failed and whether retry is safe

Never hide chain writes behind vague UI copy.

## 9.4 Public verification UX

Verification pages must not confuse:

- not found
- invalid
- unknown
- temporarily degraded
- verified

Unknown must not be presented as proven failure.

## 9.5 Theme discipline

Premium styling is allowed.

But agents must not let theme work:

- reduce contrast
- obscure state information
- slow down key flows
- overpower dense operational screens
- introduce novelty effects without utility

---

# 10. Rules for Admin App Work

## 10.1 Admin is an operator surface

The admin app is not a decorative dashboard. It is a control plane.

Changes must optimize for:

- speed of diagnosis
- clarity of state
- action auditability
- low-risk execution
- visibility into side effects

## 10.2 Dry-run before execute

For dangerous operations, agents must preserve or improve the two-step model:

- inspect
- dry-run
- confirm intent
- execute
- audit result

## 10.3 Audit trail is mandatory

Admin mutations should be attributable, reviewable, and minimally reversible when appropriate.

Never remove auditability for convenience.

## 10.4 Do not bury operational truth

Health, chain action, anchoring, indexer, and policy states must remain easy to inspect.

---

# 11. Rules for Backend Work

## 11.1 Backend is the authoritative off-chain layer

Agents must not move important off-chain business rules into the frontend.

Validation, permissions, and lifecycle rules belong in backend services.

## 11.2 No silent stubs in core domains

If a core service is stubbed or throwing not-implemented behavior in a supposedly supported flow, agents should treat that as a high-priority defect.

This is especially true for:

- proofs
- validations
- exports
- program/submission lifecycle
- verification read models

## 11.3 Explicit contracts and DTO discipline

Use typed DTOs and validation consistently.

Do not permit vague payloads for important workflows.

## 11.4 Clear failure categories

Return errors that distinguish:

- invalid input
- permission denied
- unauthenticated
- unavailable dependency
- degraded/unknown external verification
- conflict/state-transition errors
- not implemented

## 11.5 Privacy and visibility enforcement

Privacy must be enforced in backend reads, not just hidden in UI.

## 11.6 Keep service boundaries meaningful

Prefer domain services with coherent responsibilities.

Do not allow service classes to become grab-bags of unrelated behavior.

---

# 12. Rules for Contract Work

## 12.1 Contracts should stay minimal and justified

Only place logic on-chain if the product benefits materially from:

- public verifiability
- censorship resistance
- wallet-native ownership
- composable registry behavior

## 12.2 Avoid speculative contract complexity

Do not add:

- unnecessary upgrade layers
- governance machinery without product demand
- token economics logic
- over-general registries
- intricate permission graphs that can live off-chain

## 12.3 Contract changes require extra discipline

Any contract change should include, where relevant:

- updated tests
- deployment implications
- ABI/export implications
- backend address/config implications
- migration notes
- security considerations

---

# 13. Rules for Data and Migrations

## 13.1 Schema changes must reflect product intent

Do not add tables or enums just to support hypothetical future ideas.

## 13.2 Preserve lifecycle clarity in schema

Schemas should make it easy to understand:

- what object exists
- what state it is in
- who controls it
- how it becomes public/verifiable

## 13.3 Migration discipline

Every migration must be:

- purposeful
- named clearly
- reversible in reasoning, even if not literally rolled back
- accompanied by code changes that fully use the new model

## 13.4 No orphaned schema evolution

Agents must not add schema without wiring:

- services
- validation
- tests
- docs where necessary

---

# 14. Testing and Verification Rules

## 14.1 All meaningful changes require verification

At minimum, agents should run or reason through the most relevant subset of:

- lint
- typecheck
- unit tests
- integration tests
- e2e tests
- build

## 14.2 Prefer narrow verification for narrow changes

Do not waste time with full-suite theatrics when a smaller scope proves the change.

But do not skip critical verification for core-flow changes.

## 14.3 Broken verification must be surfaced honestly

Agents must explicitly report:

- what passed
- what failed
- what was not run
- whether a failure is pre-existing or introduced

## 14.4 Slow tests are a product of structure

Agents should improve test ergonomics when practical:

- split oversized suites
- reduce hidden environment coupling
- stabilize backend dependencies
- isolate flaky network assumptions

## 14.5 Build hacks must not become permanent policy silently

If a workaround is used to make builds pass, it must be documented and either justified or scheduled for cleanup.

---

# 15. Documentation Rules

## 15.1 Docs must match code reality

Agents must not leave polished docs describing behavior that the code does not implement.

## 15.2 Important changes require doc updates

Update docs when changes affect:

- product scope
- route map
- operational runbooks
- setup steps
- verification commands
- admin flows
- environment requirements

## 15.3 Root docs should stay strategic

The root-level documentation should communicate:

- what Achievo is
- how it is structured
- how to run it
- how to verify it
- what is core vs deferred

## 15.4 Avoid documentation sprawl

Do not create many overlapping docs that say nearly the same thing.

Prefer a clean index and a small number of authoritative files.

---

# 16. Security Rules

## 16.1 Secrets never belong in client code

Agents must never expose admin secrets, private keys, or server-only operational data to the browser.

## 16.2 Admin operations must be guarded

Preserve or improve:

- session protection
- CSRF protection
- intent confirmation
- audit logging
- privilege checks

## 16.3 Verification must fail safely

When external dependencies fail, return unknown/degraded where appropriate instead of falsely asserting invalidity.

## 16.4 Uploaded or referenced content is not trusted by default

Treat files, URLs, proofs, and external references as untrusted input.

## 16.5 Auth and privacy bugs outrank polish work

If agents discover security, privacy, or authorization defects, those should take priority over cosmetic improvements.

---

# 17. Performance and Reliability Rules

## 17.1 Reliability beats cleverness

Avoid fragile optimizations that reduce maintainability.

## 17.2 Explicit degraded mode

If a flow depends on backend, RPC, storage, or indexing availability, the product should surface degraded behavior explicitly.

## 17.3 Reduce hidden local-environment traps

Agents should prefer reproducible local development and testing over machine-specific assumptions.

## 17.4 Avoid coupling the web app too tightly to an always-up backend in dev/test unless the dependency is explicit

If the web proxy requires backend availability, that should be made visible and testable rather than appearing as mysterious failures.

---

# 18. Code Quality Rules

## 18.1 Small, purposeful changes are preferred

Unless a broader refactor is required, agents should avoid giant rewrites.

## 18.2 Remove dead abstractions

If a wrapper, helper, or module adds indirection without real value, remove or simplify it.

## 18.3 Preserve naming clarity

Names should reflect business meaning, not implementation trivia.

Prefer names like:

- program
- milestone
- submission
- attestation
- export
- verification status

Avoid vague names like:

- item
- data
- payload manager
- utils2

## 18.4 Keep state transitions readable

When workflows have lifecycle states, encode them explicitly and centralize transition logic where possible.

## 18.5 No cosmetic churn-only commits

Do not produce large formatting or file-shuffling churn unless it supports a real improvement or necessary normalization.

---

# 19. Product Decision Heuristics for Agents

When uncertain, agents should ask:

1. Does this make the core program → submission → validation → verification loop stronger?
2. Does this reduce ambiguity?
3. Does this improve trust, auditability, or usability?
4. Does this simplify the product surface?
5. Does this align with Achievo as infrastructure for verifiable achievement and reputation?

If the answer is mostly no, the change is probably not a priority.

---

# 20. Expected Agent Output Format

When an agent completes work, it should report clearly using this structure:

## Summary

- what changed
- why it changed

## Files changed

- list relevant files

## Verification

- what commands were run
- what passed
- what failed
- what was not run

## Risks / follow-ups

- known remaining issues
- cleanup work
- migration or deployment implications

## Product impact

- which user or operator workflow improved

Agents must be explicit and concise. No vague “done” messages.

---

# 21. Completion Criteria

A task is not complete merely because code compiles.

A task is considered complete when:

- the implementation matches the intended workflow
- the most relevant tests/build checks pass or failures are understood and reported
- docs are updated if needed
- the change does not create obvious product drift
- the user/operator-facing effect is clear

---

# 22. Escalation Rules

Agents should stop and surface concerns when they detect:

- conflicting product directions
- docs claiming behavior that code does not support
- dangerous auth/security regressions
- major schema or contract implications
- a request that would turn Achievo into a different product

Agents should not silently force through such changes.

---

# 23. Non-Negotiable Product Direction

Achievo must converge toward:

- a clean issuer workflow
- a clean participant submission workflow
- a credible validation/attestation workflow
- a strong public verification surface
- a useful export/share artifact model
- a trustworthy admin control plane

Agents must actively resist feature drift away from that direction.

---

# 24. Final Rule

When in doubt, do the thing that makes Achievo feel more like a **trustworthy credential and reputation infrastructure product** and less like a **collection of unrelated Web3 features**.
