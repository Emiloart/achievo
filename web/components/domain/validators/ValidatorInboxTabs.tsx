"use client";

import type { ReactNode } from "react";
import { Tabs } from "../../ui";

export type ValidatorInboxTabsProps = {
  pending: ReactNode;
  completed: ReactNode;
  initialId?: "pending" | "completed";
  onTabChange?: (id: "pending" | "completed") => void;
  counts?: { pending?: number; completed?: number };
};

export function ValidatorInboxTabs({
  pending,
  completed,
  initialId = "pending",
  onTabChange,
  counts,
}: ValidatorInboxTabsProps) {
  const pendingLabel = counts?.pending ? `Pending (${counts.pending})` : "Pending";
  const completedLabel = counts?.completed ? `Completed (${counts.completed})` : "Completed";

  return (
    <Tabs
      initialId={initialId}
      onChange={(id) => onTabChange?.(id as "pending" | "completed")}
      tabs={[
        { id: "pending", label: pendingLabel, content: pending },
        { id: "completed", label: completedLabel, content: completed },
      ]}
    />
  );
}
