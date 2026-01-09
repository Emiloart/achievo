import type { LogLevel } from "@nestjs/common";

export function resolveLogLevels(level?: string | null): LogLevel[] {
  const normalized = String(level || "info").toLowerCase();
  switch (normalized) {
    case "verbose":
      return ["log", "error", "warn", "debug", "verbose"];
    case "debug":
      return ["log", "error", "warn", "debug"];
    case "warn":
      return ["warn", "error"];
    case "error":
      return ["error"];
    case "info":
    default:
      return ["log", "error", "warn"];
  }
}
