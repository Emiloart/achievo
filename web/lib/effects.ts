import { shouldReduceMotion } from "./motion";

export type EffectsMode = "on" | "off";

const STORAGE_KEY = "achievo_fx_v1";
const DESKTOP_QUERY = "(min-width: 1024px)";
const POINTER_FINE_QUERY = "(pointer: fine)";

type NavigatorWithExtras = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

export function isLowPowerDevice() {
  if (typeof window === "undefined") return false;
  const nav = navigator as NavigatorWithExtras;
  const saveData = Boolean(nav.connection?.saveData);
  const deviceMemory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined;
  const cpu = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : undefined;
  return saveData || (deviceMemory !== undefined && deviceMemory <= 4) || (cpu !== undefined && cpu <= 4);
}

export function shouldEnableFX() {
  if (typeof window === "undefined") return false;
  if (shouldReduceMotion()) return false;
  if (isLowPowerDevice()) return false;
  const finePointer = window.matchMedia?.(POINTER_FINE_QUERY)?.matches ?? true;
  return finePointer;
}

export function loadEffects(): EffectsMode {
  if (typeof window === "undefined") return "on";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on" || stored === "off") return stored;
  } catch {
    // Ignore storage read failures.
  }
  if (shouldReduceMotion()) return "off";
  const isDesktop = window.matchMedia?.(DESKTOP_QUERY)?.matches ?? true;
  if (!isDesktop) return "off";
  if (!shouldEnableFX()) return "off";
  return "on";
}

export function saveEffects(mode: EffectsMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures.
  }
}

export function applyEffectsClass(mode: EffectsMode) {
  if (typeof document === "undefined") return;
  const targets = [document.documentElement, document.body].filter(Boolean);
  for (const target of targets) {
    target.classList.remove("fx-on", "fx-off");
    target.classList.add(mode === "on" ? "fx-on" : "fx-off");
  }
}
