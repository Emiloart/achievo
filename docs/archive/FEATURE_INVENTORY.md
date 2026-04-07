# Achievo Feature Inventory

This document inventories implemented features across web, admin console, backend, contracts, database, and ops. It is grounded in the current codebase only; partial or gated features are labeled explicitly.

## A) System Map

```mermaid
flowchart LR
  Web[Web App (web/ Next.js)]
  Admin[Admin Console (apps/admin Next.js)]
  Wallet[Wallet (Injected)]
  Backend[Backend (NestJS API)]
  DB[(Postgres via Prisma)]
  Chain[Base Sepolia / EVM]
  Storage[(File Storage: Local/S3, IPFS gateways)]

  Web <--> Backend
  Admin <--> Backend
  Web <--> Wallet
  Web <--> Chain
  Backend <--> DB
  Backend <--> Chain
  Backend <--> Storage

  %% Trust boundaries
  Wallet:::trust
  Chain:::trust
  DB:::trust
  Storage:::trust

  classDef trust stroke-width:2px,stroke:#555;
```

- Web app is client-only and uses wagmi for on-chain reads/writes, calling the backend via an API proxy.
- Admin Console is a separate app with cookie sessions and server-side admin gateway.
- Backend is the authoritative off-chain service for sessions, organizations, projects, proofs, validations, and marketplace orderbook.
- Chain provides on-chain identity, goals, badges, organization creation, anchoring, and username ownership.
- Storage provides proof files and profile exports when enabled.

## B) Feature Inventory (Exhaustive)

### Frontend route map (web)

App Router pages (37 routes):

- /
- /about
- /admin
- /approve
- /dashboard
- /exports/[publicId]
- /goals/new
- /goals/[id]
- /identity
- /invoices/public/[slug]
- /orgs
- /orgs/[handle]
- /orgs/[handle]/admin
- /orgs/[handle]/members
- /orgs/[handle]/programs/[slug]
- /orgs/[handle]/programs/[slug]/submit
- /parties
- /parties/[slug]
- /parties/new
- /profile/[address]
- /profile/professional/[handle]
- /projects
- /projects/new
- /projects/[slug]
- /projects/[slug]/invoices/[invoiceId]
- /projects/[slug]/invoices/new
- /projects/share/[slug]
- /s/[slug]
- /share/[publicId]
- /usernames/market
- /validators/inbox
- /verify
- /verify/anchor/[hash]
- /verify/export/[publicId]
- /verify/proof/[id]
- /verify/tx/[txHash]
- /verify/validation/[id]

API proxy route:

- /api/\* -> `web/app/api/[...path]/route.ts`

### Admin Console route map (apps/admin)

App Router pages (10 routes):

- /
- /alerts
- /anchoring
- /chain-actions
- /health
- /indexer
- /login
- /orgs
- /settings
- /usernames
- /users

### Major UI components (web)

