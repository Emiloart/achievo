/**
 * Admin action policy definitions and RBAC enforcement helpers.
 */
import { AdminRole } from "@prisma/client";

export type AdminActionName =
  | "chain_action_retry"
  | "chain_action_replay"
  | "indexer_backfill"
  | "indexer_rebuild"
  | "org_reverify"
  | "anchor_retry"
  | "admin_user_create"
  | "admin_user_update"
  | "username_mark_suspicious";

const ROLE_ORDER: Record<AdminRole, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

const ACTION_ROLE: Record<AdminActionName, AdminRole> = {
  chain_action_retry: AdminRole.OPERATOR,
  chain_action_replay: AdminRole.OPERATOR,
  indexer_backfill: AdminRole.OPERATOR,
  indexer_rebuild: AdminRole.ADMIN,
  org_reverify: AdminRole.OPERATOR,
  anchor_retry: AdminRole.OPERATOR,
  admin_user_create: AdminRole.SUPERADMIN,
  admin_user_update: AdminRole.SUPERADMIN,
  username_mark_suspicious: AdminRole.ADMIN,
};

export function resolveAction(action: string): AdminActionName | null {
  const key = action as AdminActionName;
  return ACTION_ROLE[key] ? key : null;
}

export function requiredRole(action: AdminActionName): AdminRole {
  return ACTION_ROLE[action];
}

export function roleAllows(current: AdminRole, required: AdminRole) {
  return (ROLE_ORDER[current] ?? -1) >= (ROLE_ORDER[required] ?? 99);
}
