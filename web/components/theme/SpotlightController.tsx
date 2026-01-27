"use client";

import { useEffect } from "react";
import { shouldEnableFX } from "../../lib/effects";

export function SpotlightController() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    if (!root) return;

    let raf = 0;
    let active = false;
    let x = 50;
    let y = 35;
    const baseOpacity = getComputedStyle(root).getPropertyValue("--spot-opacity").trim() || "0.12";
    const idleOpacity = "0.06";

    const setVars = () => {
      const spotX = `${x}%`;
      const spotY = `${y}%`;
      root.style.setProperty("--spot-x", spotX);
      root.style.setProperty("--spot-y", spotY);
      if (body) {
        body.style.setProperty("--spot-x", spotX);
        body.style.setProperty("--spot-y", spotY);
      }
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        setVars();
      });
    };

    const onMove = (event: PointerEvent) => {
      if (!active) return;
      const nextX = (event.clientX / window.innerWidth) * 100;
      const nextY = (event.clientY / window.innerHeight) * 100;
      x = Math.min(100, Math.max(0, nextX));
      y = Math.min(100, Math.max(0, nextY));
      root.style.setProperty("--spot-opacity", baseOpacity);
      body?.style.setProperty("--spot-opacity", baseOpacity);
      schedule();
    };

    const onLeave = () => {
      if (!active) return;
      x = 50;
      y = 35;
      root.style.setProperty("--spot-opacity", idleOpacity);
      body?.style.setProperty("--spot-opacity", idleOpacity);
      schedule();
    };

    const enable = () => {
      if (active) return;
      active = true;
      root.style.setProperty("--spot-opacity", baseOpacity);
      body?.style.setProperty("--spot-opacity", baseOpacity);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerleave", onLeave);
    };

    const disable = () => {
      if (!active) return;
      active = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      root.style.removeProperty("--spot-opacity");
      body?.style.removeProperty("--spot-opacity");
    };

    const update = () => {
      const fxOn = document.body?.classList.contains("fx-on");
      const allow = Boolean(fxOn) && shouldEnableFX();
      if (!allow) {
        disable();
        x = 50;
        y = 35;
        schedule();
        return;
      }
      enable();
    };

    const observer = new MutationObserver(update);
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

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

    update();

    return () => {
      disable();
      observer.disconnect();
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
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
