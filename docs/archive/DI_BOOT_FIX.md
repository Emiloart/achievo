# AdminGateway DI Boot Fix

## Scope

Fixes AdminGatewayService dependency injection by aligning module exports/imports.

## AdminGatewayService dependencies (pre-fix)

| Provider            | Owning module                                       | Exported?            | Imported by AdminGatewayModule? |
| ------------------- | --------------------------------------------------- | -------------------- | ------------------------------- |
| PrismaService       | `backend/src/prisma/prisma.module.ts`               | Yes (Global)         | Yes                             |
| AdminToolsService   | `backend/src/admin-tools/admin-tools.module.ts`     | **No**               | Yes                             |
| ChainActionsService | `backend/src/chain-actions/chain-actions.module.ts` | Yes                  | Yes                             |
| AnchoringService    | `backend/src/anchoring/anchoring.module.ts`         | Yes (Global)         | Yes                             |
| HealthService       | `backend/src/health/health.module.ts`               | **No**               | Yes                             |
| AdminAuditService   | `backend/src/admin-audit/admin-audit.module.ts`     | Yes                  | Yes                             |
| AdminIntentService  | `backend/src/admin-gateway/admin-gateway.module.ts` | N/A (local provider) | N/A                             |
| AdminAuthService    | `backend/src/admin-auth/admin-auth.module.ts`       | Yes                  | Yes                             |

## Fixes applied (post-fix)

- `backend/src/admin-tools/admin-tools.module.ts` exports `AdminToolsService`.
- `backend/src/health/health.module.ts` exports `HealthService`.

| Provider          | Owning module                                   | Exported? | Imported by AdminGatewayModule? |
| ----------------- | ----------------------------------------------- | --------- | ------------------------------- |
| AdminToolsService | `backend/src/admin-tools/admin-tools.module.ts` | **Yes**   | Yes                             |
| HealthService     | `backend/src/health/health.module.ts`           | **Yes**   | Yes                             |
