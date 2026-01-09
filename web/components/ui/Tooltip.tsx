import clsx from "clsx";
import type { ReactNode } from "react";

export function Tooltip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded-lg bg-text px-2 py-1 text-[0.7rem] text-surface opacity-0 shadow-soft transition group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
