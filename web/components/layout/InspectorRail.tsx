"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Button } from "../ui";

type InspectorRailProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function InspectorRail({ title, children, onClose }: InspectorRailProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      data-testid="inspector-rail"
      className={clsx(
        "fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-border bg-surface shadow-float lg:static lg:z-auto lg:max-w-none lg:shadow-none lg:rounded-2xl lg:border",
        collapsed ? "lg:w-16" : "lg:w-full",
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className={clsx("text-sm font-semibold", collapsed ? "sr-only" : null)}>{title}</div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand inspector rail" : "Collapse inspector rail"}
          >
            {collapsed ? "Expand" : "Collapse"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close inspector rail">
            Close
          </Button>
        </div>
      </div>
      <div className={clsx("h-[calc(100%-56px)] overflow-y-auto px-4 py-4", collapsed ? "hidden" : null)}>
        {children}
      </div>
    </aside>
  );
}
