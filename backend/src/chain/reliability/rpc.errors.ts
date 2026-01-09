/**
 * Typed error for explicit RPC unavailability.
 */
export class RpcUnavailableError extends Error {
  readonly code = "RPC_UNAVAILABLE";

  constructor(message?: string) {
    super(message || "RPC_UNAVAILABLE");
    this.name = "RpcUnavailableError";
  }
}

/**
 * Type guard for RPC unavailability errors.
 */
export function isRpcUnavailableError(error: unknown): error is RpcUnavailableError {
  return error instanceof RpcUnavailableError || (error as any)?.code === "RPC_UNAVAILABLE";
}
