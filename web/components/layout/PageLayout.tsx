"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { IdentityBadge } from "../IdentityBadge";
import type { ReactNode } from "react";

const ConnectWallet = dynamic(() => import("../ConnectWallet").then((m) => m.ConnectWallet), { ssr: false });

const navLinks: { href: Route; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/orgs", label: "Orgs" },
  { href: "/verify", label: "Verify" },
  { href: "/identity", label: "Identity" },
];

export function PageLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen text-text">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold tracking-tight font-display">
              Achievo
            </Link>
            <nav className="hidden items-center gap-3 text-xs text-textMuted md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "rounded-full px-3 py-1 transition",
                    pathname === link.href ? "bg-surface2 text-text" : "hover:text-text",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <IdentityBadge />
            <ConnectWallet />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-8">
        <aside className="hidden w-52 flex-shrink-0 flex-col gap-3 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-2xl px-4 py-2 text-sm transition",
                pathname === link.href ? "bg-surface2 text-text" : "text-textMuted hover:text-text",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-6 rounded-2xl border border-border bg-surface px-4 py-4 text-xs text-textMuted">
            Trust-first credentials on Base Sepolia.
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between text-[0.65rem]">
          {navLinks.slice(0, 4).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-full px-3 py-1",
                pathname === link.href ? "bg-surface2 text-text" : "text-textMuted",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
