import { DEFAULT_POLICY, type Policy, parsePolicy } from "./schema";

type PolicyResponse = {
  policy?: unknown;
  data?: unknown;
};

const POLICY_ENDPOINTS = ["/api/policies/public", "/api/config/public", "/api/meta/policy"];

function toBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function toNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractPolicyPayload(payload: PolicyResponse | unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const maybe = payload as PolicyResponse;
  if (maybe.policy) return maybe.policy;
  if (maybe.data && typeof maybe.data === "object" && "policy" in (maybe.data as any)) {
    return (maybe.data as any).policy;
  }
  return maybe.data || payload;
}

async function fetchRemotePolicy(): Promise<unknown | null> {
  for (const endpoint of POLICY_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, { cache: "no-store", credentials: "include" });
      if (res.status === 404) continue;
      if (!res.ok) return null;
      const json = (await res.json()) as PolicyResponse;
      return extractPolicyPayload(json);
    } catch {
      return null;
    }
  }
  return null;
}

function policyFromEnv(): Policy {
  const defaults = DEFAULT_POLICY;
  return parsePolicy({
    version: defaults.version,
    featureFlags: {
      verifyPortalEnabled: toBoolean(
        process.env.NEXT_PUBLIC_VERIFY_PORTAL_ENABLED,
        defaults.featureFlags.verifyPortalEnabled,
      ),
      usernameMarketEnabled: toBoolean(
        process.env.NEXT_PUBLIC_USERNAME_MARKET_ENABLED,
        defaults.featureFlags.usernameMarketEnabled,
      ),
      anchoringEnabled: toBoolean(process.env.NEXT_PUBLIC_ANCHORING_ENABLED, defaults.featureFlags.anchoringEnabled),
      orgCreateRequired: toBoolean(
        process.env.NEXT_PUBLIC_ORG_CREATE_REQUIRED,
        defaults.featureFlags.orgCreateRequired,
      ),
      endorsementsEnabled: toBoolean(
        process.env.NEXT_PUBLIC_ENDORSEMENTS_ENABLED,
        defaults.featureFlags.endorsementsEnabled,
      ),
    },
    thresholds: {
      finalityConfirmations: toNumber(
        process.env.NEXT_PUBLIC_FINALITY_CONFIRMATIONS,
        defaults.thresholds.finalityConfirmations,
      ),
      degradedStalenessSeconds: toNumber(
        process.env.NEXT_PUBLIC_DEGRADED_STALENESS_SECONDS,
        defaults.thresholds.degradedStalenessSeconds,
      ),
    },
    displayPolicies: {
      showRiskSignalsToPublic: toBoolean(
        process.env.NEXT_PUBLIC_SHOW_RISK_PUBLIC,
        defaults.displayPolicies.showRiskSignalsToPublic,
      ),
      showVerificationAsExperimental: toBoolean(
        process.env.NEXT_PUBLIC_VERIFY_EXPERIMENTAL,
        defaults.displayPolicies.showVerificationAsExperimental,
      ),
      anonymizeUsernameOwner: toBoolean(
        process.env.NEXT_PUBLIC_ANONYMIZE_USERNAME_OWNER,
        defaults.displayPolicies.anonymizeUsernameOwner,
      ),
    },
    messaging: {
      globalBanner: {
        enabled: toBoolean(process.env.NEXT_PUBLIC_GLOBAL_BANNER_ENABLED, defaults.messaging.globalBanner.enabled),
        level:
          (process.env.NEXT_PUBLIC_GLOBAL_BANNER_LEVEL as Policy["messaging"]["globalBanner"]["level"]) ||
          defaults.messaging.globalBanner.level,
        markdown: process.env.NEXT_PUBLIC_GLOBAL_BANNER_MARKDOWN || defaults.messaging.globalBanner.markdown,
      },
      featureNotices: {
        usernameMarket:
          process.env.NEXT_PUBLIC_FEATURE_NOTICE_USERNAME_MARKET || defaults.messaging.featureNotices.usernameMarket,
        anchoring: process.env.NEXT_PUBLIC_FEATURE_NOTICE_ANCHORING || defaults.messaging.featureNotices.anchoring,
        verifyPortal:
          process.env.NEXT_PUBLIC_FEATURE_NOTICE_VERIFY_PORTAL || defaults.messaging.featureNotices.verifyPortal,
      },
    },
  });
}

export async function loadPolicy(): Promise<Policy> {
  const remote = await fetchRemotePolicy();
  if (remote) return parsePolicy(remote);
  return policyFromEnv();
}
