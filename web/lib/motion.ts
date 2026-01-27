export function shouldReduceMotion() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const reduceMotion = Boolean(media?.matches);
  const saveData = Boolean((navigator as { connection?: { saveData?: boolean } }).connection?.saveData);
  return reduceMotion || saveData;
}
