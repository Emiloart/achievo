"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Modal } from "../ui/Modal";
import { Input } from "../ui";

export type CommandPaletteItem = {
  id: string;
  label: string;
  section: string;
  shortcut?: string;
  enabled: boolean;
  reason?: string;
  onRun: () => void;
};

type CommandPaletteModalProps = {
  open: boolean;
  onClose: () => void;
  actions: CommandPaletteItem[];
};

export function CommandPaletteModal({ open, onClose, actions }: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const lowered = query.trim().toLowerCase();
    return actions.filter((action) => action.label.toLowerCase().includes(lowered));
  }, [actions, query]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, filtered.length]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandPaletteItem[]>();
    filtered.forEach((item) => {
      if (!groups.has(item.section)) groups.set(item.section, []);
      groups.get(item.section)?.push(item);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  const flat = filtered;

  const moveActive = (direction: 1 | -1) => {
    if (!flat.length) return;
    setActiveIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return flat.length - 1;
      if (next >= flat.length) return 0;
      return next;
    });
  };

  const runActive = () => {
    const item = flat[activeIndex];
    if (!item || !item.enabled) return;
    item.onRun();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Command Palette" size="sm">
      <div className="space-y-3" data-testid="command-palette">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type an action..."
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveActive(1);
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              moveActive(-1);
            }
            if (event.key === "Enter") {
              event.preventDefault();
              runActive();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
        />
        <div role="listbox" className="max-h-[320px] overflow-y-auto rounded-2xl border border-border">
          {grouped.length ? (
            grouped.map(([section, items]) => (
              <div key={section} className="border-b border-border last:border-b-0">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-textMuted">
                  {section}
                </div>
                <div className="space-y-1 px-2 pb-2">
                  {items.map((item) => {
                    const index = flat.findIndex((entry) => entry.id === item.id);
                    const isActive = index === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        aria-disabled={!item.enabled}
                        onClick={() => {
                          if (!item.enabled) return;
                          item.onRun();
                          onClose();
                        }}
                        className={clsx(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                          isActive ? "bg-surface2 text-text" : "text-text",
                          item.enabled ? "hover:bg-surface2" : "opacity-60",
                        )}
                      >
                        <div>
                          <div>{item.label}</div>
                          {!item.enabled && item.reason ? (
                            <div className="text-xs text-textMuted">{item.reason}</div>
                          ) : null}
                        </div>
                        {item.shortcut ? <div className="text-xs text-textMuted">{item.shortcut}</div> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-textMuted">No matching actions.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
