import clsx from "clsx";
import type { ReactNode } from "react";

export type TableFiltersProps = {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function TableFilters({ children, actions, className }: TableFiltersProps) {
  return (
    <div className={clsx("flex flex-col gap-3 md:flex-row md:items-end md:justify-between", className)}>
      <div className="grid flex-1 gap-3 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">{children}</div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
