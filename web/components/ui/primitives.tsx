"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  Component,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { QRCodeSVG } from "qrcode.react";

const fieldBase =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text shadow-soft transition focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60";

const badgeVariants: Record<string, string> = {
  info: "border border-accent/30 bg-accent/10 text-accent",
  success: "border border-success/30 bg-success/10 text-success",
  verified: "border border-success/30 bg-success/10 text-success",
  partial: "border border-warning/30 bg-warning/10 text-warning",
  warning: "border border-warning/30 bg-warning/10 text-warning",
  unverified: "border border-textMuted/20 bg-surface2 text-textMuted",
  neutral: "border border-textMuted/20 bg-surface2 text-textMuted",
  private: "border border-border bg-surface2 text-textMuted",
  unlisted: "border border-border bg-surface2 text-text",
  danger: "border border-danger/30 bg-danger/10 text-danger",
};

function statusTone(status: string | null | undefined) {
  const value = String(status || "").toUpperCase();
  if (value.includes("VERIFIED") || value.includes("ACTIVE") || value.includes("SUCCESS") || value.includes("READY")) {
    return "success";
  }
  if (value.includes("PENDING") || value.includes("REVIEW") || value.includes("QUEUED") || value.includes("ANCHOR")) {
    return "info";
  }
  if (value.includes("WARN") || value.includes("EXPIRED") || value.includes("PARTIAL")) {
    return "warning";
  }
  if (value.includes("FAIL") || value.includes("ERROR") || value.includes("INVALID") || value.includes("REJECT")) {
    return "danger";
  }
  return "neutral";
}

function copyToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return Promise.resolve(false);
  return navigator.clipboard
    .writeText(value)
    .then(() => true)
    .catch(() => false);
}

