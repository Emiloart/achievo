"use client";

import clsx from "clsx";

export function StatusPill({ status }: { status: string }) {
  const norm = status.toLowerCase();
  const tone =
    norm.includes("ok") || norm.includes("confirmed")
      ? "success"
      : norm.includes("warn") || norm.includes("degraded")
        ? "warn"
        : norm.includes("fail") || norm.includes("down") || norm.includes("reorg")
          ? "danger"
          : "info";
  return <span className={clsx("status-pill", tone)}>{status}</span>;
}
