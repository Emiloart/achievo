import { ERROR_COPY, UI_LABELS } from "./uiCopy";

export type ErrorCategory =
  | "auth"
  | "validation"
  | "not_found"
  | "rate_limited"
  | "server"
  | "network"
  | "chain"
  | "unknown";

export type ErrorSeverity = "info" | "warning" | "error";

export type ErrorActionType = "retry" | "sign_in" | "switch_chain" | "reconnect" | "contact_support" | "none";

export type ErrorAction = {
  type: ErrorActionType;
  label: string;
};

export type NormalizedError = {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  action: ErrorAction;
  requestId?: string | null;
};

type TxErrorShape = { type?: string; message?: string };

function hasOwn(obj: unknown, key: string): obj is Record<string, unknown> {
  return Boolean(obj && typeof obj === "object" && key in obj);
}

function toNumber(value: unknown) {
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : undefined;
}

function detectNetworkIssue(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("network error") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("timed out")
  );
}

function detectWrongChain(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("wrong chain") || lower.includes("unsupported chain") || lower.includes("chain mismatch");
}

function defaultMessage(category: ErrorCategory) {
  if (category === "auth") return ERROR_COPY.auth;
  if (category === "validation") return ERROR_COPY.validation;
  if (category === "not_found") return ERROR_COPY.not_found;
  if (category === "rate_limited") return ERROR_COPY.rate_limited;
  if (category === "server") return ERROR_COPY.server;
  if (category === "network") return ERROR_COPY.network;
  if (category === "chain") return ERROR_COPY.chain.default;
  return ERROR_COPY.unknown;
}

function defaultAction(category: ErrorCategory): ErrorAction {
  if (category === "auth") return { type: "sign_in", label: UI_LABELS.signIn };
  if (category === "rate_limited") return { type: "retry", label: UI_LABELS.retry };
  if (category === "network") return { type: "retry", label: UI_LABELS.retry };
  if (category === "server") return { type: "retry", label: UI_LABELS.retry };
  if (category === "chain") return { type: "retry", label: UI_LABELS.retry };
  return { type: "none", label: "" };
}

function severityForCategory(category: ErrorCategory): ErrorSeverity {
  if (category === "auth" || category === "validation" || category === "rate_limited") return "warning";
  if (category === "not_found") return "info";
  if (category === "network") return "error";
  if (category === "chain") return "warning";
  if (category === "server") return "error";
  return "error";
}

function classifyFromStatus(status?: number) {
  if (!status) return null;
  if (status === 401 || status === 403) return "auth";
  if (status === 400) return "validation";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "unknown";
}

function classifyTxError(error: TxErrorShape): NormalizedError | null {
  const type = error.type;
  if (!type) return null;
  if (type === "rejected") {
    return {
      category: "chain",
      severity: "info",
      message: error.message || ERROR_COPY.chain.rejected,
      action: { type: "none", label: "" },
    };
  }
  if (type === "reverted") {
    return {
      category: "chain",
      severity: "error",
      message: error.message || ERROR_COPY.chain.reverted,
      action: { type: "retry", label: UI_LABELS.retry },
    };
  }
  if (type === "unknown") {
    return {
      category: "chain",
      severity: "warning",
      message: error.message || ERROR_COPY.chain.unknown,
      action: { type: "retry", label: UI_LABELS.retry },
    };
  }
  return null;
}

/** Normalizes arbitrary errors into a stable UX taxonomy. */
export function normalizeError(error: unknown, fallbackMessage?: string): NormalizedError {
  const fallback = fallbackMessage || defaultMessage("unknown");

  if (!error) {
    return {
      category: "unknown",
      severity: "error",
      message: fallback,
      action: defaultAction("unknown"),
    };
  }

  if (typeof error === "string") {
    const isWrongChain = detectWrongChain(error);
    const category = detectNetworkIssue(error) ? "network" : isWrongChain ? "chain" : "unknown";
    return {
      category,
      severity: severityForCategory(category),
      message: isWrongChain ? ERROR_COPY.chain.wrongChain : error || fallback,
      action: defaultAction(category),
    };
  }

  if (error instanceof Error) {
    const message = error.message || fallback;
    const requestId = hasOwn(error, "requestId") ? (error as { requestId?: string }).requestId || null : null;
    const status = hasOwn(error, "status")
      ? toNumber((error as { status?: unknown }).status)
      : hasOwn(error, "statusCode")
        ? toNumber((error as { statusCode?: unknown }).statusCode)
        : undefined;
    const statusCategory = classifyFromStatus(status);
    if (statusCategory) {
      return {
        category: statusCategory,
        severity: severityForCategory(statusCategory),
        message: message || defaultMessage(statusCategory),
        action: defaultAction(statusCategory),
        requestId,
      };
    }
    const isWrongChain = detectWrongChain(message);
    const category = detectNetworkIssue(message) ? "network" : isWrongChain ? "chain" : "unknown";
    return {
      category,
      severity: severityForCategory(category),
      message: isWrongChain ? ERROR_COPY.chain.wrongChain : message,
      action: defaultAction(category),
      requestId,
    };
  }

  if (typeof error === "object") {
    const requestId = hasOwn(error, "requestId")
      ? (error.requestId as string)
      : hasOwn(error, "traceId")
        ? (error.traceId as string)
        : null;
    const message = hasOwn(error, "message") ? String(error.message || "") : "";
    const status = hasOwn(error, "status")
      ? toNumber(error.status)
      : hasOwn(error, "statusCode")
        ? toNumber(error.statusCode)
        : undefined;

    const txError = classifyTxError(error as TxErrorShape);
    if (txError) {
      return {
        ...txError,
        requestId,
        message: txError.message || message || fallback,
      };
    }

    const statusCategory = classifyFromStatus(status);
    if (statusCategory) {
      const category = statusCategory;
      return {
        category,
        severity: severityForCategory(category),
        message: message || defaultMessage(category),
        action: defaultAction(category),
        requestId,
      };
    }

    if (detectNetworkIssue(message)) {
      return {
        category: "network",
        severity: severityForCategory("network"),
        message: message || defaultMessage("network"),
        action: defaultAction("network"),
        requestId,
      };
    }

    if (detectWrongChain(message)) {
      return {
        category: "chain",
        severity: severityForCategory("chain"),
        message: ERROR_COPY.chain.wrongChain,
        action: defaultAction("chain"),
        requestId,
      };
    }

    return {
      category: "unknown",
      severity: "error",
      message: message || fallback,
      action: defaultAction("unknown"),
      requestId,
    };
  }

  return {
    category: "unknown",
    severity: "error",
    message: fallback,
    action: defaultAction("unknown"),
  };
}

export function toUserMessage(error: unknown, fallback?: string) {
  return normalizeError(error, fallback).message;
}

export function toSeverity(error: unknown, fallback?: string) {
  return normalizeError(error, fallback).severity;
}

export function toAction(error: unknown, fallback?: string) {
  return normalizeError(error, fallback).action;
}

function isApiErrorLike(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  return (
    "status" in record ||
    "statusCode" in record ||
    "requestId" in record ||
    "traceId" in record ||
    "error" in record
  );
}

export function isNormalizedError(value: unknown): value is NormalizedError {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return "category" in record && "severity" in record && "message" in record && "action" in record;
}

export function assertNormalizedErrorInput(error: unknown, context: string) {
  if (process.env.NODE_ENV === "production") return;
  if (!isApiErrorLike(error)) return;
  if (isNormalizedError(error)) return;
  // eslint-disable-next-line no-console
  console.warn(`Expected normalized error taxonomy in ${context}. Use getApiError/normalizeError before rendering.`);
}
