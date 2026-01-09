/**
 * Username normalization and validation utilities.
 *
 * Shared between backend and web to enforce identical handle rules and hashing.
 */
import { keccak256, toBytes } from "viem";

const ZERO_HASH = `0x${"0".repeat(64)}`;
const USERNAME_REGEX = /^[a-z0-9-]+$/;

/** Canonical username rules enforced across the stack. */
export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 32,
  pattern: "^[a-z0-9-]+$",
  allowLeadingDash: false,
  allowTrailingDash: false,
  allowConsecutiveDashes: false,
};

/** Normalizes a handle and computes its keccak256 hash. */
export function normalizeUsername(input) {
  const normalized = String(input || "").trim().toLowerCase();
  const handleHash = normalized ? keccak256(toBytes(normalized)) : ZERO_HASH;
  return { normalized, handleHash: handleHash.toLowerCase() };
}

/** Validates a normalized handle and returns error codes when invalid. */
export function validateUsername(normalized) {
  const errors = [];
  const value = String(normalized || "");
  if (!value) {
    errors.push("EMPTY");
  }
  if (value.length < USERNAME_RULES.minLength || value.length > USERNAME_RULES.maxLength) {
    errors.push("INVALID_LENGTH");
  }
  if (!USERNAME_REGEX.test(value)) {
    errors.push("INVALID_CHARS");
  }
  if (value.startsWith("-")) {
    errors.push("INVALID_START");
  }
  if (value.endsWith("-")) {
    errors.push("INVALID_END");
  }
  if (value.includes("--")) {
    errors.push("INVALID_SEQUENCE");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
