# P1 Workbench Smoke Tests

Deterministic, route-specific checks for the P1 workbench UX. All references include exact file paths.

## Preconditions

- Web app running.
- Backend running and reachable via `/api/*`.
- Wallet available for signing where required.

## 1) Org Admin Workbench (`/orgs/:handle/admin`)

Route file: `web/app/orgs/[handle]/admin/page.tsx`
Expected API calls:

- `GET /api/orgs/:handle`
- `POST /api/orgs/:orgId/invites`
- `POST /api/orgs/:orgId/programs`
- `PATCH /api/orgs/:orgId/programs/:programId`
- `POST /api/orgs/:orgId/programs/:programId/publish`
- `POST /api/orgs/:orgId/programs/:programId/milestones`
- `GET /api/orgs/:orgId/submissions?status=&programId=&userId=`
- `POST /api/orgs/:orgId/submissions/:submissionId/review`

1. Open the admin workspace.
   - Expect tabs: Overview, Programs, Submissions.
   - DegradedHint appears when health is degraded.
   - If auth/session is missing, expect AuthRequired gate instead of tabs.
2. Create a program.
   - Click **Create program**.
   - Fill slug/title/summary and submit.
   - Expect success toast and program listed.
3. Edit a program.
   - Click **Edit**, update title, save.
   - Expect updated title in list.
4. Publish a program.
   - Click **Publish**, confirm phrase required.
   - Expect program status LIVE.
5. Add milestone.
   - Open **Add milestone** modal and submit.
   - Expect success toast.
6. Submissions review.
   - Use filters and refresh.
   - Approve or reject a submission.

## 2) Validator Inbox Workbench (`/validators/inbox`)

Route file: `web/app/validators/inbox/page.tsx`
Expected API calls:

- `GET /api/validators/:walletAddress`
- `POST /api/validators/register`
- `GET /api/validators/:walletAddress/requests`
- `POST /api/validations/requests/:id/attestation/prepare`
- `POST /api/validations/requests/:id/attest`
- `POST /api/validations/requests/:id/revoke`

1. If validator profile missing, register.
   - Fill display name + type, submit.
   - Expect profile summary card.
   - If wallet is disconnected, expect AuthRequired gate and no inbox data.
2. Pending tab.
   - Open a request via **Review**.
   - Attestation wizard opens in drawer.
3. Attestation wizard.
   - Step: prepare -> sign -> submit.
   - Expect success toast and link to `/verify/validation/:id`.
4. Error handling.
   - Attempt with wrong wallet -> expect explicit mismatch error.
   - Reject signature -> expect ErrorState and retry.
5. Revoke flow.
   - Use **Revoke attestation**, confirm phrase required.

## 3) Projects Workbench (`/projects/:slug`)

Route file: `web/app/projects/[slug]/page.tsx`
Expected API calls:

- `GET /api/projects/:slug`
- `PATCH /api/projects/:slug`
- `GET /api/projects/:slug/goals`
- `POST /api/projects/:slug/goals`
- `DELETE /api/projects/:slug/goals/:goalId`
- `GET /api/projects/:slug/members`
- `POST /api/projects/:slug/members`
- `PATCH /api/projects/:slug/members/:achusrId`
- `DELETE /api/projects/:slug/members/:achusrId`
- `GET /api/projects/:slug/activity`
- `GET /api/projects/:slug/time-entries?from=&to=&mine=&billable=`
- `POST /api/projects/:slug/time-entries/start`
- `POST /api/projects/:slug/time-entries/:id/stop`
- `POST /api/projects/:slug/time-entries`
- `PATCH /api/projects/:slug/time-entries/:id`
- `DELETE /api/projects/:slug/time-entries/:id`
- `GET /api/projects/:slug/billing/settings`
- `PUT /api/projects/:slug/billing/settings`
- `GET /api/projects/:slug/invoices`
- `PATCH /api/projects/:slug/invoices/:invoiceId`
- `POST /api/projects/:slug/invoices/generate-from-time`
- `GET /api/projects/:slug/share-links`
- `POST /api/projects/:slug/share-links`
- `PATCH /api/projects/:slug/share-links/:id`
- `DELETE /api/projects/:slug/share-links/:id`

### Overview tab

1. Verify summary cards (goals, completion, members, billing snapshot).
2. Attach goals and remove goals.
3. Team management: add member, change role, remove member.
4. Project settings update (owner only).
5. Confirm tab shell shows Overview, Time tracking, Invoices, Share links.

### Time tracking tab

1. Start timer.
2. Stop a running entry.
3. Add manual entry.
4. Edit and delete time entries.
5. Update billing settings (owner only).

### Invoices tab

1. Create invoice CTA navigates to `/projects/:slug/invoices/new`.
2. Invoice list renders.
3. Mark sent / mark paid actions update status.
4. Generate invoice from time.

### Share links tab

1. Sign in and verify owner gating.
2. Create share link.
3. Edit share link.
4. Revoke share link.

## P3 UX polish checks (selected routes)

1. Page header + breadcrumbs consistency.
   - `web/app/orgs/[handle]/page.tsx`, `web/app/projects/[slug]/page.tsx`, `web/app/validators/inbox/page.tsx`
   - Breadcrumbs are present and match the route context.
2. Table filter row renders with consistent spacing.
   - `web/components/domain/orgs/SubmissionsTable.tsx`
   - `web/app/validators/inbox/page.tsx`
   - `web/app/projects/[slug]/page.tsx`
3. Degraded hints appear consistently on data-heavy pages.
   - `web/app/profile/[address]/page.tsx`
   - `web/app/orgs/[handle]/page.tsx`
   - `web/app/projects/[slug]/page.tsx`
4. Modal and drawer keyboard handling.
   - `web/components/ui/Modal.tsx` used by:
     - `web/components/domain/verify/VerificationInspector.tsx`
     - `web/app/validators/inbox/page.tsx`
   - Press Escape to close; focus remains inside while open.
5. Copy standards for core CTAs.
   - `web/lib/uiCopy.ts` used in:
     - `web/app/orgs/[handle]/admin/page.tsx`
     - `web/app/projects/[slug]/page.tsx`
     - `web/app/validators/inbox/page.tsx`
