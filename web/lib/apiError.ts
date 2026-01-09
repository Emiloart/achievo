/**
 * API error normalization helpers.
 *
 * Maps backend error codes into human-readable messages for UI display.
 */
type ApiErrorPayload = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    statusCode?: number;
  };
};

const FRIENDLY_MESSAGES: Record<string, string> = {
  ORG_CREATION_TX_REQUIRED: "On-chain org creation is required. Submit the org creation transaction first.",
  ORG_TX_NOT_REGISTRY: "That transaction did not call the org registry contract.",
  ORG_TX_NOT_CREATE_ORG: "That transaction did not call createOrg(handle) on the registry.",
  ORG_TX_INVALID: "We could not validate that org creation transaction. Please try again.",
  ORG_TX_FAILED: "Your org creation transaction failed. Please submit a new one.",
  ORG_EVENT_NOT_FOUND: "We could not find the org creation event in that transaction.",
  ORG_HANDLE_MISMATCH: "The handle in your transaction does not match the handle you entered.",
  ORG_HANDLE_HASH_MISMATCH: "The handle hash does not match. Please retry your org creation.",
  ORG_CREATOR_MISMATCH: "The transaction sender must be the wallet creating the org.",
  ORG_FEE_TOO_LOW: "The fee paid was too low. Please retry with the required fee.",
  ORG_CREATION_TX_ALREADY_USED: "This org creation transaction has already been used.",
  ORG_HANDLE_TAKEN: "That org handle is already taken. Try another one.",
  INVALID_HANDLE: "Handle must be 3-32 chars, lowercase letters/numbers/dashes, no leading or trailing dash.",
  DISPLAY_NAME_REQUIRED: "Display name is required.",
  WALLET_REQUIRED: "Connect your wallet and try again.",
  NOT_AUTHENTICATED: "Sign in to continue.",
  USER_NOT_FOUND: "We could not find that user.",
  INVALID_TX_HASH: "Transaction hash is invalid.",
  ORDER_ALREADY_EXISTS: "That order already exists.",
  TX_HASH_ALREADY_USED: "That transaction hash has already been used.",
};

function isCodeLike(value: string) {
  return /^[A-Z0-9_]+$/.test(value);
}

function humanizeCode(code: string) {
  const words = code
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\btx\b/g, "transaction")
    .replace(/\bwallet\b/g, "wallet")
    .replace(/\borg\b/g, "org")
    .replace(/\bachusr\b/g, "Achievo ID")
    .trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function extractMessage(payload: ApiErrorPayload | null, raw: string) {
  if (payload?.error) {
    return payload.error.message || payload.error.code || "";
  }
  return raw;
}

/** Formats API error payloads into a user-facing message. */
export function formatApiError(raw: string, fallback = "We couldn't complete that request. Please try again.") {
  const text = String(raw || "").trim();
  if (!text) return fallback;
  let payload: ApiErrorPayload | null = null;
  try {
    payload = JSON.parse(text) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  const message = extractMessage(payload, text).split("\n")[0]?.trim() || "";
  if (!message) return fallback;
  if (FRIENDLY_MESSAGES[message]) return FRIENDLY_MESSAGES[message];
  if (payload?.error?.code && FRIENDLY_MESSAGES[payload.error.code]) return FRIENDLY_MESSAGES[payload.error.code];
  if (isCodeLike(message)) return humanizeCode(message) || fallback;
  if (message.length > 160) return fallback;
  return message;
}

/** Extracts and formats a backend error message from an HTTP response. */
export async function getApiErrorMessage(
  res: Response,
  fallback = "We couldn't complete that request. Please try again.",
) {
  const text = await res.text();
  return formatApiError(text, fallback || res.statusText);
}
