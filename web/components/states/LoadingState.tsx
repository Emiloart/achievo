import clsx from "clsx";
import { Skeleton } from "../ui";

export type LoadingStateProps = {
  title?: string;
  description?: string;
  rows?: number;
  className?: string;
};

export function LoadingState({ title = "Loading", description, rows = 3, className }: LoadingStateProps) {
  return (
    <div className={clsx("rounded-2xl border border-border bg-surface px-6 py-5 space-y-3", className)}>
      <div className="text-sm font-semibold">{title}</div>
      {description ? <div className="text-xs text-textMuted">{description}</div> : null}
      <div className="space-y-2">
        {Array.from({ length: Math.max(rows, 1) }).map((_, idx) => (
          <Skeleton key={idx} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}
