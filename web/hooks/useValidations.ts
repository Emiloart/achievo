/**
 * Validations hook.
 *
 * Manages validation requests and attestation submissions.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";

/** Validation request record returned by the backend. */
export type ValidationRequest = {
  id: string;
  claimantUserId: string;
  achievementId?: string | null;
  badgeTokenId?: string | null;
  title: string;
  summary?: string | null;
  evidenceLinks?: any;
  requestedValidatorWallet: string;
  status: string;
  createdAt?: string | null;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  redaction?: "NONE" | "METADATA_ONLY" | "FULL";
  unlistedPublicId?: string | null;
};

/** Validation attestation record returned by the backend. */
export type ValidationAttestation = {
  id: string;
  requestId: string;
  validatorWallet: string;
  status: string;
  message?: string | null;
  score?: number | null;
  issuedAt?: string | null;
  signature?: string | null;
  attestationHash?: string | null;
  chainId?: number | null;
  anchorTxHash?: string | null;
  anchorContract?: string | null;
  anchoredAt?: string | null;
  validator?: {
    walletAddress: string;
    displayName: string;
    type: string;
    userId?: string | null;
    website?: string | null;
  } | null;
};

/** Combined validation request and attestation view model. */
export type ValidationItem = {
  request: ValidationRequest;
  claimant?: any;
  attestation?: ValidationAttestation | null;
};

const API_BASE = "/api";

/** Loads validation requests and attestations for a user. */
export function useUserValidations(
  userId?: string,
  filters?: { status?: string; achievementId?: string; badgeTokenId?: string },
) {
  const { token } = useBackendAuth();
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchValidations = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    const search = new URLSearchParams();
    if (filters?.status) search.set("status", filters.status);
    if (filters?.achievementId) search.set("achievementId", filters.achievementId);
    if (filters?.badgeTokenId) search.set("badgeTokenId", filters.badgeTokenId);
    setLoading(true);
    setError("");
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/users/${userId}/validations?${search.toString()}`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load validations");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, filters?.status, filters?.achievementId, filters?.badgeTokenId, token]);

  useEffect(() => {
    void fetchValidations();
  }, [fetchValidations]);

  return { items, loading, error, refetch: fetchValidations };
}

/** Loads pending validation requests for a validator wallet. */
export function useValidatorRequests(walletAddress?: string) {
  const { token } = useBackendAuth();
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!walletAddress || !token) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/validators/${walletAddress}/requests`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, token]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  return { items, loading, error, refetch: fetchRequests };
}

/** Submits validation attestations for the authenticated validator. */
export function useValidationActions() {
  const { token } = useBackendAuth();

  const requestValidation = useCallback(
    async (payload: any) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/validations/requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to create request"));
      return res.json();
    },
    [token],
  );

  const prepareAttestation = useCallback(
    async (requestId: string, payload: any) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/validations/requests/${requestId}/attestation/prepare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to prepare attestation"));
      return res.json();
    },
    [token],
  );

  const submitAttestation = useCallback(
    async (requestId: string, payload: any) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/validations/requests/${requestId}/attest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to submit attestation"));
      return res.json();
    },
    [token],
  );

  const revokeAttestation = useCallback(
    async (requestId: string, payload: any) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/validations/requests/${requestId}/revoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to revoke attestation"));
      return res.json();
    },
    [token],
  );

  return { requestValidation, prepareAttestation, submitAttestation, revokeAttestation };
}
