export type Density = "comfortable" | "compact";

const STORAGE_KEY = "achievo_density_v1";
const DEFAULT_DENSITY: Density = "comfortable";

export function loadDensity(): Density {
  if (typeof window === "undefined") return DEFAULT_DENSITY;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "compact" || stored === "comfortable" ? stored : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

export function saveDensity(density: Density) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, density);
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

export function applyDensityClass(density: Density) {
  if (typeof document === "undefined") return;
  const root = document.body;
  root.classList.remove("density-compact", "density-comfortable");
  root.classList.add(`density-${density}`);
}
