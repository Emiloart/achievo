"use client";

import { useEffect } from "react";

/** Dev-only guard that asserts the app is wrapped in PageLayout. */
export function LayoutInvariant() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const timer = window.setTimeout(() => {
      const flag = (globalThis as { __ACHIEVO_PAGE_LAYOUT__?: boolean }).__ACHIEVO_PAGE_LAYOUT__;
      if (!flag) {
        // eslint-disable-next-line no-console
        console.error("Layout invariant violated: PageLayout was not detected in the active render tree.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
