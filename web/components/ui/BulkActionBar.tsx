"use client";

import clsx from "clsx";
import { Button } from "../../../packages/ui/src/Button";

export type BulkAction = {
  id: string;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  disabled?: boolean;
};

export function BulkActionBar({
  count,
  actions,
  className,
}: {
  count: number;
  actions: BulkAction[];
  className?: string;
}) {
  if (!count) return null;

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3",
        className,
      )}
    >
      <div className="text-sm font-medium">{count} selected</div>
      <div role="status" aria-live="polite" className="sr-only">
        {count} rows selected
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
