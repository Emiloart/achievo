import clsx from "clsx";
import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  className?: string;
}) {
  if (!rows.length) {
    return <div className={clsx("text-sm text-textMuted", className)}>{empty || "No data."}</div>;
  }

  return (
    <div className={clsx("overflow-hidden rounded-2xl border border-border bg-surface", className)}>
      <table className="min-w-full text-sm">
        <thead className="bg-surface2 text-xs uppercase tracking-wider text-textMuted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={clsx("px-4 py-3 text-left font-medium", col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-border/60 hover:bg-surface2/50">
              {columns.map((col) => (
                <td key={col.key} className={clsx("px-4 py-3", col.className)}>
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
