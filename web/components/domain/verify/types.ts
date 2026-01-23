export type VerifyStatus = "VERIFIED" | "NOT_FOUND" | "INVALID" | "UNKNOWN" | "ERROR";

export type VerificationCheck = {
  name: string;
  status: "pass" | "fail" | "warn" | "unknown";
  details?: unknown;
};
