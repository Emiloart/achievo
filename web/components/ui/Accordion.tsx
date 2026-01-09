import { useState } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";

export type AccordionItem = {
  id: string;
  title: string;
  content: ReactNode;
};

export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={clsx("space-y-3", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="rounded-2xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : item.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold"
            >
              <span>{item.title}</span>
              <span className={clsx("text-xs text-textMuted transition", open && "rotate-180")}>v</span>
            </button>
            <div
              className={clsx(
                "grid overflow-hidden transition-[grid-template-rows] duration-300",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 px-5 pb-4 text-sm text-textMuted">{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
