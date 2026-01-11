"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as adminApi from "../../lib/adminApi";

type AdminUser = {
  id: string;
  email: string;
  role: string;
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

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await adminApi.me();
      setAdmin(me);
    } catch (err: any) {
      const ok = await adminApi.refresh();
      if (ok) {
        const me = await adminApi.me();
        setAdmin(me);
      } else {
        setAdmin(null);
        setError(err?.message || "Session expired");
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
