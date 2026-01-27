"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Button, Switch } from "../ui";
import type { PanelMode } from "../../lib/panelRouting";

type InspectorRailProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  mode: PanelMode;
  displayMode?: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  canPin?: boolean;
};

export function InspectorRail({
  title,
  children,
  onClose,
  mode,
  displayMode,
  onModeChange,
  canPin = true,
}: InspectorRailProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isPinned = mode === "pinned";
  const isPinnedDisplay = (displayMode ?? mode) === "pinned";

  return (
    <aside
      data-testid="inspector-rail"
      className={clsx(
        "fixed inset-y-0 right-0 z-40 w-full border-l border-border bg-surface shadow-float glass-surface glass-border glass-elevated edge-glow surface-shine hover-lift fx-panel",
        isPinnedDisplay
          ? "lg:static lg:z-auto lg:rounded-2xl lg:border lg:shadow-none"
          : "sm:rounded-2xl lg:max-w-[420px]",
        collapsed ? "lg:w-16" : "lg:w-full",
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className={clsx("text-sm font-semibold", collapsed ? "sr-only" : null)}>{title}</div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-textMuted">
            <span>{canPin ? "Pin" : "Pin (desktop)"}</span>
            <Switch
              checked={isPinned}
              onCheckedChange={(checked) => onModeChange(checked ? "pinned" : "overlay")}
              disabled={!canPin}
              label="Pin inspector rail"
            />
          </div>
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
