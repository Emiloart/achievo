"use client";

import type { ReactNode } from "react";
import { Tabs } from "../../ui";

export type ProjectTabsProps = {
  overview: ReactNode;
  timeTracking: ReactNode;
  invoices: ReactNode;
  shareLinks: ReactNode;
  initialId?: "overview" | "time" | "invoices" | "share";
  onTabChange?: (id: "overview" | "time" | "invoices" | "share") => void;
};

export function ProjectTabs({
  overview,
  timeTracking,
  invoices,
  shareLinks,
  initialId = "overview",
  onTabChange,
}: ProjectTabsProps) {
  return (
    <Tabs
      initialId={initialId}
      onChange={(id) => onTabChange?.(id as "overview" | "time" | "invoices" | "share")}
      tabs={[
        { id: "overview", label: "Overview", content: overview },
        { id: "time", label: "Time tracking", content: timeTracking },
        { id: "invoices", label: "Invoices", content: invoices },
        { id: "share", label: "Share links", content: shareLinks },
      ]}
    />
  );
}
