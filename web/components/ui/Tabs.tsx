import { useState } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";

export type TabOption = {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
};

export function Tabs({
  tabs,
  initialId,
  onChange,
  className,
}: {
  tabs: TabOption[];
  initialId?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const initial = initialId || tabs[0]?.id;
  const [active, setActive] = useState(initial);

  const handleChange = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  const activeTab = tabs.find((tab) => tab.id === active) || tabs[0];

  return (
    <div className={clsx("space-y-4", className)}>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleChange(tab.id)}
            disabled={tab.disabled}
            className={clsx(
              "rounded-full px-4 py-2 text-xs font-medium transition",
              active === tab.id ? "bg-accent text-white shadow-soft" : "bg-surface2 text-textMuted hover:text-text",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
}
