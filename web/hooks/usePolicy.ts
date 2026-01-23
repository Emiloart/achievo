"use client";

import { createContext, useContext } from "react";
import type { Policy } from "../lib/policy/schema";
import { DEFAULT_POLICY } from "../lib/policy/schema";

type PolicyContextValue = {
  policy: Policy;
  isLoading: boolean;
  error: string | null;
  refreshPolicy: () => Promise<void>;
  isEnabled: (flag: keyof Policy["featureFlags"]) => boolean;
  getThreshold: (key: keyof Policy["thresholds"]) => number;
  getMessage: (key: keyof Policy["messaging"]["featureNotices"] | "globalBanner") => string | null;
};

export const PolicyContext = createContext<PolicyContextValue | null>(null);

export function usePolicy() {
  const ctx = useContext(PolicyContext);
  if (!ctx) {
    return {
      policy: DEFAULT_POLICY,
      isLoading: false,
      error: null,
      refreshPolicy: async () => undefined,
      isEnabled: (flag: keyof Policy["featureFlags"]) => Boolean(DEFAULT_POLICY.featureFlags[flag]),
      getThreshold: (key: keyof Policy["thresholds"]) => DEFAULT_POLICY.thresholds[key],
      getMessage: (key: keyof Policy["messaging"]["featureNotices"] | "globalBanner") =>
        key === "globalBanner"
          ? DEFAULT_POLICY.messaging.globalBanner.markdown
          : DEFAULT_POLICY.messaging.featureNotices[key],
    } satisfies PolicyContextValue;
  }
  return ctx;
}
