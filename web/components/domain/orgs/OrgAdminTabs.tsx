"use client";

import type { ReactNode } from "react";
import { Tabs } from "../../ui";

export type OrgAdminTabsProps = {
  overview: ReactNode;
  programs: ReactNode;
  submissions: ReactNode;
  initialId?: "overview" | "programs" | "submissions";
  onTabChange?: (id: "overview" | "programs" | "submissions") => void;
  counts?: {
    programs?: number;
    submissions?: number;
  };
};

export function OrgAdminTabs({
  overview,
  programs,
  submissions,
  initialId = "overview",
  onTabChange,
  counts,
}: OrgAdminTabsProps) {
  const programLabel = counts?.programs ? `Programs (${counts.programs})` : "Programs";
  const submissionsLabel = counts?.submissions ? `Submissions (${counts.submissions})` : "Submissions";

  return (
    <Tabs
      initialId={initialId}
      onChange={(id) => onTabChange?.(id as "overview" | "programs" | "submissions")}
      tabs={[
        { id: "overview", label: "Overview", content: overview },
        { id: "programs", label: programLabel, content: programs },
        { id: "submissions", label: submissionsLabel, content: submissions },
      ]}
    />
  );
}
