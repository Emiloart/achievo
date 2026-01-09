/**
 * Username normalization and validation re-exports for the web client.
 */
import {
  normalizeUsername as normalizeUsernameFn,
  validateUsername as validateUsernameFn,
  USERNAME_RULES as USERNAME_RULES_VALUE,
} from "../../packages/username/index.mjs";

/** Normalized username output. */
export type { UsernameNormalization as NormalizedUsername, UsernameValidation } from "../../packages/username/index.mjs";
/** Normalizes a user-supplied handle and computes its hash. */
export const normalizeUsername = normalizeUsernameFn;
/** Validates a normalized handle against canonical rules. */
export const validateUsername = validateUsernameFn;
/** Canonical username validation rules shared with backend. */
export const USERNAME_RULES = USERNAME_RULES_VALUE as Record<string, unknown>;