export function Badge({
  variant = "info",
  className,
  children,
}: PropsWithChildren<{ variant?: string; className?: string }>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        badgeVariants[variant] || badgeVariants.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Tabs({
  tabs,
  initialId,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: ReactNode; content: ReactNode }>;
  initialId?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const fallbackId = tabs[0]?.id;
  const [activeId, setActiveId] = useState(initialId || fallbackId);

  useEffect(() => {
    setActiveId(initialId || fallbackId);
  }, [fallbackId, initialId]);

  const activeTab = tabs.find((tab) => tab.id === activeId) || tabs[0];

  return (
    <div className={clsx("space-y-4", className)}>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const selected = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={clsx(
                "rounded-full px-3 py-2 text-sm transition",
                selected ? "bg-surface2 text-text border border-border" : "text-textMuted hover:text-text",
              )}
              onClick={() => {
                setActiveId(tab.id);
                onChange?.(tab.id);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div>{activeTab?.content ?? null}</div>
    </div>
  );
}

export function Accordion({
  items,
  className,
}: {
  items: Array<{ id: string; title: ReactNode; content: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={clsx("space-y-2", className)}>
      {items.map((item) => (
        <details key={item.id} className="rounded-2xl border border-border bg-surface2">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-text">{item.title}</summary>
          <div className="border-t border-border px-4 py-3">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

export function Tooltip({ label, className, children }: PropsWithChildren<{ label: string; className?: string }>) {
  return (
    <span className={className} title={label}>
      {children}
    </span>
  );
}

export function DropdownMenu({
  triggerLabel,
  items,
  className,
}: {
  triggerLabel: ReactNode;
  items: Array<{ id: string; label: ReactNode; onSelect?: () => void }>;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  return (
    <details ref={detailsRef} className={clsx("relative", className)}>
      <summary className="cursor-pointer list-none rounded-full border border-border bg-surface px-3 py-2 text-sm text-text">
        {triggerLabel}
      </summary>
      <div className="absolute right-0 z-50 mt-2 min-w-[12rem] rounded-2xl border border-border bg-surface p-2 shadow-card">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-text hover:bg-surface2"
            onClick={() => {
              item.onSelect?.();
              if (detailsRef.current) detailsRef.current.open = false;
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-full bg-surface2", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center", className)}>
      <div className="space-y-2">
        <div className="text-base font-semibold text-text">{title}</div>
        {description ? <p className="text-sm text-textMuted">{description}</p> : null}
      </div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-textMuted hover:text-text"
      onClick={async () => {
        const ok = await copyToClipboard(value);
        if (!ok) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function CopyField({ label, value, className }: { label: string; value: string | number; className?: string }) {
  const resolvedValue = String(value ?? "");
  return (
    <div className={clsx("space-y-2", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-textMuted">{label}</div>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
        <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-text">
          {resolvedValue || "-"}
        </code>
        <CopyButton value={resolvedValue} />
      </div>
    </div>
  );
}

export function CopyableText({
  label,
  value,
  className,
}: {
  label?: string;
  value: string | number;
  className?: string;
}) {
  const resolvedValue = String(value ?? "");
  return (
    <div className={clsx("flex flex-wrap items-center gap-2 text-sm", className)}>
      {label ? <span className="text-textMuted">{label}:</span> : null}
      <code className="rounded-full bg-surface2 px-2 py-1 text-xs text-text">{resolvedValue || "-"}</code>
      <CopyButton value={resolvedValue} />
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={clsx(fieldBase, className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={clsx(fieldBase, "rounded-3xl", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={clsx(fieldBase, className)} {...props} />,
);
Select.displayName = "Select";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={clsx(
        "h-4 w-4 rounded border border-border bg-surface text-accent focus:outline-none focus:ring-2 focus:ring-accent/40",
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";

export function Switch({
  checked,
  onChange,
  onCheckedChange,
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
}) {
  return (
    <label className={clsx("inline-flex cursor-pointer items-center gap-3", className)}>
      <span
        className={clsx(
          "relative inline-flex h-6 w-11 items-center rounded-full border border-border transition",
          checked ? "bg-accent/80" : "bg-surface2",
        )}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white transition",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
      <input
        checked={checked}
        className="sr-only"
        type="checkbox"
        onChange={(event) => {
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
        }}
        {...props}
      />
      {label ? <span className="text-sm text-textMuted">{label}</span> : null}
    </label>
  );
}

export function StatusBadge({
  tone = "neutral",
  className,
  children,
}: PropsWithChildren<{ tone?: string; className?: string }>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        badgeVariants[tone] || badgeVariants.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <StatusBadge tone={statusTone(status)} className={clsx("uppercase tracking-wide", className)}>
      {status}
    </StatusBadge>
  );
}

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch() {}

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Something went wrong while rendering this panel.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export function Alert({
  tone = "info",
  title,
  className,
  children,
}: PropsWithChildren<{ tone?: string; title?: ReactNode; className?: string }>) {
  return (
    <div className={clsx("rounded-2xl border px-4 py-3", badgeVariants[tone] || badgeVariants.info, className)}>
      {title ? <div className="mb-1 text-sm font-semibold">{title}</div> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function QRCode({ value, size = 96, className }: { value: string; size?: number; className?: string }) {
  return (
    <div className={clsx("inline-flex rounded-2xl border border-border bg-white p-3", className)}>
      <QRCodeSVG value={value} size={size} />
    </div>
  );
}

export function VerifiedStamp({ verified = true, className }: { verified?: boolean; className?: string }) {
  return (
    <Badge className={className} variant={verified ? "verified" : "unverified"}>
      {verified ? "Verified" : "Unverified"}
    </Badge>
  );
}

export function HashDisplay({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value?: string | null;
  href?: string;
  className?: string;
}) {
  const resolvedValue = value || "-";
  const content = (
    <code className="block break-all rounded-2xl bg-surface2 px-3 py-2 text-xs text-text">{resolvedValue}</code>
  );

  return (
    <div className={clsx("space-y-2", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-textMuted">{label}</div>
      {href && value ? (
        <a href={href} target="_blank" rel="noreferrer" className="block hover:opacity-90">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

export function ActivityHeatmap({ values = [], className }: { values?: number[]; className?: string }) {
  const cells = useMemo(() => (values.length ? values.slice(0, 28) : Array.from({ length: 28 }, () => 0)), [values]);

  return (
    <div className={clsx("grid grid-cols-7 gap-2", className)}>
      {cells.map((value, index) => (
        <div
          key={index}
          className="h-4 w-4 rounded-sm bg-accent/10"
          style={{ opacity: Math.max(0.2, Math.min(1, value || 0.2)) }}
        />
      ))}
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  className,
  children,
}: PropsWithChildren<{
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <section className={clsx("space-y-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          {description ? <p className="text-sm text-textMuted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
