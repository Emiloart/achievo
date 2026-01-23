"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Policy } from "../../lib/policy/schema";
import { DEFAULT_POLICY } from "../../lib/policy/schema";
import { loadPolicy } from "../../lib/policy/source";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { PolicyContext } from "../../hooks/usePolicy";

type PolicyContextValue = React.ContextType<typeof PolicyContext>;

let cachedPolicy: Policy = DEFAULT_POLICY;
let hasLoaded = false;

export function PolicyProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState<Policy>(cachedPolicy);
  const [isLoading, setIsLoading] = useState(!hasLoaded);
  const [error, setError] = useState<string | null>(null);
  const { user } = useBackendAuth();

  const refreshPolicy = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await loadPolicy();
      cachedPolicy = next;
      hasLoaded = true;
      setPolicy(next);
    } catch (err: any) {
      setError(err?.message || "Failed to load policy");
      setPolicy(cachedPolicy);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const reset = (globalThis as { __ACHIEVO_POLICY_RESET__?: boolean }).__ACHIEVO_POLICY_RESET__;
      if (reset) {
        cachedPolicy = DEFAULT_POLICY;
        hasLoaded = false;
        (globalThis as { __ACHIEVO_POLICY_RESET__?: boolean }).__ACHIEVO_POLICY_RESET__ = false;
      }
    }
    if (!hasLoaded) {
      void refreshPolicy();
    }
  }, [refreshPolicy]);

  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      void refreshPolicy();
    }
  }, [userId, refreshPolicy]);

  const value = useMemo<PolicyContextValue>(
    () => ({
      policy,
      isLoading,
      error,
      refreshPolicy,
      isEnabled: (flag) => Boolean(policy.featureFlags[flag]),
      getThreshold: (key) => policy.thresholds[key],
      getMessage: (key) => {
        if (key === "globalBanner") return policy.messaging.globalBanner.markdown || null;
        return policy.messaging.featureNotices[key] || null;
      },
    }),
    [error, isLoading, policy, refreshPolicy],
  );

  return <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>;
}
