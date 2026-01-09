import clsx from "clsx";
import type { PropsWithChildren } from "react";

type Variant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "verified"
  | "partial"
  | "unverified"
  | "private"
  | "unlisted";

const styles: Record<Variant, string> = {
  neutral: "bg-surface2 text-textMuted border border-border",
  info: "bg-info/10 text-info border border-info/20",
  success: "bg-success/10 text-success border border-success/20",
  warning: "bg-warning/10 text-warning border border-warning/20",
  danger: "bg-danger/10 text-danger border border-danger/20",
  verified: "bg-status-verified/10 text-status-verified border border-status-verified/20",
  partial: "bg-status-partial/10 text-status-partial border border-status-partial/20",
  unverified: "bg-status-unverified/10 text-status-unverified border border-status-unverified/20",
  private: "bg-status-private/10 text-status-private border border-status-private/20",
  unlisted: "bg-status-unlisted/10 text-status-unlisted border border-status-unlisted/20",
};

export function Badge({
  variant = "neutral",
  className,
  children,
}: PropsWithChildren<{ variant?: Variant; className?: string }>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] uppercase tracking-wide",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
