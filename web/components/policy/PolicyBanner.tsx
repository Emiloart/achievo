"use client";

import { useMemo } from "react";
import { usePolicy } from "../../hooks/usePolicy";
import { Alert } from "../ui";
import { PolicyMarkdown } from "./PolicyMarkdown";

function resolveTone(level: string) {
  if (level === "critical") return "danger";
  if (level === "warning") return "warning";
  return "info";
}

/** Renders policy-defined global banner text (markdown safe, no HTML). */
export function PolicyBanner() {
  const { policy } = usePolicy();
  const banner = policy.messaging.globalBanner;

  const content = useMemo(() => {
    const markdown = banner.markdown?.trim();
    if (!banner.enabled || !markdown) return null;
    return markdown;
  }, [banner.enabled, banner.markdown]);

  if (!content) return null;

  return (
    <Alert tone={resolveTone(banner.level)} title="Notice">
      <PolicyMarkdown markdown={content} />
    </Alert>
  );
}
