"use client";

import { useEffect, useState } from "react";
import { shouldEnableFX } from "../../lib/effects";
import { useEffects } from "../layout/EffectsProvider";

export function BackgroundFX() {
  const { effects } = useEffects();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setEnabled(effects === "on" && shouldEnableFX());
    update();
    const pointerQuery = window.matchMedia?.("(pointer: fine)");
    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (pointerQuery?.addEventListener) {
      pointerQuery.addEventListener("change", update);
    } else {
      pointerQuery?.addListener?.(update);
    }
    if (motionQuery?.addEventListener) {
      motionQuery.addEventListener("change", update);
    } else {
      motionQuery?.addListener?.(update);
    }
    return () => {
      if (pointerQuery?.removeEventListener) {
        pointerQuery.removeEventListener("change", update);
      } else {
        pointerQuery?.removeListener?.(update);
      }
      if (motionQuery?.removeEventListener) {
        motionQuery.removeEventListener("change", update);
      } else {
        motionQuery?.removeListener?.(update);
      }
    };
  }, [effects]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="fx-root">
      <div className="fx-aurora fx-aurora-1" />
      <div className="fx-aurora fx-aurora-2" />
      <div className="fx-aurora fx-aurora-3" />
      <div className="fx-spotlight" />
      <div className="fx-grid" />
      <div className="fx-noise" />
    </div>
  );
}
