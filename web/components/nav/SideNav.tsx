"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { GOALS_NAV, PRIMARY_NAV, isActive } from "./navItems";

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-24 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-textMuted">Navigation</div>
          <div className="space-y-1">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href as Route}
                className={clsx(
                  "flex items-center rounded-full px-3 py-2 text-sm transition",
                  isActive(pathname, item.href) ? "bg-surface2 text-text" : "text-textMuted hover:text-text",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-textMuted">Goals</div>
          <div className="space-y-1">
            {GOALS_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href as Route}
                className={clsx(
                  "flex items-center rounded-full px-3 py-2 text-sm transition",
                  isActive(pathname, item.href) ? "bg-surface2 text-text" : "text-textMuted hover:text-text",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
