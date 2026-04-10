"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "./primitives";
import { useDensity } from "../layout/DensityProvider";

type Column<T> = {
  key: string;
  label: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
};

type SelectionConfig<T> = {
  selectable?: boolean;
  getRowId?: (row: T) => string;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  selectionLabel?: string;
};

export function DataTable<T>({
  columns,
  rows,
  empty,
  className,
  virtualized,
  rowHeight,
  maxHeight = 420,
  onRowClick,
  selectable,
  getRowId,
  selectedIds,
  onSelectedIdsChange,
  selectionLabel = "Select rows",
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  className?: string;
  virtualized?: boolean;
  rowHeight?: number;
  maxHeight?: number;
  onRowClick?: (row: T) => void;
} & SelectionConfig<T>) {
  const { density } = useDensity();
  const defaultRowHeight = density === "compact" ? 40 : 52;
  const effectiveRowHeight = rowHeight ?? defaultRowHeight;
  const isSelectable = Boolean(selectable);

  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const resolvedSelected = selectedIds ?? internalSelected;
  const setSelected = onSelectedIdsChange ?? setInternalSelected;

  const resolveRowId = useMemo(() => {
    if (getRowId) return getRowId;
    return (row: T) => {
      const id = (row as { id?: string }).id;
      return String(id ?? "");
    };
  }, [getRowId]);

  const selectedSet = useMemo(() => new Set(resolvedSelected), [resolvedSelected]);
  const rowIds = useMemo(() => rows.map(resolveRowId).filter(Boolean), [resolveRowId, rows]);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedSet.has(id));
  const someSelected = rowIds.some((id) => selectedSet.has(id));
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const shouldVirtualize = virtualized ?? rows.length > 60;
  const [scrollTop, setScrollTop] = useState(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const gridTemplate = isSelectable
    ? "grid-cols-1 md:grid-cols-[48px_repeat(auto-fit,minmax(120px,1fr))]"
    : "grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]";

  const { startIndex, endIndex } = useMemo(() => {
    if (!shouldVirtualize) return { startIndex: 0, endIndex: rows.length };
    const visibleCount = Math.ceil(maxHeight / effectiveRowHeight);
    const overscan = 6;
    const start = Math.max(0, Math.floor(scrollTop / effectiveRowHeight) - overscan);
    const end = Math.min(rows.length, start + visibleCount + overscan * 2);
    return { startIndex: start, endIndex: end };
  }, [effectiveRowHeight, maxHeight, rows.length, scrollTop, shouldVirtualize]);

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate = someSelected && !allSelected;
  }, [allSelected, someSelected]);

  if (!rows.length) {
    return <div className={clsx("text-sm text-textMuted", className)}>{empty || "No data."}</div>;
  }

  const selectionColumn: Column<T> = {
    key: "__select__",
    label: (
      <div className="flex items-center">
        <input
          type="checkbox"
          aria-label={selectionLabel}
          checked={allSelected}
          ref={headerCheckboxRef}
          className="h-4 w-4 rounded border border-border text-accent focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
          onChange={() => {
            if (allSelected) {
              setSelected([]);
              return;
            }
            setSelected(rowIds);
          }}
        />
      </div>
    ),
    className: "w-10",
    render: (row: T) => {
      const id = resolveRowId(row);
      if (!id) {
        return null;
      }
      const isChecked = selectedSet.has(id);
      return (
        <Checkbox
          aria-label={`Select ${id}`}
          checked={isChecked}
          onChange={() => {
            if (isChecked) {
              setSelected(resolvedSelected.filter((existing) => existing !== id));
              return;
            }
            setSelected([...resolvedSelected, id]);
          }}
          onClick={(event) => event.stopPropagation()}
        />
      );
    },
  };

  const visibleColumns = isSelectable ? [selectionColumn, ...columns] : columns;

  return (
    <div className={clsx("rounded-2xl border border-border bg-surface", className)}>
      <div role="rowgroup" className="bg-surface2 text-xs uppercase tracking-wider text-textMuted">
        <div role="row" className={clsx("grid gap-0", gridTemplate)}>
          {visibleColumns.map((col) => (
            <div
              key={col.key}
              role="columnheader"
              className={clsx("px-[var(--table-cell-x)] py-[var(--table-cell-y)] text-left font-medium", col.className)}
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>
      <div
        ref={bodyRef}
        role="rowgroup"
        className={clsx("relative", shouldVirtualize ? "overflow-y-auto" : "overflow-hidden")}
        style={shouldVirtualize ? { maxHeight } : undefined}
        onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}
      >
        <div style={shouldVirtualize ? { height: rows.length * effectiveRowHeight, position: "relative" } : undefined}>
          {(shouldVirtualize ? rows.slice(startIndex, endIndex) : rows).map((row, idx) => {
            const absoluteIndex = shouldVirtualize ? startIndex + idx : idx;
            const rowStyle = shouldVirtualize
              ? {
                  position: "absolute" as const,
                  top: absoluteIndex * effectiveRowHeight,
                  left: 0,
                  right: 0,
                  height: effectiveRowHeight,
                }
              : undefined;
            return (
              <div
                key={absoluteIndex}
                role="row"
                className={clsx(
                  "grid gap-0 border-t border-border hover:bg-surface2",
                  gridTemplate,
                  onRowClick ? "cursor-pointer" : null,
                )}
                style={rowStyle}
                onClick={(event) => {
                  if (!onRowClick) return;
                  const target = event.target as HTMLElement | null;
                  if (
                    target?.closest("button, a, input, select, textarea, [role='button'], [data-row-action='true']")
                  ) {
                    return;
                  }
                  onRowClick(row);
                }}
              >
                {visibleColumns.map((col) => (
                  <div
                    key={col.key}
                    role="cell"
                    className={clsx("px-[var(--table-cell-x)] py-[var(--table-cell-y)]", col.className)}
                  >
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
