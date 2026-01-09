const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export function isValidTimeZone(value?: string | null) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(preferred?: string | null) {
  if (isValidTimeZone(preferred)) return preferred as string;
  const fallback = "Africa/Lagos";
  if (isValidTimeZone(fallback)) return fallback;
  const system = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(system) ? system : "UTC";
}

export function dayKeyFromDate(date: Date, timeZone: string) {
  const parts = getFormatter(timeZone).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function dayKeyToDate(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

export function shiftDayKey(dayKey: string, days: number) {
  const date = dayKeyToDate(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekKeyFromDayKey(dayKey: string) {
  const date = dayKeyToDate(dayKey);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function weekKeyFromDate(date: Date, timeZone: string) {
  const dayKey = dayKeyFromDate(date, timeZone);
  return weekKeyFromDayKey(dayKey);
}

export function weekStartFromKey(weekKey: string) {
  const [yearPart, weekPart] = weekKey.split("-W");
  const year = Number.parseInt(yearPart, 10);
  const week = Number.parseInt(weekPart, 10);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7;
  if (dayOfWeek !== 1) {
    simple.setUTCDate(simple.getUTCDate() + (8 - dayOfWeek));
  }
  return simple.toISOString().slice(0, 10);
}
