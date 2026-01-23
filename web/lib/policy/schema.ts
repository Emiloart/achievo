import { z } from "zod";

const BannerLevel = z.enum(["info", "warning", "critical"]);

export const PolicySchema = z.object({
  version: z.number().int().min(1).default(1),
  featureFlags: z
    .object({
      verifyPortalEnabled: z.boolean().default(true),
      usernameMarketEnabled: z.boolean().default(true),
      anchoringEnabled: z.boolean().default(true),
      orgCreateRequired: z.boolean().default(true),
      endorsementsEnabled: z.boolean().default(true),
    })
    .default({}),
  thresholds: z
    .object({
      finalityConfirmations: z.number().int().min(1).default(1),
      degradedStalenessSeconds: z.number().int().min(30).default(300),
    })
    .default({}),
  displayPolicies: z
    .object({
      showRiskSignalsToPublic: z.boolean().default(true),
      showVerificationAsExperimental: z.boolean().default(false),
      anonymizeUsernameOwner: z.boolean().default(false),
    })
    .default({}),
  messaging: z
    .object({
      globalBanner: z
        .object({
          enabled: z.boolean().default(false),
          level: BannerLevel.default("info"),
          markdown: z.string().default(""),
        })
        .default({}),
      featureNotices: z
        .object({
          usernameMarket: z.string().default(""),
          anchoring: z.string().default(""),
          verifyPortal: z.string().default(""),
        })
        .default({}),
    })
    .default({}),
});

export type Policy = z.infer<typeof PolicySchema>;

export const DEFAULT_POLICY: Policy = PolicySchema.parse({});

function merge<T extends Record<string, any>>(base: T, override?: Partial<T> | null): T {
  if (!override) return base;
  const next: Record<string, any> = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      next[key] = merge(base[key] || {}, value);
      return;
    }
    if (value !== undefined) next[key] = value;
  });
  return next as T;
}

export function parsePolicy(input: unknown): Policy {
  const merged = merge(DEFAULT_POLICY, input as Partial<Policy>);
  const result = PolicySchema.safeParse(merged);
  if (result.success) return result.data;
  return DEFAULT_POLICY;
}
