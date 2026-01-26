"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyDensityClass, type Density, loadDensity, saveDensity } from "../../lib/density";

type DensityContextValue = {
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
};

const DensityContext = createContext<DensityContextValue | null>(null);

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>("comfortable");

  useEffect(() => {
    const stored = loadDensity();
    setDensityState(stored);
    applyDensityClass(stored);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    saveDensity(next);
    applyDensityClass(next);
  }, []);

  const toggleDensity = useCallback(() => {
    setDensity(density === "compact" ? "comfortable" : "compact");
  }, [density, setDensity]);

  const value = useMemo(() => ({ density, setDensity, toggleDensity }), [density, setDensity, toggleDensity]);

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) {
    return {
      density: "comfortable" as Density,
      setDensity: () => undefined,
      toggleDensity: () => undefined,
    };
  }
  return ctx;
}
