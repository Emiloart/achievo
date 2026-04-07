export type AdminRole = "VIEWER" | "OPERATOR" | "ADMIN" | "SUPERADMIN";

const ROLE_ORDER: Record<AdminRole, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

export function normalizeRole(role?: string | null): AdminRole {
  if (role === "VIEWER" || role === "OPERATOR" || role === "ADMIN" || role === "SUPERADMIN") {
    return role;
  }
  return "VIEWER";
}

export function roleAllows(current: AdminRole | null | undefined, required: AdminRole) {
  if (!current) return false;
  return (ROLE_ORDER[current] ?? -1) >= (ROLE_ORDER[required] ?? Number.MAX_SAFE_INTEGER);
}
