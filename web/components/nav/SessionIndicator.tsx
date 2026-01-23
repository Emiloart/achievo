"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useSessionStatus } from "../../hooks/useSessionStatus";
import { Button, StatusBadge } from "../ui";

function toneForStatus(status: ReturnType<typeof useSessionStatus>["status"]) {
  if (status === "authenticated") return "success";
  if (status === "refreshing") return "info";
  if (status === "expired") return "warning";
  return "neutral";
}

/** Renders a compact session status indicator with a safe sign-in CTA. */
export function SessionIndicator() {
  const router = useRouter();
  const session = useSessionStatus();

  if (session.status === "refreshing" || session.status === "authenticated") {
    return <StatusBadge tone={toneForStatus(session.status)}>{session.message}</StatusBadge>;
  }

  return (
    <div className="flex items-center gap-2">
      <StatusBadge tone={toneForStatus(session.status)}>{session.message}</StatusBadge>
      {session.actionHref ? (
        <Button variant="secondary" size="sm" onClick={() => router.push(session.actionHref as Route)}>
          {session.actionLabel || "Sign in"}
        </Button>
      ) : null}
    </div>
  );
}
