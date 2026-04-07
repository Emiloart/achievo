type RateEntry = {
  failures: number;
  firstFailureAt: number;
  lockedUntil?: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const bucket = new Map<string, RateEntry>();

function now() {
  return Date.now();
}

function getEntry(key: string): RateEntry {
  const existing = bucket.get(key);
  if (existing) return existing;
  const fresh: RateEntry = { failures: 0, firstFailureAt: now() };
  bucket.set(key, fresh);
  return fresh;
}

export function checkLoginLimit(key: string) {
  const entry = getEntry(key);
  const age = now() - entry.firstFailureAt;
  if (age > WINDOW_MS) {
    entry.failures = 0;
    entry.firstFailureAt = now();
    delete entry.lockedUntil;
  }
  if (entry.lockedUntil && entry.lockedUntil > now()) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now()) / 1000),
      locked: true,
    };
  }
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = now() + LOCKOUT_MS;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000),
      locked: true,
    };
  }
  return { allowed: true } as const;
}

export function recordLoginFailure(key: string) {
  const entry = getEntry(key);
  const age = now() - entry.firstFailureAt;
  if (age > WINDOW_MS) {
    entry.failures = 0;
    entry.firstFailureAt = now();
  }
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = now() + LOCKOUT_MS;
  }
}

export function recordLoginSuccess(key: string) {
  bucket.delete(key);
}
