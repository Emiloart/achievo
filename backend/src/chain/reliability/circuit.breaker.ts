/**
 * Circuit breaker for RPC availability.
 *
 * Prevents repeated calls to failing RPC endpoints by opening and half-opening on cooldown.
 */
import { RpcUnavailableError } from "./rpc.errors";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type CircuitBreakerConfig = {
  failureThreshold: number;
  cooldownMs: number;
};

/** Tracks RPC failure state and opens the circuit after repeated failures. */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private openedAt: number | null = null;
  private halfOpenInFlight = false;

  constructor(private readonly config: CircuitBreakerConfig) {}

  getState() {
    return this.state;
  }

  snapshot() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      openedAt: this.openedAt,
    };
  }

  private shouldHalfOpen(now: number) {
    if (this.state !== "OPEN" || this.openedAt === null) return false;
    return now - this.openedAt >= this.config.cooldownMs;
  }

  assertReady() {
    const now = Date.now();
    if (this.state === "OPEN") {
      if (!this.shouldHalfOpen(now)) {
        throw new RpcUnavailableError("RPC_CIRCUIT_OPEN");
      }
      this.state = "HALF_OPEN";
      this.halfOpenInFlight = false;
    }

    if (this.state === "HALF_OPEN") {
      if (this.halfOpenInFlight) {
        throw new RpcUnavailableError("RPC_CIRCUIT_HALF_OPEN");
      }
      this.halfOpenInFlight = true;
    }
  }

  recordSuccess() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.openedAt = null;
    this.halfOpenInFlight = false;
  }

  recordFailure() {
    const now = Date.now();
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.openedAt = now;
      this.failureCount = 0;
      this.halfOpenInFlight = false;
      return;
    }
    this.failureCount += 1;
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = now;
      this.failureCount = 0;
      this.halfOpenInFlight = false;
    }
  }
}
