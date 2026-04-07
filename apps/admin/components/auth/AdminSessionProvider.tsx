"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as adminApi from "../../lib/adminApi";
import { normalizeRole, type AdminRole } from "../../lib/roles";

type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
};

type SessionState = {
  admin: AdminUser | null;
  loading: boolean;
  error: string | null;
};

type AdminSessionContext = SessionState & {
  refresh: () => Promise<void>;
  setAdmin: (admin: AdminUser | null) => void;
};

const SessionContext = createContext<AdminSessionContext | null>(null);

function normalizeAdmin(admin: { id: string; email: string; role?: string | null } | null): AdminUser | null {
  if (!admin?.id || !admin?.email) return null;
  return {
    id: admin.id,
    email: admin.email,
    role: normalizeRole(admin.role),
  };
}

function isUnauthorized(error: any) {
  return error?.status === 401 || error?.code === "UNAUTHORIZED";
}

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setAdmin(normalizeAdmin(await adminApi.me()));
    } catch (err: any) {
      try {
        const ok = await adminApi.refresh();
        if (!ok) {
          setAdmin(null);
          setError(isUnauthorized(err) ? null : err?.message || "Session expired");
          return;
        }
        setAdmin(normalizeAdmin(await adminApi.me()));
      } catch (refreshError: any) {
        setAdmin(null);
        setError(isUnauthorized(refreshError) ? null : refreshError?.message || "Session expired");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(
    () => ({ admin, loading, error, refresh, setAdmin }),
    [admin, loading, error],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAdminSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within AdminSessionProvider");
  }
  return ctx;
}
