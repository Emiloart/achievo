export type TrustState =
  | "VERIFIED"
  | "ANCHORED"
  | "SIGNED_ONLY"
  | "PARTIAL"
  | "UNVERIFIED"
  | "PRIVATE"
  | "UNLISTED"
  | "ERROR";

export type TrustCheckStatus = "pass" | "warn" | "fail" | "unknown";

export type TrustCheck = {
  name: string;
  status: TrustCheckStatus;
  details?: string;
};

export type TrustSummary = {
  state: TrustState;
  label: string;
  checks: TrustCheck[];
};
