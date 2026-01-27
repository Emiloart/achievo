import { shouldReduceMotion } from "./motion";

export type EffectsMode = "on" | "off";

const STORAGE_KEY = "achievo_fx_v1";

export function loadEffects(): EffectsMode {
  if (typeof window === "undefined") return "on";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on" || stored === "off") return stored;
  } catch {
    // Ignore storage read failures.
  }
  const reduced = shouldReduceMotion();
  if (reduced) return "off";
  const isDesktop = window.matchMedia?.("(min-width: 1024px)")?.matches ?? true;
  return isDesktop ? "on" : "on";
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
  const root = document.body;
  root.classList.remove("fx-on", "fx-off");
  root.classList.add(mode === "on" ? "fx-on" : "fx-off");
}
