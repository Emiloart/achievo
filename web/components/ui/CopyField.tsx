import { useState } from "react";
import clsx from "clsx";

export function CopyField({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={clsx("space-y-2", className)}>
      {label && <div className="text-xs text-textMuted">{label}</div>}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
        <span className="truncate text-xs text-text">{value}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-full bg-surface2 px-3 py-1 text-[0.7rem] uppercase tracking-wide text-textMuted"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
