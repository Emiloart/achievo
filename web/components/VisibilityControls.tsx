"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivacyOverrides, type RedactionMode, type VisibilityLevel } from "../hooks/usePrivacySettings";
import { Button, Badge } from "./ui";
import { uiToast } from "./ui/toast";

const VISIBILITY_OPTIONS: { value: VisibilityLevel; label: string }[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "UNLISTED", label: "Unlisted" },
  { value: "PRIVATE", label: "Private" },
];

const REDACTION_OPTIONS: { value: RedactionMode; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "METADATA_ONLY", label: "Metadata only" },
  { value: "FULL", label: "Full" },
];

type Props = {
  contentType: string;
  contentId: string;
  visibility?: VisibilityLevel;
  redaction?: RedactionMode;
  showRedaction?: boolean;
  unlistedPublicId?: string | null;
  onUpdated?: (override: {
    visibility: VisibilityLevel;
    redaction: RedactionMode;
    unlistedPublicId?: string | null;
  }) => void;
};

export function VisibilityControls({
  contentType,
  contentId,
  visibility,
  redaction,
  showRedaction = false,
  unlistedPublicId,
  onUpdated,
}: Props) {
  const { upsertOverride } = usePrivacyOverrides();
  const [localVisibility, setLocalVisibility] = useState<VisibilityLevel>(visibility || "PUBLIC");
  const [localRedaction, setLocalRedaction] = useState<RedactionMode>(redaction || "NONE");
  const [localToken, setLocalToken] = useState<string | null | undefined>(unlistedPublicId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalVisibility(visibility || "PUBLIC");
  }, [visibility]);

  useEffect(() => {
    setLocalRedaction(redaction || "NONE");
  }, [redaction]);

  useEffect(() => {
    setLocalToken(unlistedPublicId);
  }, [unlistedPublicId]);

  const handleUpdate = async (nextVisibility: VisibilityLevel, nextRedaction: RedactionMode) => {
    setSaving(true);
    try {
      const updated = await upsertOverride({
        contentType,
        contentId,
        visibility: nextVisibility,
        redaction: nextRedaction,
      });
      setLocalVisibility(updated.visibility);
      setLocalRedaction(updated.redaction);
      setLocalToken(updated.unlistedPublicId);
      onUpdated?.({
        visibility: updated.visibility,
        redaction: updated.redaction,
        unlistedPublicId: updated.unlistedPublicId,
      });
      uiToast.success("Visibility updated");
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to update visibility");
      setLocalVisibility(visibility || "PUBLIC");
      setLocalRedaction(redaction || "NONE");
      setLocalToken(unlistedPublicId);
    } finally {
      setSaving(false);
    }
  };

  const shareLink = useMemo(() => {
    if (localVisibility !== "UNLISTED" || !localToken) return "";
    if (typeof window === "undefined") return `/share/${localToken}`;
    return `${window.location.origin}/share/${localToken}`;
  }, [localVisibility, localToken]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="text-textMuted">Visibility</label>
      <select
        value={localVisibility}
        disabled={saving}
        className="rounded-full border border-border bg-surface2 px-3 py-1 text-xs"
        onChange={(e) => handleUpdate(e.target.value as VisibilityLevel, localRedaction)}
      >
        {VISIBILITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showRedaction && (
        <>
          <label className="text-textMuted">Redaction</label>
          <select
            value={localRedaction}
            disabled={saving}
            className="rounded-full border border-border bg-surface2 px-3 py-1 text-xs"
            onChange={(e) => handleUpdate(localVisibility, e.target.value as RedactionMode)}
          >
            {REDACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      )}
      {localVisibility === "UNLISTED" && localToken && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (typeof navigator === "undefined") return;
            navigator.clipboard.writeText(shareLink);
            uiToast.success("Share link copied");
          }}
        >
          Copy share link
        </Button>
      )}
      {saving && <Badge variant="neutral">Saving...</Badge>}
    </div>
  );
}
