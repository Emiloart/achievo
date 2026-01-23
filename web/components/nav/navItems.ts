export type NavItem = { label: string; href: string };

export const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Identity", href: "/identity" },
  { label: "Orgs", href: "/orgs" },
  { label: "Projects", href: "/projects" },
  { label: "Parties", href: "/parties" },
  { label: "Usernames", href: "/usernames/market" },
  { label: "Verify", href: "/verify" },
];

export const GOALS_NAV: NavItem[] = [
  { label: "New goal", href: "/goals/new" },
  { label: "Approvals", href: "/approve" },
];

export const MOBILE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Identity", href: "/identity" },
  { label: "Orgs", href: "/orgs" },
  { label: "Verify", href: "/verify" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
