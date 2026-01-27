"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyEffectsClass, loadEffects, saveEffects, type EffectsMode } from "../../lib/effects";

type EffectsContextValue = {
  effects: EffectsMode;
  setEffects: (mode: EffectsMode) => void;
  toggleEffects: () => void;
};

const EffectsContext = createContext<EffectsContextValue | null>(null);

export function EffectsProvider({ children }: { children: ReactNode }) {
  const [effects, setEffectsState] = useState<EffectsMode>("on");

  useEffect(() => {
    const stored = loadEffects();
    setEffectsState(stored);
    applyEffectsClass(stored);
  }, []);

  const setEffects = useCallback((mode: EffectsMode) => {
    setEffectsState(mode);
    saveEffects(mode);
    applyEffectsClass(mode);
  }, []);

  const toggleEffects = useCallback(() => {
    setEffects(effects === "on" ? "off" : "on");
  }, [effects, setEffects]);

  const value = useMemo(() => ({ effects, setEffects, toggleEffects }), [effects, setEffects, toggleEffects]);

  return <EffectsContext.Provider value={value}>{children}</EffectsContext.Provider>;
}

export function useEffects() {
  const ctx = useContext(EffectsContext);
  if (!ctx) {
    return {
      effects: "on" as EffectsMode,
      setEffects: () => undefined,
      toggleEffects: () => undefined,
    };
  }
  return ctx;
}
