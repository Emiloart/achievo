"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/health", label: "Health" },
  { href: "/alerts", label: "Alerts" },
  { href: "/chain-actions", label: "Chain Actions" },
  { href: "/anchoring", label: "Anchoring" },
  { href: "/indexer", label: "Indexer" },
  { href: "/orgs", label: "Orgs" },
  { href: "/users", label: "Users" },
  { href: "/usernames", label: "Usernames" },
  { href: "/settings", label: "Settings" },
] satisfies ReadonlyArray<{ href: Route; label: string }>;

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="side-nav">
      <div className="nav-title">Achievo Admin</div>
      <div className="nav-section">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={clsx("nav-link", active && "active")}>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