- Navigation/layout: `web/components/nav/GlobalNav.tsx`, `web/components/layout/PageLayout.tsx`, `web/components/nav/PageHeader.tsx`
- Wallet/session: `web/components/ConnectWallet.tsx`, `web/components/IdentityBadge.tsx`, `web/hooks/useBackendAuth.ts`
- States: `web/components/states/LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `AuthRequired.tsx`, `ChainRequired.tsx`
- Transaction UX: `web/components/tx/TxStepper.tsx`, `web/components/tx/useTxLifecycle.ts`
- Verify domain: `web/components/domain/verify/VerifyResultCard.tsx`
- Profile editors: `web/components/ProfileEditor.tsx`, `web/components/ProfessionalProfileEditor.tsx`, `web/components/ShareLinksManager.tsx`, `web/components/PrivacySettingsEditor.tsx`
- Data display: `web/components/ui/DataTable.tsx`, `Card`, `Badge`, `StatusPill`, `VerifiedStamp`, `HashDisplay`, `QRCode`

### Major UI components (Admin Console)

- Layout and nav: `apps/admin/components/layout/AppShell.tsx`, `apps/admin/components/nav/SideNav.tsx`, `TopBar.tsx`
- Auth: `apps/admin/components/auth/AdminSessionProvider.tsx`, `AdminGate.tsx`
- Actions: `apps/admin/components/actions/TwoStepAction.tsx`
- UI primitives: `apps/admin/components/ui/StatusPill.tsx`, `CopyButton.tsx`

---

### Feature: Session auth (wallet sign-in, cookie sessions)

- Status: complete
- UX screens:
  - /identity (connect + sign-in), /dashboard (session-based)
- Frontend files:
  - `web/hooks/useBackendAuth.ts`, `web/components/ConnectWallet.tsx`, `web/app/identity/page.tsx`, `web/app/api/[...path]/route.ts`
- Backend routes (auth):
  - POST /auth/nonce (fields: walletAddress)
  - POST /auth/login (fields: walletAddress, signature)
  - POST /auth/verify (fields: address, signature, nonce)
  - POST /auth/refresh (cookie-based)
  - POST /auth/logout
  - GET /auth/me
- DTOs:
  - `backend/src/auth/dto.ts`: NonceRequestDto, LoginRequestDto, VerifyRequestDto
- DB models:
  - User, Wallet, WalletNonce, AuthSession, AuthNonce
- Contracts:
  - None (session is off-chain)
- Dependencies:
  - JWT_SECRET, AUTH_ACCESS_TTL_MINUTES, AUTH_REFRESH_TTL_DAYS, AUTH_NONCE_TTL_MINUTES, COOKIE_SECURE
- Edge cases:
  - Invalid signature or expired nonce
  - CSRF header required by proxy for non-GET
  - Token refresh failure clears session

---

### Feature: Web API proxy with CSRF bridging

- Status: complete
- UX screens:
  - All screens via /api/\*
- Frontend files:
  - `web/app/api/[...path]/route.ts`
- Backend routes:
  - All backend routes reached through proxy
- Dependencies:
  - API_PROXY_TARGET (web)
- Edge cases:
  - 401 auto-refresh and retry
  - CSRF cookie auto-injected for state-changing requests

---

### Feature: Admin auth (email/password with cookie sessions)

- Status: complete (Admin Console ready)
- UX screens:
  - Admin Console /login
- Frontend files:
  - `apps/admin/app/login/page.tsx`, `apps/admin/components/auth/*`, `apps/admin/lib/adminApi.ts`
- Backend routes:
  - POST /admin-auth/login (email, password)
  - POST /admin-auth/refresh
  - POST /admin-auth/logout
  - GET /admin-auth/me
  - GET /admin-auth/csrf
- DB models:
  - AdminUser, AdminSession, AdminCsrfToken, AdminAuditLog
- Dependencies:
  - ADMIN*ACCESS_TTL_MIN, ADMIN_REFRESH_TTL_DAYS, ADMIN_LOCKOUT*\* , ADMIN_CSRF_TTL_MIN
- Edge cases:
  - Lockout after repeated failures
  - Refresh token reuse revokes session family
  - CSRF token required for mutations

---

### Feature: Admin gateway + two-step commit (server-side proxy)

- Status: complete
- UX screens:
  - Admin Console (dashboard, chain actions, indexer, anchoring, orgs, users, usernames, settings)
- Frontend files:
  - `apps/admin/components/actions/TwoStepAction.tsx`, `apps/admin/app/(protected)/*/page.tsx`
- Backend routes:
  - POST /admin-gateway/dry-run
  - POST /admin-gateway/execute
  - GET /admin-gateway/overview
  - GET /admin-gateway/health
  - GET /admin-gateway/alerts
  - GET /admin-gateway/chain-actions
  - GET /admin-gateway/chain-actions/:id
  - GET /admin-gateway/indexer/status
  - GET /admin-gateway/anchoring/status
  - GET /admin-gateway/orgs/search
  - GET /admin-gateway/orgs/:id
  - GET /admin-gateway/users/search
  - GET /admin-gateway/users/:id
  - GET /admin-gateway/usernames/search
  - GET /admin-gateway/env
  - GET /admin-gateway/admin-users
  - POST /admin-gateway/admin-users
  - PATCH /admin-gateway/admin-users/:id
  - GET /admin-gateway/audit
- DB models:
  - AdminActionIntent, AdminAuditLog
- Dependencies:
  - Admin session cookies + CSRF
- Edge cases:
  - Execute requires matching intent, payload hash, and confirm phrase
  - All mutations are audited

---

### Feature: On-chain identity (Achievo ID)

- Status: partial (UI for recovery/sub-wallets is not implemented)
- UX screens:
  - /identity, /dashboard, /profile/[address]
- Frontend files:
  - `web/hooks/useIdentity.ts`, `web/app/identity/page.tsx`, `web/components/IdentityBadge.tsx`, `web/lib/contracts.ts`
- Backend routes:
  - None required for on-chain ID registration
- DB models:
  - User (stores primaryWallet + userId), Wallet
- Contracts:
  - AchievoIdentity: register, setProfile, setRecoveryKey, addSubWallet, removeSubWallet, transferUsername
- Dependencies:
  - NEXT_PUBLIC_IDENTITY_ADDRESS
- Edge cases:
  - Missing contract address
  - Wallet not connected or wrong chain
  - Recovery/sub-wallet management UI missing

---

### Feature: Profile summary and dashboard

- Status: complete
- UX screens:
  - /dashboard, /profile/[address]
- Frontend files:
  - `web/app/dashboard/page.tsx`, `web/app/profile/[address]/page.tsx`, `web/hooks/useProfileInfo.ts`
- Backend routes:
  - GET /profile/me (returns on-chain profile summary + off-chain displayName)
  - PUT /profile/me (fields: displayName)
- DB models:
  - User, Username, UserQuest, UserStreak
- Contracts:
  - AchievoIdentity (profile fields), AchievoCoreV11 (goals, badges)
- Dependencies:
  - NEXT_PUBLIC_IDENTITY_ADDRESS, NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS, NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS
- Edge cases:
  - Unauthenticated returns empty defaults
  - Chain data may be unavailable or stale

---

### Feature: Professional profile, pins, and share links

- Status: partial (public handle page exists; admin UI is minimal)
- UX screens:
  - /profile/professional/[handle], /share/[publicId], /s/[slug]
- Frontend files:
  - `web/app/profile/professional/[handle]/page.tsx`, `web/app/share/[publicId]/page.tsx`, `web/app/s/[slug]/page.tsx`
  - `web/components/ProfileEditor.tsx`, `web/components/ProfessionalProfileEditor.tsx`, `web/components/ShareLinksManager.tsx`, `web/components/PrivacySettingsEditor.tsx`
- Backend routes:
  - GET /profile/professional/me
  - PUT /profile/professional/me
  - GET /profile/pins/me
  - PUT /profile/pins/me
  - POST /profile/share-links
  - PATCH /profile/share-links/:id
  - DELETE /profile/share-links/:id
  - GET /profile/share-links/me
  - GET /profile/professional/public/:handle
  - GET /profile/:slug (public profile lookup)
  - GET /share-links/:slug (share link resolver)
- DTO fields (body usage):
  - displayName, bio, website, location, availability, skills, socials, headline, avatar
  - pins (list), share link title, slug, visibility, theme
- DB models:
  - ProfessionalProfile, ProfileShareLink, ProfilePin
- Edge cases:
  - Share links can be private/unlisted
  - Public profile may 404 when private

---

### Feature: Identity directory, social graph, and activity

- Status: partial (search and follow implemented; UI minimal)
- UX screens:
  - /dashboard, /profile/[address]
- Frontend files:
  - `web/hooks/useIdentity.ts`, `web/hooks/useProfileInfo.ts`
- Backend routes:
  - GET /identity/search (query: q, skills, availability, minLevel, minGoalsCompleted)
  - GET /identity/:achusrId/followers
  - GET /identity/:achusrId/following
  - GET /identity/:achusrId/follow-stats
  - GET /identity/:achusrId/activity
  - POST /identity/:achusrId/follow
  - POST /identity/:achusrId/unfollow
- DB models:
  - UserFollow, UserActivity
- Edge cases:
  - Viewer required for follow/unfollow
  - Privacy rules may limit surfaced data

---

### Feature: Username availability and claim (on-chain verified)

- Status: complete (requires on-chain ownership)
- UX screens:
  - /identity
- Frontend files:
  - `web/app/identity/page.tsx`, `web/hooks/useIdentity.ts`, `web/lib/contracts.ts`
- Backend routes:
  - GET /identity/username/availability (query: username)
  - POST /identity/username (body: username)
- DB models:
  - Username
- Contracts:
  - AchievoUsernameRegistryV1 (ownerOfUsername)
  - AchievoIdentity (userId ownership)
- Dependencies:
  - ACHIEVO_USERNAME_REGISTRY_ADDRESS, NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS
- Edge cases:
  - AchusrId mismatch vs on-chain identity
  - Username not claimed on-chain or owner mismatch

---

### Feature: Username marketplace (signed orders)

- Status: partial (order lifecycle implemented; settlement/payment depends on mode)
- UX screens:
  - /usernames/market
- Frontend files:
  - `web/app/usernames/market/page.tsx`, `web/lib/username.ts`, `packages/username/index.mjs`
- Backend routes:
  - GET /usernames/availability (query: name)
  - POST /usernames/orders/prepare (fields: type, name, priceWei, takerAddress, expiresAt, nonce, salt)
  - POST /usernames/orders (fields: typedData, signature)
  - POST /usernames/orders/:id/cancel (fields: signature)
  - POST /usernames/orders/:id/accept
  - GET /usernames/orders
  - GET /usernames/orders/:id
  - GET /usernames/trades
  - POST /usernames/trades/:id/submit-tx (fields: txHash)
  - Legacy ask endpoints: GET /usernames/asks, GET /usernames/asks/open, POST /usernames/asks, POST /usernames/asks/:id/cancel, POST /usernames/asks/:id/accept
- DB models:
  - UsernameOrder, UsernameTrade, UsernameOwnership
- Contracts:
  - AchievoUsernameRegistryV1 (ownership, transfer)
- Dependencies:
  - USERNAME_REGISTRY_ADDRESS, USERNAME_REGISTRY_RPC_URL, USERNAME_SETTLEMENT_MODE
- Edge cases:
  - RPC unavailable yields availability unknown
  - Settlement pending confirmation (ChainActionReceipt)
  - Off-chain payment is not implemented in OPERATOR mode

---

### Feature: Goals and approvals (on-chain)

- Status: partial (UI is chain-driven; backend /goals is stubbed)
- UX screens:
  - /goals/new, /goals/[id], /approve, /admin
- Frontend files:
  - `web/app/goals/new/page.tsx`, `web/app/goals/[id]/page.tsx`, `web/app/approve/page.tsx`, `web/app/admin/page.tsx`
  - `web/lib/ipfs.ts`, `web/lib/contracts.ts`
- Backend routes:
  - GET /goals (returns 501 Not Implemented)
  - GET /achievo/tasks/:address (chain-backed goal list with privacy filtering)
- Contracts:
  - AchievoCore, AchievoCoreV11 (createGoal, createGoalWithPeers, approve, verifyAuto, getGoal)
- Dependencies:
  - NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS
  - IPFS gateways (Pinata/Web3.storage via env)
- Edge cases:
  - Missing IPFS credentials
  - User rejection or chain mismatch on write
  - Peer allow list required when restricted

---

### Feature: Proof submissions and artifacts

- Status: partial (ProofsService stubbed; proof CRUD/viewer access not implemented)
- UX screens:
  - /goals/[id] (proof submit), /verify/proof/[id]
- Frontend files:
  - `web/hooks/useProofs.ts`, `web/app/goals/[id]/page.tsx`, `web/app/verify/proof/[id]/page.tsx`
- Backend routes:
  - POST /proofs/upload (file, title, description, achievementId, badgeTokenId, autoAnchor, anchor)
  - POST /proofs/url (sourceUrl + fields above)
  - GET /proofs/:id
  - GET /proofs/:id/file (token supported)
  - POST /proofs/:id/anchor
  - GET /users/:userId/proofs (query: achievementId, badgeTokenId, kind, limit, cursor)
- DB models:
  - ProofArtifact
- Contracts:
  - AchievoAnchorRegistry (optional anchoring)
- Dependencies:
  - PROOF_STORAGE_DRIVER, PROOF_LOCAL_DIR, PROOF_MAX_SIZE_MB, AUTO_ANCHOR_PROOFS
- Implementation note:
  - `backend/src/proofs/proofs.service.ts` is a stub to satisfy module contracts; proof operations are not implemented yet.
- Edge cases:
  - File size limits and unsupported storage driver
  - Private proof access requires token or ownership (not implemented; ProofsService currently throws NotImplementedException)
  - Viewer-scoped proof access is not implemented yet (see `backend/src/proofs/proofs.service.ts`)

---

### Feature: Profile exports and verification

- Status: complete (export generation and verification)
- UX screens:
  - /exports/[publicId], /verify/export/[publicId]
- Frontend files:
  - `web/app/exports/[publicId]/page.tsx`, `web/hooks/useProfileExports.ts`, `web/app/verify/export/[publicId]/page.tsx`
- Backend routes:
  - POST /exports/profile (body: format, anchor)
  - POST /exports/verify (body: snapshot, signature, signerAddress)
  - GET /exports/:publicId
  - GET /exports/:publicId/download
  - GET /users/:userId/exports
- DB models:
  - ProfileExport
- Contracts:
  - AchievoAnchorRegistry (optional anchoring)
- Dependencies:
  - PROFILE_EXPORT_SIGNER_PRIVATE_KEY, PROFILE_EXPORT_SIGNER_ADDRESS
  - PROFILE_EXPORT_STORAGE_DRIVER, PROFILE_EXPORT_LOCAL_DIR, PROFILE_EXPORT_PUBLIC_BASE_URL
- Edge cases:
  - Export visibility controls and unlisted links
  - Anchor verification returns unknown if RPC unavailable

---

### Feature: Validation requests and attestations

- Status: partial (validator UX exists; attestation flow is backend-first)
- UX screens:
  - /validators/inbox, /verify/validation/[id]
- Frontend files:
  - `web/hooks/useValidations.ts`, `web/app/validators/inbox/page.tsx`, `web/app/verify/validation/[id]/page.tsx`
- Backend routes:
  - POST /validators/register (walletAddress, displayName, type, bio, website)
  - GET /validators/:walletAddress
  - GET /validators/:walletAddress/requests
  - POST /validations/requests
  - GET /validations/requests/:id (token supported)
  - POST /validations/requests/:id/attestation/prepare
  - POST /validations/requests/:id/attest
  - POST /validations/requests/:id/revoke
  - GET /users/:userId/validations (query: status, badgeTokenId, achievementId, limit, cursor)
- DB models:
  - ValidatorProfile, ValidationRequest, ValidationAttestation
- Contracts:
  - AchievoAnchorRegistry (optional anchoring)
- Dependencies:
  - VALIDATION_EIP712_CHAIN_ID, VALIDATION_EIP712_DOMAIN_NAME, VALIDATION_EIP712_DOMAIN_VERSION
- Edge cases:
  - Validator wallet must match signed attestation
  - Public read depends on VALIDATION_PUBLIC_READ

---

### Feature: Skill endorsements

- Status: partial (backend complete, UI surface minimal)
- UX screens:
  - /profile/[address]
- Frontend files:
  - `web/hooks/useEndorsements.ts`, `web/hooks/useSkills.ts`, `web/components/ProfileEditor.tsx`
- Backend routes:
  - GET /skills (search)
  - POST /skills (create)
  - POST /users/me/skills
  - DELETE /users/me/skills/:skillTagId
  - GET /users/:userId/skills
  - POST /endorsements
  - POST /endorsements/:id/revoke
  - GET /users/:userId/endorsements
  - GET /users/:userId/endorsements/summary
- DB models:
  - SkillTag, UserSkill, Endorsement
- Dependencies:
  - ENDORSEMENTS_ENABLED, ENDORSEMENTS_DAILY_LIMIT
- Edge cases:
  - Daily limits and minimum account age

---

### Feature: Organizations and membership

- Status: complete (on-chain gating + off-chain membership)
- UX screens:
  - /orgs, /orgs/[handle], /orgs/[handle]/members, /orgs/[handle]/admin
- Frontend files:
  - `web/app/orgs/page.tsx`, `web/app/orgs/[handle]/page.tsx`, `web/app/orgs/[handle]/members/page.tsx`, `web/app/orgs/[handle]/admin/page.tsx`
- Backend routes:
  - POST /orgs/prepare (body: handle)
  - POST /orgs (body: handle, displayName, description, website, visibility, creationTxHash)
  - GET /orgs/:handle
  - PATCH /orgs/:orgId (body: displayName, description, website, visibility, logoUrl)
  - GET /orgs/:orgId/members
  - POST /orgs/:orgId/invites (body: targetUserId, email, role, expiresInDays)
  - POST /org-invites/:token/accept
  - POST /org-invites/:token/revoke
- DB models:
  - Organization, OrgMember, OrgInvite, ChainActionReceipt
- Contracts:
  - AchievoOrgRegistry (createOrg fee gate)
- Dependencies:
  - ORG_CREATE_REQUIRED, ORG_CREATE_CHAIN_ID, ORG_REGISTRY_ADDRESS
- Edge cases:
  - On-chain tx required before finalize
  - On-chain confirmation pending or dropped reorg

---

### Feature: Organization programs and milestones

- Status: partial (creation and publish implemented; discovery UX minimal)
- UX screens:
  - /orgs/[handle]/programs/[slug], /orgs/[handle]/programs/[slug]/submit
- Frontend files:
  - `web/app/orgs/[handle]/programs/[slug]/page.tsx`, `web/app/orgs/[handle]/programs/[slug]/submit/page.tsx`
- Backend routes:
  - POST /orgs/:orgId/programs
  - PATCH /orgs/:orgId/programs/:programId
  - POST /orgs/:orgId/programs/:programId/milestones
  - POST /orgs/:orgId/programs/:programId/publish
  - GET /orgs/:orgId/programs/:slug (query: token)
- DB models:
  - OrgProgram, ProgramMilestone
- Edge cases:
  - RBAC required (OWNER, ADMIN)
  - Unpublished program access gated by token

---

### Feature: Organization milestone submissions

- Status: partial (submission and review implemented; UI light)
- UX screens:
  - /orgs/[handle]/programs/[slug]/submit
- Frontend files:
  - `web/app/orgs/[handle]/programs/[slug]/submit/page.tsx`
- Backend routes:
  - POST /orgs/:orgId/programs/:programId/milestones/:milestoneId/submissions
  - GET /orgs/:orgId/submissions (query: status, programId, userId)
  - POST /orgs/:orgId/submissions/:submissionId/review
  - POST /orgs/:orgId/validations/issue
- DB models:
  - MilestoneSubmission, OrgAuditLog
- Contracts:
  - AchievoAnchorRegistry (optional anchoring)
- Edge cases:
  - RBAC required (OWNER, ADMIN, REVIEWER)
  - Submission status transitions enforced

---

### Feature: Projects, billing, and time tracking

- Status: partial (core CRUD implemented; UI coverage partial)
- UX screens:
  - /projects, /projects/new, /projects/[slug]
  - /projects/[slug]/invoices/new, /projects/[slug]/invoices/[invoiceId]
  - /projects/share/[slug], /invoices/public/[slug]
- Frontend files:
  - `web/app/projects/page.tsx`, `web/app/projects/new/page.tsx`, `web/app/projects/[slug]/page.tsx`
  - `web/app/projects/[slug]/invoices/new/page.tsx`, `web/app/projects/[slug]/invoices/[invoiceId]/page.tsx`
  - `web/app/projects/share/[slug]/page.tsx`, `web/app/invoices/public/[slug]/page.tsx`
- Backend routes:
  - GET /projects
  - POST /projects (body: name, description, visibility, billingModel)
  - GET /projects/:slug
  - PATCH /projects/:slug (body: updates)
  - GET /projects/:slug/members
  - POST /projects/:slug/members
  - PATCH /projects/:slug/members/:achusrId
  - DELETE /projects/:slug/members/:achusrId
  - POST /projects/:slug/leave
  - GET /projects/:slug/goals
  - POST /projects/:slug/goals
  - DELETE /projects/:slug/goals/:goalId
  - GET /projects/:slug/time-entries
  - POST /projects/:slug/time-entries
  - POST /projects/:slug/time-entries/start
  - POST /projects/:slug/time-entries/:id/stop
  - PATCH /projects/:slug/time-entries/:id
  - DELETE /projects/:slug/time-entries/:id
  - GET /projects/:slug/invoices
  - GET /projects/:slug/invoices/:invoiceId
  - POST /projects/:slug/invoices
  - PATCH /projects/:slug/invoices/:invoiceId
  - POST /projects/:slug/invoices/:invoiceId/mark-sent
  - POST /projects/:slug/invoices/:invoiceId/mark-paid
  - POST /projects/:slug/invoices/generate-from-time
  - GET /projects/:slug/billing/settings
  - PUT /projects/:slug/billing/settings
  - GET /projects/:slug/share-links
  - POST /projects/:slug/share-links
  - PATCH /projects/:slug/share-links/:id
  - DELETE /projects/:slug/share-links/:id
  - GET /projects/share/:slug
  - GET /invoices/public/:slug
  - GET /projects/by-goal/:goalId
- DB models:
  - Project, ProjectMember, ProjectGoal, ProjectEvent, ProjectBillingSettings
  - TimeEntry, Invoice, InvoiceLineItem, ProjectShareLink
- Edge cases:
  - RBAC required for write operations
  - Invoices and time entries are project scoped

---

### Feature: Parties (communities) and feeds

- Status: partial
- UX screens:
  - /parties, /parties/new, /parties/[slug]
- Frontend files:
  - `web/app/parties/page.tsx`, `web/app/parties/new/page.tsx`, `web/app/parties/[slug]/page.tsx`
- Backend routes:
  - GET /parties/discover
  - GET /parties/me
  - POST /parties
  - GET /parties/:slug
  - GET /parties/:slug/members
  - POST /parties/:slug/join
  - POST /parties/:slug/leave
  - POST /parties/:slug/invites
  - POST /parties/invites/:token/accept
  - GET /parties/feed/me
  - GET /parties/:slug/feed
  - GET /parties/:slug/leaderboard/xp
  - GET /parties/:slug/leaderboard/streak
- DB models:
  - Party, PartyMember, PartyInvite, PartyFeedItem
- Edge cases:
  - Private party join requires invite
  - Feed visibility depends on membership

---

### Feature: Quests, streaks, and gamification

- Status: partial (backend counters exist; UI minimal)
- UX screens:
  - /dashboard
- Frontend files:
  - `web/hooks/useQuests.ts`
- Backend routes:
  - GET /quests/me
  - POST /quests/claim/:userQuestId
- DB models:
  - QuestTemplate, UserQuest, UserStreak, StreakMilestone, QuestEventLog
- Edge cases:
  - Claim requires eligibility and status checks

---

### Feature: Consistency and activity scoring

- Status: partial (backend metrics only)
- UX screens:
  - /dashboard, /profile/[address]
- Frontend files:
  - `web/hooks/useConsistency.ts`, `web/hooks/useProfileInfo.ts`
- Backend routes:
  - GET /users/:userId/consistency
  - GET /users/:userId/activity/summary
  - POST /activity/events
  - POST /activity/recompute/:userId
  - POST /users/me/consistency/recompute
- DB models:
  - UserActivity, UserActivityEvent, UserConsistencyScore
- Edge cases:
  - Activity recompute is admin/worker oriented

---

### Feature: Risk engine and abuse signals

- Status: partial (backend scoring only)
- UX screens:
  - /admin (no dedicated risk UI)
- Backend routes:
  - GET /users/:userId/risk
  - POST /users/:userId/risk/recompute
  - GET /admin/risk/users
- DB models:
  - UserRiskProfile, RiskSignalEvent
- Dependencies:
  - RISK_ENGINE_ENABLED and related thresholds

---

### Feature: Leaderboards

- Status: partial
- UX screens:
  - /parties/[slug], /dashboard
- Backend routes:
  - GET /leaderboard/global/xp
  - GET /leaderboard/global/streak
  - GET /parties/[slug]/leaderboard/xp
  - GET /parties/[slug]/leaderboard/streak
- DB models:
  - UserStreak, UserQuest, PartyFeedItem

---

### Feature: Verification portal (public verify)

- Status: complete (read-only)
- UX screens:
  - /verify, /verify/proof/[id], /verify/validation/[id], /verify/export/[publicId], /verify/anchor/[hash], /verify/tx/[txHash]
- Frontend files:
  - `web/app/verify/page.tsx`, `web/app/verify/proof/[id]/page.tsx`, `web/app/verify/validation/[id]/page.tsx`
  - `web/app/verify/export/[publicId]/page.tsx`, `web/app/verify/anchor/[hash]/page.tsx`, `web/app/verify/tx/[txHash]/page.tsx`
- Backend routes:
  - POST /verify (body: proofHash, signature, message, publicKey)
  - POST /verify/proof/:id/check-file
  - GET /verify/proof/:id
  - GET /verify/validation/:id
  - GET /verify/export/:publicId
  - GET /verify/anchor/:hash
  - GET /verify/tx/:txHash
- DB models:
  - ProofArtifact, ValidationRequest, ValidationAttestation, ProfileExport
- Dependencies:
  - VERIFY_PORTAL_ENABLED, VERIFY_CHAIN_RPC_URL, VERIFY_CHAIN_ID
- Edge cases:
  - RPC failures return anchorVerified = unknown

---

### Feature: Privacy controls and unlisted access

- Status: partial
- UX screens:
  - /profile/[address], /share/[publicId], /s/[slug]
- Frontend files:
  - `web/hooks/usePrivacySettings.ts`, `web/components/PrivacySettingsEditor.tsx`
- Backend routes:
  - GET /privacy/me
  - PUT /privacy/me
  - PUT /privacy/override
  - DELETE /privacy/override
  - GET /privacy/unlisted/:publicId
- DB models:
  - UserPrivacySettings, ContentVisibilityOverride
- Edge cases:
  - Unlisted tokens required for non-public content

---

### Feature: File storage service

- Status: complete (local or S3)
- UX screens:
  - Indirect (proof uploads)
- Backend routes:
  - POST /files/upload
  - POST /files/json
- Dependencies:
  - PROOF*STORAGE_DRIVER, AWS*\*, S3_BUCKET

---

### Feature: Anchoring, chain actions, and queue

- Status: partial (anchoring worker depends on envs)
- UX screens:
  - /verify/anchor/[hash]
- Backend routes:
  - Admin: POST /admin/anchors/:entityType/:entityId/retry
  - Admin: GET /admin/chain-actions, GET /admin/chain-actions/:id
  - Admin Gateway: /admin-gateway/chain-actions, /admin-gateway/anchoring/status
- DB models:
  - AnchorJob, ChainActionReceipt
- Contracts:
  - AchievoAnchorRegistry, ProofAnchorRegistry
- Dependencies:
  - ANCHORING_ENABLED, ANCHOR_REGISTRY_ADDRESS, ANCHOR_OPERATOR_PRIVATE_KEY
- Edge cases:
  - Circuit breaker returns unknown, not failure
  - Retry is idempotent

---

### Feature: Indexer and legacy projections

- Status: partial (indexer gated by env)
- UX screens:
  - /verify, /profile/[address]
- Backend routes:
  - Legacy: GET /legacy/v1/badges/:address, GET /legacy/v1/goals/:address, GET /legacy/v1/goals/:goalId
  - Admin: POST /admin/indexer/backfill, POST /admin/indexer/rebuild-projections
  - Admin Gateway: GET /admin-gateway/indexer/status
  - Health: GET /health/indexer
- DB models:
  - ChainCursor, ChainLog, DecodedEvent, ProjectionCursor
  - LegacyBadgeOwnership, LegacyOwnerBadgeToken, LegacyGoal, LegacyGoalEvidence, LegacyGoalApproval
- Dependencies:
  - INDEXER_ENABLED, INDEXER_CHAIN_ID, INDEXER_RPC_URL, INDEXER_FINALITY_DEPTH
- Edge cases:
  - Reorg rollback and projection rebuilds

---

### Feature: Public Achievo data endpoints

- Status: partial (chain-backed data, privacy enforced)
- UX screens:
  - /profile/[address], /dashboard
- Frontend files:
  - `web/hooks/useUserTasks.ts`, `web/hooks/useProfileInfo.ts`
- Backend routes:
  - GET /achievo/tasks/:address
  - GET /achievo/badges/:address
  - GET /achievo/profile/:address
- DB models:
  - User, Username, UserPrivacySettings, ContentVisibilityOverride
- Contracts:
  - AchievoCoreV11, AchievoBadgeV11, AchievoIdentity
- Edge cases:
  - Private profile data filtered via privacy policy

---

### Feature: Health, readiness, metrics, and monitoring

- Status: complete
- UX screens:
  - Admin Console /health
- Backend routes:
  - GET /health
  - GET /health/chain
  - GET /health/indexer
  - GET /health/anchoring
  - GET /ready
  - GET /metrics (guarded by admin auth when enabled)
  - GET /admin/alerts
- DB models:
  - OperationalAlert
- Dependencies:
  - METRICS*ENABLED, MONITORING_ENABLED, HEALTH*\* thresholds
- Edge cases:
  - Metrics and docs disabled by default

---

### Feature: Admin tools (legacy HMAC)

- Status: complete (API only)
- UX screens:
  - None (replaced by Admin Console)
- Backend routes:
  - POST /admin/chain-actions/:id/retry
  - POST /admin/chain-actions/replay
  - POST /admin/indexer/backfill
  - POST /admin/indexer/rebuild-projections
  - POST /admin/orgs/:orgId/reverify-tx
  - POST /admin/anchors/:entityType/:entityId/retry
- Security:
  - ADMIN_API_KEY + ADMIN_HMAC_SECRET + nonce replay protection
- DB models:
  - AdminRequestNonce, AdminAuditLog

---

### Feature: Automation queue (placeholder)

- Status: stubbed
- Backend routes:
  - GET /auto/queue (501 Not Implemented)

---

### Backend inventory by domain (controllers and routes)

Auth:

- POST /auth/nonce
- POST /auth/login
- POST /auth/verify
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me

Admin auth:

- POST /admin-auth/login
- POST /admin-auth/refresh
- POST /admin-auth/logout
- GET /admin-auth/me
- GET /admin-auth/csrf

Admin gateway:

- POST /admin-gateway/dry-run
- POST /admin-gateway/execute
- GET /admin-gateway/overview
- GET /admin-gateway/health
- GET /admin-gateway/alerts
- GET /admin-gateway/chain-actions
- GET /admin-gateway/chain-actions/:id
- GET /admin-gateway/indexer/status
- GET /admin-gateway/anchoring/status
- GET /admin-gateway/orgs/search
- GET /admin-gateway/orgs/:id
- GET /admin-gateway/users/search
- GET /admin-gateway/users/:id
- GET /admin-gateway/usernames/search
- GET /admin-gateway/admin-users
- POST /admin-gateway/admin-users
- PATCH /admin-gateway/admin-users/:id
- GET /admin-gateway/audit
- GET /admin-gateway/env

Admin tools (legacy HMAC):

- GET /admin/chain-actions
- GET /admin/chain-actions/:id
- POST /admin/chain-actions/:id/retry
- POST /admin/chain-actions/replay
- POST /admin/indexer/backfill
- POST /admin/indexer/rebuild-projections
- POST /admin/orgs/:orgId/reverify-tx
- POST /admin/anchors/:entityType/:entityId/retry
- GET /admin/alerts
- GET /admin/risk/users

Achievo chain data:

- GET /achievo/tasks/:address
- GET /achievo/badges/:address
- GET /achievo/profile/:address

Identity and social:

- GET /identity/search
- GET /identity/username/availability
- POST /identity/username
- POST /identity/:achusrId/follow
- POST /identity/:achusrId/unfollow
- GET /identity/:achusrId/followers
- GET /identity/:achusrId/following
- GET /identity/:achusrId/follow-stats
- GET /identity/:achusrId/activity

Profile and share links:

- GET /profile/me
- PUT /profile/me
- GET /profile/professional/me
- PUT /profile/professional/me
- GET /profile/professional/public/:handle
- GET /profile/pins/me
- PUT /profile/pins/me
- POST /profile/share-links
- GET /profile/share-links/me
- PATCH /profile/share-links/:id
- DELETE /profile/share-links/:id
- GET /profile/:slug
- GET /share-links/:slug

Privacy:

- GET /privacy/me
- PUT /privacy/me
- PUT /privacy/override
- DELETE /privacy/override
- GET /privacy/unlisted/:publicId

Proofs and files:

- POST /proofs/upload
- POST /proofs/url
- GET /proofs/:id
- GET /proofs/:id/file
- POST /proofs/:id/anchor
- GET /users/:userId/proofs
- POST /files/upload
- POST /files/json

Profile exports:

- POST /exports/profile
- POST /exports/verify
- GET /exports/:publicId
- GET /exports/:publicId/download
- GET /users/:userId/exports

Validations and validators:

- POST /validators/register
- GET /validators/:walletAddress
- GET /validators/:walletAddress/requests
- POST /validations/requests
- GET /validations/requests/:id
- POST /validations/requests/:id/attestation/prepare
- POST /validations/requests/:id/attest
- POST /validations/requests/:id/revoke
- GET /users/:userId/validations

Skills and endorsements:

- GET /skills
- POST /skills
- POST /users/me/skills
- DELETE /users/me/skills/:skillTagId
- GET /users/:userId/skills
- POST /endorsements
- POST /endorsements/:id/revoke
- GET /users/:userId/endorsements
- GET /users/:userId/endorsements/summary

Organizations:

- POST /orgs/prepare
- POST /orgs
- GET /orgs/:handle
- PATCH /orgs/:orgId
- GET /orgs/:orgId/members
- POST /orgs/:orgId/invites
- POST /org-invites/:token/accept
- POST /org-invites/:token/revoke

Organization programs and submissions:

- POST /orgs/:orgId/programs
- PATCH /orgs/:orgId/programs/:programId
- POST /orgs/:orgId/programs/:programId/milestones
- POST /orgs/:orgId/programs/:programId/publish
- GET /orgs/:orgId/programs/:slug
- POST /orgs/:orgId/programs/:programId/milestones/:milestoneId/submissions
- GET /orgs/:orgId/submissions
- POST /orgs/:orgId/submissions/:submissionId/review
- POST /orgs/:orgId/validations/issue

Projects and billing:

- GET /projects
- POST /projects
- GET /projects/:slug
- PATCH /projects/:slug
- GET /projects/:slug/members
- POST /projects/:slug/members
- PATCH /projects/:slug/members/:achusrId
- DELETE /projects/:slug/members/:achusrId
- POST /projects/:slug/leave
- GET /projects/:slug/goals
- POST /projects/:slug/goals
- DELETE /projects/:slug/goals/:goalId
- GET /projects/:slug/time-entries
- POST /projects/:slug/time-entries
- POST /projects/:slug/time-entries/start
- POST /projects/:slug/time-entries/:id/stop
- PATCH /projects/:slug/time-entries/:id
- DELETE /projects/:slug/time-entries/:id
- GET /projects/:slug/invoices
- GET /projects/:slug/invoices/:invoiceId
- POST /projects/:slug/invoices
- PATCH /projects/:slug/invoices/:invoiceId
- POST /projects/:slug/invoices/:invoiceId/mark-sent
- POST /projects/:slug/invoices/:invoiceId/mark-paid
- POST /projects/:slug/invoices/generate-from-time
- GET /projects/:slug/billing/settings
- PUT /projects/:slug/billing/settings
- GET /projects/:slug/share-links
- POST /projects/:slug/share-links
- PATCH /projects/:slug/share-links/:id
- DELETE /projects/:slug/share-links/:id
- GET /projects/share/:slug
- GET /projects/by-goal/:goalId
- GET /invoices/public/:slug

Parties:

- GET /parties/discover
- GET /parties/me
- POST /parties
- GET /parties/:slug
- GET /parties/:slug/members
- POST /parties/:slug/join
- POST /parties/:slug/leave
- POST /parties/:slug/invites
- POST /parties/invites/:token/accept
- GET /parties/feed/me
- GET /parties/:slug/feed
- GET /parties/:slug/leaderboard/xp
- GET /parties/:slug/leaderboard/streak

Usernames:

- GET /usernames/availability
- GET /usernames/orders
- GET /usernames/orders/:id
- GET /usernames/trades
- POST /usernames/orders/prepare
- POST /usernames/orders
- POST /usernames/orders/:id/cancel
- POST /usernames/orders/:id/accept
- POST /usernames/trades/:id/submit-tx
- GET /usernames/asks
- GET /usernames/asks/open
- POST /usernames/asks
- POST /usernames/asks/:id/cancel
- POST /usernames/asks/:id/accept

Quests:

- GET /quests/me
- POST /quests/claim/:userQuestId

Consistency and activity:

- GET /users/:userId/consistency
- GET /users/:userId/activity/summary
- POST /activity/events
- POST /activity/recompute/:userId
- POST /users/me/consistency/recompute

Risk:

- GET /users/:userId/risk
- POST /users/:userId/risk/recompute
- GET /admin/risk/users

Leaderboards:

- GET /leaderboard/global/xp
- GET /leaderboard/global/streak

Legacy:

- GET /legacy/v1/badges/:address
- GET /legacy/v1/goals/:address
- GET /legacy/v1/goals/:goalId

Verification:

- POST /verify
- POST /verify/proof/:id/check-file
- GET /verify/proof/:id
- GET /verify/validation/:id
- GET /verify/export/:publicId
- GET /verify/anchor/:hash
- GET /verify/tx/:txHash

Health and metrics:

- GET /health
- GET /health/chain
- GET /health/indexer
- GET /health/anchoring
- GET /ready
- GET /metrics

Automation:

- GET /auto/queue

---

### Database inventory (Prisma)

Models by domain:

User and auth:

- User, Wallet, WalletNonce, AuthSession, AuthNonce
- UserPrivacySettings, ContentVisibilityOverride

Identity and social:

- Username, UserFollow, UserActivity, UserActivityEvent
- ProfessionalProfile, ProfileShareLink, ProfilePin

Marketplace:

- UsernameOrder, UsernameTrade, UsernameOwnership

Organizations:

- Organization, OrgMember, OrgInvite, OrgProgram, ProgramMilestone, MilestoneSubmission, OrgAuditLog

Projects and billing:

- Project, ProjectMember, ProjectGoal, ProjectShareLink, ProjectEvent, ProjectBillingSettings
- TimeEntry, Invoice, InvoiceLineItem

Parties:

- Party, PartyMember, PartyInvite, PartyFeedItem

Proofs and validations:

- ProofArtifact, ProfileExport
- ValidatorProfile, ValidationRequest, ValidationAttestation
- SkillTag, UserSkill, Endorsement

Quests and progression:

- QuestTemplate, UserQuest, UserStreak, StreakMilestone, QuestEventLog

Risk and consistency:

- UserConsistencyScore, UserRiskProfile, RiskSignalEvent

Anchoring and chain actions:

- AnchorJob, ChainActionReceipt

Indexer and projections:

- ChainCursor, ChainLog, DecodedEvent, ProjectionCursor
- LegacyBadgeOwnership, LegacyOwnerBadgeToken, LegacyGoal, LegacyGoalEvidence, LegacyGoalApproval

Admin and monitoring:

- AdminUser, AdminSession, AdminCsrfToken, AdminActionIntent
- AdminRequestNonce, AdminAuditLog, OperationalAlert, ProjectionRebuildRun

Enums (selected):

- UsernameStatus, OrgRole, OrgVisibility, OrgOnchainStatus
- ChainActionType, ChainActionStatus
- UsernameOrderType, UsernameOrderStatus, SettlementStatus
- ProgramStatus, SubmissionStatus, AnchorJobStatus
- OperationalAlertSeverity, OperationalAlertType
- AdminRole

Constraints relevant to UX:

- Organization.handle is unique
- Username.usernameNormalized is unique
- OrgMember unique (orgId, userId)
- UsernameOrder.orderHash is unique
- UsernameOwnership unique (chainId, handleHash)
- AdminUser.email is unique

---

### Smart contracts inventory

- AchievoIdentity (`contracts/AchievoIdentity.sol`)

  - Responsibility: on-chain identity record (userId, username, avatar, bio)
  - Key functions: register, getUserId, getUserProfile, setProfile, setRecoveryKey, addSubWallet, removeSubWallet, transferUsername
  - Roles: owner/admin as defined in contract

- AchievoCore (`contracts/AchievoCore.sol`) and AchievoCoreV11 (`contracts/AchievoCoreV11.sol`)

  - Responsibility: on-chain goals, approvals, verification, badge minting
  - Key functions: createGoal, createGoalWithPeers, approve, verifyAuto, getGoal
  - Roles: owner for admin functions

- BadgeSBT (`contracts/BadgeSBT.sol`), AchievoBadgeV11 (`contracts/AchievoBadgeV11.sol`), AchievoBadgeV12 (`contracts/achievo/AchievoBadgeV12.sol`)

  - Responsibility: badge minting and ownership
  - Key functions: mint, tokenURI, tokensOfOwner
  - Roles: owner/minter (AccessControl in V12)

- AchievoUsernameRegistryV1 (`contracts/AchievoUsernameRegistryV1.sol`)

  - Responsibility: on-chain username ownership and transfer
  - Key functions: ownerOfUsername, transferUsername

- AchievoOrgRegistry (`contracts/achievo/AchievoOrgRegistry.sol`)

  - Responsibility: on-chain organization creation fee gate
  - Key functions: createOrg, setCreateOrgFee, setTreasury, pause/unpause

- AchievoAnchorRegistry (`contracts/AchievoAnchorRegistry.sol`) and ProofAnchorRegistry (`contracts/ProofAnchorRegistry.sol`)
  - Responsibility: anchor registry for hashes
  - Key functions: anchor, anchorBatch, isAnchored, records

---

### Integrations and config

Wallet and chain:

- wagmi with injected connector (`web/lib/wagmi.ts`)
- Base Sepolia RPC via NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL and backend RPC URLs

Web API proxy:

- API_PROXY_TARGET (web)

Admin Console:

- NEXT_PUBLIC_ADMIN_API_BASE_URL (apps/admin)
- Admin sessions via /admin-auth and /admin-gateway endpoints

Storage and exports:

- Local storage or S3 for proof files
- Profile export signer and storage via PROFILE*EXPORT*\* env vars

On-chain registry addresses:

- NEXT_PUBLIC_IDENTITY_ADDRESS
- NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS
- NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS
- NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS
- NEXT_PUBLIC_ACHIEVO_ORG_REGISTRY_ADDRESS
- ORG_REGISTRY_ADDRESS, ANCHOR_REGISTRY_ADDRESS

Operational services:

- Indexer (INDEXER\_\* envs)
- Chain actions worker (CHAIN*ACTIONS*\* envs)
- Monitoring (MONITORING\_\* envs)
- Health thresholds (HEALTH\_\* envs)

Admin security:

- ADMIN_API_KEY, ADMIN_HMAC_SECRET, ADMIN_TS_SKEW_SECONDS (legacy admin endpoints)
- ADMIN*ACCESS_TTL_MIN, ADMIN_REFRESH_TTL_DAYS, ADMIN_LOCKOUT*\*, ADMIN_CSRF_TTL_MIN

Third-party services:

- Optional Pinata/Web3 storage tokens (PINATA_JWT, WEB3_STORAGE_TOKEN)
- Optional S3 credentials (AWS\_\*)

---

## C) UX Flow List (Actionable)

1. Sign in with wallet

   - UI: ConnectWallet -> POST /auth/nonce -> sign -> POST /auth/login -> cookies -> GET /auth/me

2. Claim Achievo username

   - UI: /identity
   - Steps: GET /identity/username/availability -> on-chain claim via AchievoUsernameRegistryV1 -> POST /identity/username to bind off-chain

3. Create organization (on-chain gated)

   - UI: /orgs
   - Steps: POST /orgs/prepare -> switch chain -> wallet tx createOrg -> wait receipt -> POST /orgs (finalize) -> org page

4. Create organization program and publish

   - UI: /orgs/[handle]/admin
   - Steps: POST /orgs/:orgId/programs -> POST /orgs/:orgId/programs/:programId/milestones -> POST /orgs/:orgId/programs/:programId/publish

5. Submit organization milestone

   - UI: /orgs/[handle]/programs/[slug]/submit
   - Steps: POST /orgs/:orgId/programs/:programId/milestones/:milestoneId/submissions -> (optional) anchor

6. Create on-chain goal

   - UI: /goals/new
   - Steps: upload metadata to IPFS -> createGoal or createGoalWithPeers on AchievoCore -> wait receipt -> view on /goals/[id]

7. Approve a goal

   - UI: /approve
   - Steps: read goal -> check allow list -> approve on-chain

8. Submit proof

   - UI: /goals/[id]
   - Steps: POST /proofs/upload or /proofs/url -> optional POST /proofs/:id/anchor -> verify via /verify/proof/[id]

9. Request validation and attest

   - UI: /validators/inbox
   - Steps: POST /validations/requests -> POST /validations/requests/:id/attestation/prepare -> sign -> POST /validations/requests/:id/attest -> verify via /verify/validation/[id]

10. Generate profile export

    - UI: profile page
    - Steps: POST /exports/profile -> GET /exports/[publicId] -> GET /exports/[publicId]/download -> /verify/export/[publicId]

11. Create username order and accept

    - UI: /usernames/market
    - Steps: POST /usernames/orders/prepare -> sign typed data -> POST /usernames/orders -> POST /usernames/orders/:id/accept -> (if seller tx required) POST /usernames/trades/:id/submit-tx -> wait confirmations

12. Create project and invoice

    - UI: /projects/new, /projects/[slug]/invoices/new
    - Steps: POST /projects -> POST /projects/[slug]/invoices -> PATCH /projects/[slug]/invoices/[invoiceId]

13. Join party

    - UI: /parties/[slug]
    - Steps: POST /parties/[slug]/join -> view /parties/[slug]/feed

14. Verify content

    - UI: /verify/\*
    - Steps: GET /verify/proof/[id], /verify/validation/[id], /verify/export/[publicId], /verify/anchor/[hash]

15. Admin Console login + dry-run execute
    - UI: apps/admin /login -> /indexer
    - Steps: POST /admin-auth/login -> GET /admin-gateway/indexer/status -> POST /admin-gateway/dry-run -> POST /admin-gateway/execute

---

## D) Navigation and IA Proposal (grounded in existing routes)

Web app top-level navigation:

- Home (/)
- Dashboard (/dashboard)
- Identity (/identity)
- Organizations (/orgs)
- Projects (/projects)
- Parties (/parties)
- Usernames (/usernames/market)
- Verify (/verify)
- Admin (/admin) [conditional on contract owner]

Web subpages and sections:

- Profile: /profile/[address], /profile/professional/[handle]
- Goals: /goals/new, /goals/[id], /approve
- Organizations: /orgs/[handle], /orgs/[handle]/members, /orgs/[handle]/admin
- Programs: /orgs/[handle]/programs/[slug], /orgs/[handle]/programs/[slug]/submit
- Projects: /projects/[slug], /projects/[slug]/invoices/[invoiceId], /projects/share/[slug], /invoices/public/[slug]
- Parties: /parties/[slug]
- Verification: /verify/proof/[id], /verify/validation/[id], /verify/export/[publicId], /verify/anchor/[hash], /verify/tx/[txHash]

Admin Console navigation (apps/admin):

- Dashboard (/)
- Health (/health)
- Alerts (/alerts)
- Chain Actions (/chain-actions)
- Anchoring (/anchoring)
- Indexer (/indexer)
- Orgs (/orgs)
- Users (/users)
- Usernames (/usernames)
- Settings (/settings)

---

## E) Gaps and UI Debt

Missing UX states:

- Pending on-chain confirmations for username trades and organization creation
- Anchor verification unknown state when RPC fails (some pages still show generic errors)
- Empty states for new users (no organizations, no goals, no proofs)

Incomplete or partial features:

- Goals backend endpoints are stubbed; UI is chain-only
- Organization program discovery and management UI is minimal
- Validation request UX is limited (attestation flow not fully guided)
- Admin Console has no bulk tools beyond dry-run/execute per action

Inconsistencies:

- Some routes are chain-only (goals) while others are API-driven
- Public share links split between /share, /s, and /share-links

High-impact UX fixes (ordered by ROI):

1. Consistent pending and retry states for on-chain actions
2. Strong empty states and first-run guidance
3. Validation request and attestation wizard
4. Organization program authoring UI
5. Marketplace settlement state tracking and notifications
