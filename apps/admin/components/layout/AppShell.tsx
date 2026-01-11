"use client";

import { SideNav } from "../nav/SideNav";
import { TopBar } from "../nav/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <SideNav />
      <div className="main">
        <TopBar />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
