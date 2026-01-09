/**
 * Profile export hook.
 *
 * Orchestrates export creation and retrieval using authenticated backend APIs.
 */
"use client";

import { getApiErrorMessage } from "../lib/apiError";
import { useCallback, useState } from "react";
import { useBackendAuth } from "./useBackendAuth";

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
  anchor?: { chainId?: number; contract?: string; txHash?: string } | null;
  downloadUrl?: string | null;
  jsonld?: any;
};

const API_BASE = "/api";

/** Creates exports and retrieves export history for the authenticated user. */
export function useProfileExportActions() {
  const { token } = useBackendAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        return json.data as ExportBundle;
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

  return { createExport, loading, error };
}
