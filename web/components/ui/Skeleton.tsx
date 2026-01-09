import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx("animate-pulse rounded-xl bg-gradient-to-r from-surface2 via-surface to-surface2", className)}
    />
  );
}
