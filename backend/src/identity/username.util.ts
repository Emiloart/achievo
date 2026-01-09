const USERNAME_REGEX = /^[a-z0-9_.-]+$/;
const RESERVED = new Set(["admin", "support", "achievo", "root", "system"]);

export function normalizeUsername(raw: string): { normalized: string; valid: boolean; reason?: string } {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { normalized: "", valid: false, reason: "INVALID" };
  const normalized = trimmed.toLowerCase();
  if (normalized.length < 3 || normalized.length > 32) return { normalized, valid: false, reason: "INVALID" };
  if (!USERNAME_REGEX.test(normalized)) return { normalized, valid: false, reason: "INVALID" };
  if (normalized.startsWith(".") || normalized.startsWith("_") || normalized.startsWith("-"))
    return { normalized, valid: false, reason: "INVALID" };
  if (normalized.endsWith(".") || normalized.endsWith("_") || normalized.endsWith("-"))
    return { normalized, valid: false, reason: "INVALID" };
  if (normalized.includes("..") || normalized.includes("__") || normalized.includes("--"))
    return { normalized, valid: false, reason: "INVALID" };
  if (RESERVED.has(normalized)) return { normalized, valid: false, reason: "INVALID" };
  return { normalized, valid: true };
}

export function toAchusrId(userId: bigint | number): string {
  try {
    const value = typeof userId === "bigint" ? userId : BigInt(userId);
    const digits = value.toString().padStart(10, "0");
    return `ACHUSR-${digits}`;
  } catch {
    return "ACHUSR-UNKNOWN";
  }
}
