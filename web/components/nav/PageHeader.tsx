"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import clsx from "clsx";
import { Tooltip } from "../ui";
import { useRevealOnScroll } from "../../hooks/useRevealOnScroll";

export type Breadcrumb = {
  label: string;
  href?: string;
};

export type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  workbench?: boolean;
};

export function PageHeader({ title, description, breadcrumbs, actions, workbench }: PageHeaderProps) {
  const { ref, revealed } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={clsx(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between page-header glass-surface glass-border edge-glow surface-shine hover-lift reveal",
        revealed ? "reveal-in" : null,
      )}
    >
      <div className="space-y-1">
        {breadcrumbs?.length ? (
          <nav className="text-xs text-textMuted">
            {breadcrumbs.map((crumb, idx) => (
              <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-2">
                {crumb.href ? (
                  <Link href={crumb.href as Route} className="hover:text-text">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {idx < breadcrumbs.length - 1 ? <span>/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {workbench ? (
            <Tooltip label="Panels, bulk select, keyboard commands enabled">
              <span className="rounded-full border border-border bg-surface2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-textMuted">
                Workbench
              </span>
            </Tooltip>
          ) : null}
        </div>
        {description ? <p className="text-sm text-textMuted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
