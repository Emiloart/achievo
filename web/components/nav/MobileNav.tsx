"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { MOBILE_NAV, isActive } from "./navItems";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-surface/90 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href as Route}
            className={clsx(
              "rounded-full px-3 py-2 text-xs font-medium transition",
              isActive(pathname, item.href) ? "bg-surface2 text-text" : "text-textMuted",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
