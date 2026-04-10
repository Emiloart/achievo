export type NavItem = { label: string; href: string };

// Deferred modules remain routable directly but should not dominate the v1 navigation.
export const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Identity", href: "/identity" },
  { label: "Organizations", href: "/orgs" },
  { label: "Verify", href: "/verify" },
];

export const GOALS_NAV: NavItem[] = [];

export const MOBILE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Identity", href: "/identity" },
  { label: "Organizations", href: "/orgs" },
  { label: "Verify", href: "/verify" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
