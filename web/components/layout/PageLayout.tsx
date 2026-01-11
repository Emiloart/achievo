"use client";

import type { ReactNode } from "react";
import { GlobalNav } from "../nav/GlobalNav";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-text">
      <GlobalNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
