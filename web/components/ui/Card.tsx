import clsx from "clsx";
import type { PropsWithChildren } from "react";

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("rounded-2xl border border-border bg-surface shadow-soft", className)}>{children}</div>;
}

export function CardHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("border-b border-border px-5 py-4", className)}>{children}</div>;
}

export function CardBody({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("border-t border-border px-5 py-4", className)}>{children}</div>;
}
