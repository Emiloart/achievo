import { keccak256 } from "viem";

const HANDLE_REGEX = /^[a-z0-9-]+$/;
const HANDLE_MIN = 3;
const HANDLE_MAX = 32;

/** Normalized handle result with validity flag and canonical value. */
export type NormalizedHandle = { valid: boolean; handle: string };

/** Normalizes and validates an org handle against canonical rules. */
export function normalizeHandle(raw: string): NormalizedHandle {
  const value = (raw || "").trim().toLowerCase();
  if (!value || value.length < HANDLE_MIN || value.length > HANDLE_MAX) return { valid: false, handle: "" };
  if (!HANDLE_REGEX.test(value)) return { valid: false, handle: "" };
  if (value.startsWith("-") || value.endsWith("-")) return { valid: false, handle: "" };
  if (value.includes("--")) return { valid: false, handle: "" };
  return { valid: true, handle: value };
}

/** Computes the keccak256 hash of a normalized handle. */
export function hashHandle(handle: string): `0x${string}` {
  const bytes = new TextEncoder().encode(handle);
  return keccak256(bytes);
}

/** Returns the canonical handle rules for client display and validation. */
export function handleRules() {
  return {
    minLength: HANDLE_MIN,
    maxLength: HANDLE_MAX,
    allowed: "a-z, 0-9, dash",
    noPrefixSuffixDash: true,
    noConsecutiveDashes: true,
    lowercaseOnly: true,
  };
}
