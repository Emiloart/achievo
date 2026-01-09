import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export type DropdownItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

export function DropdownMenu({
  triggerLabel,
  items,
  className,
}: {
  triggerLabel: string;
  items: DropdownItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div className={clsx("relative inline-flex", className)} ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full border border-border bg-surface2 px-3 py-1.5 text-xs text-text"
        onClick={() => setOpen((prev) => !prev)}
      >
        {triggerLabel}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-border bg-surface shadow-card">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="flex w-full items-center px-4 py-2 text-left text-xs text-text hover:bg-surface2"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
