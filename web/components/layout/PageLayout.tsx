"use client";

import { useEffect, type ReactNode } from "react";
import { ErrorBoundary } from "../ui";
import { GlobalNav } from "../nav/GlobalNav";
import { MobileNav } from "../nav/MobileNav";
import { SideNav } from "../nav/SideNav";
import { DegradedBanner } from "../states/DegradedBanner";
import { PolicyBanner } from "../policy/PolicyBanner";

export function PageLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (globalThis as { __ACHIEVO_PAGE_LAYOUT__?: boolean }).__ACHIEVO_PAGE_LAYOUT__ = true;
    }
  }, []);

  return (
    <div className="min-h-screen text-text">
      <GlobalNav />
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:grid lg:grid-cols-[220px,1fr] lg:gap-8 lg:pb-12">
        <SideNav />
        <main className="min-h-[60vh] space-y-6">
          <PolicyBanner />
          <DegradedBanner />
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
