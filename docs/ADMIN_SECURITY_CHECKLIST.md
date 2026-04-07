# Admin Console Security Checklist

This checklist documents the current security boundary for `apps/admin` after Phase 1 admin boundary cleanup.

## Current boundary

- Browser traffic terminates at `apps/admin/app/api/admin/*`.
- The browser does not need direct backend URLs.
- The admin server proxies approved backend admin routes only.
- Backend admin auth tokens stay inside the server-side session cookie payload and are never exposed to client JavaScript.
- Mutating admin requests require CSRF on the admin origin before proxying to backend.

## Environment variables

### Admin app

- `ADMIN_CONSOLE_SESSION_SECRET`: required HMAC secret for the admin console session cookie.
- `ADMIN_CONSOLE_BACKEND_URL`: required backend base URL for server-side admin routes. Default local expectation is `http://localhost:4000`.
- `ADMIN_CONSOLE_CHAIN_ID`: default chain identifier used by admin actions when the payload omits `chainId`.
- `NODE_ENV`: when set to `production`, admin cookies are marked `Secure`.

### Backend prerequisites

- Backend admin-auth routes must be enabled and reachable at `/admin-auth/*`.
- Backend admin-gateway routes must be enabled and reachable at `/admin-gateway/*`.
- Backend bootstrap/admin seed credentials and lockout policy remain backend concerns.

## Security properties now enforced

- Cookie isolation: `ach_admin_console_session` is `HttpOnly`, `SameSite=Strict`, path `/`, and `Secure` in production.
- Browser-visible CSRF token: `ach_admin_csrf`, scoped to the admin origin only.
- CSRF header: `x-ach-admin-csrf`.
- Server-side backend communication: implemented in `apps/admin/lib/server/backendAdminAuth.ts`.
- Proxy allowlist: enforced in `apps/admin/app/api/admin/[...path]/route.ts`.
- Role gates on proxied routes: enforced in `apps/admin/app/api/admin/[...path]/route.ts`.
- Login throttling: enforced in `apps/admin/lib/server/loginRateLimit.ts`.
- Logout safety: local admin session is cleared even if backend logout/revocation fails.
- CSP: admin app `connect-src` is same-origin plus websocket dev channels only.

## Files that define the boundary

- `apps/admin/lib/adminApi.ts`
- `apps/admin/lib/roles.ts`
- `apps/admin/lib/server/adminSession.ts`
- `apps/admin/lib/server/adminCsrf.ts`
- `apps/admin/lib/server/backendAdminAuth.ts`
- `apps/admin/lib/server/adminGateway.ts`
- `apps/admin/lib/server/loginRateLimit.ts`
- `apps/admin/app/api/admin/login/route.ts`
- `apps/admin/app/api/admin/me/route.ts`
- `apps/admin/app/api/admin/refresh/route.ts`
- `apps/admin/app/api/admin/logout/route.ts`
- `apps/admin/app/api/admin/[...path]/route.ts`
- `apps/admin/next.config.mjs`
- `apps/admin/.env.example`

## Remaining hardening items

1. Add MFA or SSO for production admin access.
2. Replace in-memory login throttling with shared storage if multiple admin instances are deployed.
3. Add explicit production origin allowlists and HSTS at the reverse proxy.
4. Add persistent audit coverage for admin sign-in, refresh, and sign-out events if backend does not already record them.
5. Add automated tests that prove the browser cannot bypass `/api/admin/*`.
