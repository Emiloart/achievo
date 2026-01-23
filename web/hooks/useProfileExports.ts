/**
 * Profile export hook.
 *
 * Orchestrates export creation and retrieval using authenticated backend APIs.
 */
"use client";

import { getApiErrorMessage } from "../lib/apiError";
import { useCallback, useMemo, useState } from "react";
import { useBackendAuth } from "./useBackendAuth";
import { asyncConfirmed, asyncFailed, asyncIdle, asyncLoading, type AsyncState } from "../types/asyncState";

/** Public export bundle metadata returned by the backend. */
export type ExportBundle = {
  publicId: string;
  format: "JSON" | "JSONLD" | "PDF";
  snapshot?: any;
  snapshotHash: string;
  signature: string;
  signatureType: string;
  signerAddress: string;
  issuedAt?: number;
  anchor?: { chainId?: number; contract?: string; txHash?: string; anchoredAt?: string | null } | null;
  downloadUrl?: string | null;
  jsonld?: any;
};

const API_BASE = "/api";

/** Creates exports and retrieves export history for the authenticated user. */
export function useProfileExportActions() {
  const { token } = useBackendAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastExport, setLastExport] = useState<ExportBundle | null>(null);

  const createExport = useCallback(
    async (format: "JSON" | "JSONLD" | "PDF", anchor: boolean) => {
      if (!token) throw new Error("Not signed in");
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/exports/profile`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ format, anchor }),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        const payload = json.data as ExportBundle;
        setLastExport(payload);
        return payload;
      } catch (e: any) {
        const message = e?.message || "Failed to create export";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const state: AsyncState<ExportBundle | null> = useMemo(() => {
    if (loading) return asyncLoading(lastExport);
    if (error) return asyncFailed(error, lastExport);
    if (lastExport) return asyncConfirmed(lastExport);
    return asyncIdle(null);
  }, [error, lastExport, loading]);

  return { createExport, loading, error, state, lastExport };
}
