"use client";

import { AdminSessionProvider } from "../../components/auth/AdminSessionProvider";
import { AdminGate } from "../../components/auth/AdminGate";
import { AppShell } from "../../components/layout/AppShell";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminGate>
        <AppShell>{children}</AppShell>
      </AdminGate>
    </AdminSessionProvider>
  );
}
