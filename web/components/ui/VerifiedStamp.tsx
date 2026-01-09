import clsx from "clsx";

export function VerifiedStamp({ label = "Verified", className }: { label?: string; className?: string }) {
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border border-status-verified/30 bg-status-verified/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-status-verified",
        className,
      )}
    >
      <span>OK</span>
      {label}
    </div>
  );
}
