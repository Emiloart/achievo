import clsx from "clsx";
import { CopyField } from "./CopyField";

function truncateHash(value: string) {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function HashDisplay({
  label,
  value,
  href,
  className,
}: {
  label?: string;
  value: string;
  href?: string;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={clsx("space-y-2", className)}>
      {label && <div className="text-xs text-textMuted">{label}</div>}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-accent hover:text-accent"
        >
          <span className="font-mono">{truncateHash(value)}</span>
          <span className="text-[0.7rem] uppercase tracking-wide">Open</span>
        </a>
      ) : (
        <CopyField value={value} />
      )}
    </div>
  );
}
