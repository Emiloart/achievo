import clsx from "clsx";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx("rounded-2xl border border-dashed border-border bg-surface2/60 px-6 py-8 text-center", className)}
    >
      <div className="text-sm font-semibold">{title}</div>
      {description && <div className="mt-2 text-xs text-textMuted">{description}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
