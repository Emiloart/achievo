/**
 * Retry policy with exponential backoff and jitter.
 *
 * Skips retry for explicit unavailability errors to avoid masking outages.
 */
import { isRpcUnavailableError } from "./rpc.errors";

export type RetryPolicyConfig = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fullJitterDelay(baseMs: number, maxMs: number, attempt: number) {
  const exp = Math.pow(2, attempt);
  const cap = clamp(baseMs * exp, baseMs, maxMs);
  return Math.floor(Math.random() * cap);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Implements exponential backoff with jitter for RPC retries. */
export class RetryPolicy {
  constructor(private readonly config: RetryPolicyConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const { maxRetries, baseDelayMs, maxDelayMs } = this.config;
    let attempt = 0;
    // attempt counts retries; attempt 0 is the first try.
    while (true) {
      try {
        return await fn();
      } catch (error) {
        if (isRpcUnavailableError(error)) throw error;
        if (attempt >= maxRetries) throw error;
        const delay = fullJitterDelay(baseDelayMs, maxDelayMs, attempt);
        attempt += 1;
        await sleep(delay);
      }
    }
  }
}
