/**
 * Session hook for cookie-based authentication.
 *
 * Restores sessions via /auth/me and /auth/refresh and only triggers wallet signing on explicit sign-in.
 */
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { getApiErrorMessage } from "../lib/apiError";

type AuthUser = { id: string; userId: string; primaryWallet: string };

// Always hit same-origin; Next.js rewrites will forward to the real backend.
const API_BASE = "/api";

let signingIn = false;

async function postJSON<T>(path: string, body: any, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, res.statusText || "Request failed"));
  }
  return res.json() as Promise<T>;
}

/** Exposes session state and explicit sign-in/sign-out actions. */
export function useBackendAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const loadSession = useCallback(async () => {
    if (!API_BASE) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as AuthUser & { csrfToken?: string };
        setUser(data);
        setCsrfToken(data.csrfToken || null);
        setToken((prev) => prev || "session");
        return;
      }
      if (res.status === 401) {
        const refresh = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
        if (refresh.ok) {
          const me = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
          if (me.ok) {
            const data = (await me.json()) as AuthUser & { csrfToken?: string };
            setUser(data);
            setCsrfToken(data.csrfToken || null);
            setToken((prev) => prev || "session");
            return;
          }
        }
      }
      setUser(null);
      setToken(null);
      setCsrfToken(null);
    } catch (e: any) {
      setError(e?.message || "Failed to restore session");
      setUser(null);
      setToken(null);
      setCsrfToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const signIn = async () => {
    if (!API_BASE) {
      setError("API base not configured");
      return;
    }
    if (!address) {
      setError("Connect wallet first");
      return;
    }
    if (signingIn || loading) {
      return;
    }
    signingIn = true;
    setError("");
    setLoading(true);
    try {
      const nonceResp = await postJSON<{ nonce: string; message: string }>("/auth/nonce", {
        walletAddress: address,
      });
      const signature = await signMessageAsync({ message: nonceResp.message });
      const loginResp = await postJSON<{ token?: string; user: AuthUser }>("/auth/login", {
        walletAddress: address,
        signature,
      });
      setToken(loginResp.token || "session");
      setUser(loginResp.user);
      await loadSession();
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      signingIn = false;
      setLoading(false);
    }
  };

  const signOut = () => {
    if (API_BASE) {
      void fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    setCsrfToken(null);
  };

  return useMemo(
    () => ({
      token,
      user,
      csrfToken,
      loading,
      error,
      signIn,
      signOut,
    }),
    [token, user, csrfToken, loading, error],
  );
}
