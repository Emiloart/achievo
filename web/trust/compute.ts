import type { TrustSummary, TrustCheck } from "./types";

type VerifyChecks = Record<string, boolean | "unknown" | undefined>;

function toStatus(value: boolean | "unknown" | undefined): TrustCheck["status"] {
  if (value === "unknown") return "unknown";
  if (value === true) return "pass";
  if (value === false) return "fail";
  return "unknown";
}

function hasPass(checks: TrustCheck[]) {
  return checks.some((check) => check.status === "pass");
}

function baseSummary(state: TrustSummary["state"], checks: TrustCheck[]): TrustSummary {
  const labels: Record<TrustSummary["state"], string> = {
    VERIFIED: "Verified",
    ANCHORED: "Anchored",
    SIGNED_ONLY: "Signature verified",
    PARTIAL: "Partially verified",
    UNVERIFIED: "Unverified",
    PRIVATE: "Private",
    UNLISTED: "Unlisted",
    ERROR: "Unavailable",
  };
  return { state, label: labels[state], checks };
}

export function computeExportTrust(input?: {
  valid?: boolean;
  redacted?: boolean;
  checks?: VerifyChecks;
}): TrustSummary {
  if (!input) return baseSummary("ERROR", []);
  if (input.redacted) return baseSummary("PRIVATE", []);
  const checks = input.checks || {};
  const list: TrustCheck[] = [
    { name: "Hash match", status: toStatus(checks.hashMatch) },
    { name: "Signature valid", status: toStatus(checks.signatureValid) },
    { name: "Signer match", status: toStatus(checks.expectedSignerMatch) },
    { name: "Anchor present", status: toStatus(checks.anchorPresent) },
    { name: "Anchor verified", status: toStatus(checks.anchorVerified) },
  ];
  if (checks.anchorVerified === true) return baseSummary("VERIFIED", list);
  if (checks.anchorPresent === true) return baseSummary("ANCHORED", list);
  if (checks.signatureValid === true && checks.hashMatch === true) return baseSummary("SIGNED_ONLY", list);
  if (hasPass(list)) return baseSummary("PARTIAL", list);
  return baseSummary("UNVERIFIED", list);
}

export function computeProofTrust(input?: {
  valid?: boolean;
  redacted?: boolean;
  checks?: VerifyChecks;
}): TrustSummary {
  if (!input) return baseSummary("ERROR", []);
  if (input.redacted) return baseSummary("PRIVATE", []);
  const checks = input.checks || {};
  const list: TrustCheck[] = [
    { name: "Hash present", status: toStatus(checks.hashPresent ?? checks.hashMatch) },
    { name: "Anchor present", status: toStatus(checks.anchorPresent) },
    { name: "Anchor verified", status: toStatus(checks.anchorVerified) },
  ];
  if (checks.anchorVerified === true) return baseSummary("VERIFIED", list);
  if (checks.anchorPresent === true) return baseSummary("ANCHORED", list);
  if (checks.hashPresent === true || checks.hashMatch === true) return baseSummary("PARTIAL", list);
  return baseSummary("UNVERIFIED", list);
}

export function computeValidationTrust(input?: {
  valid?: boolean;
  redacted?: boolean;
  checks?: VerifyChecks;
}): TrustSummary {
  if (!input) return baseSummary("ERROR", []);
  if (input.redacted) return baseSummary("PRIVATE", []);
  const checks = input.checks || {};
  const list: TrustCheck[] = [
    { name: "Signature valid", status: toStatus(checks.signatureValid) },
    { name: "Hash match", status: toStatus(checks.hashMatch) },
    { name: "Anchor present", status: toStatus(checks.anchorPresent) },
    { name: "Anchor verified", status: toStatus(checks.anchorVerified) },
  ];
  if (checks.anchorVerified === true) return baseSummary("VERIFIED", list);
  if (checks.anchorPresent === true) return baseSummary("ANCHORED", list);
  if (checks.signatureValid === true && checks.hashMatch === true) return baseSummary("SIGNED_ONLY", list);
  if (hasPass(list)) return baseSummary("PARTIAL", list);
  return baseSummary("UNVERIFIED", list);
}

export function computeSubmissionTrust(input?: { redacted?: boolean; checks?: VerifyChecks }): TrustSummary {
  if (!input) return baseSummary("ERROR", []);
  if (input.redacted) return baseSummary("PRIVATE", []);
  const checks = input.checks || {};
  const list: TrustCheck[] = [
    { name: "Hash present", status: toStatus(checks.hashPresent ?? checks.hashMatch) },
    { name: "Anchor present", status: toStatus(checks.anchorPresent) },
    { name: "Anchor verified", status: toStatus(checks.anchorVerified) },
  ];
  if (checks.anchorVerified === true) return baseSummary("VERIFIED", list);
  if (checks.anchorPresent === true) return baseSummary("ANCHORED", list);
  if (hasPass(list)) return baseSummary("PARTIAL", list);
  return baseSummary("UNVERIFIED", list);
}
