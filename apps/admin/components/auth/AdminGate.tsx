"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "./AdminSessionProvider";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/login");
    }
  }, [admin, loading, router]);

  if (loading) {
    return (
      <div style={{ padding: "48px" }}>
        <div className="card">
          <div className="skeleton" style={{ width: "50%", marginBottom: "12px" }} />
          <div className="skeleton" style={{ width: "80%" }} />
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return <>{children}</>;
}
