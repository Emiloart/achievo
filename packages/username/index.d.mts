export type UsernameValidation = {
  valid: boolean;
  errors: string[];
};

export type UsernameNormalization = {
  normalized: string;
  handleHash: string;
};

export const USERNAME_RULES: {
  minLength: number;
  maxLength: number;
  pattern: string;
  allowLeadingDash: boolean;
  allowTrailingDash: boolean;
  allowConsecutiveDashes: boolean;
};

export function normalizeUsername(input: string): UsernameNormalization;
export function validateUsername(normalized: string): UsernameValidation;
