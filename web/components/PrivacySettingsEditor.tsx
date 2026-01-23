"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { PrivacySettings, VisibilityLevel } from "../hooks/usePrivacySettings";
import { ErrorState } from "./states/ErrorState";
import { LoadingState } from "./states/LoadingState";
import { Button, Checkbox, Select, StatusBadge } from "./ui";

const VISIBILITY_OPTIONS: { value: VisibilityLevel; label: string }[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "UNLISTED", label: "Unlisted" },
  { value: "PRIVATE", label: "Private" },
];

type Props = {
  settings: PrivacySettings | null;
  overridesCount?: number;
  loading?: boolean;
  error?: string;
  onSave: (payload: Partial<PrivacySettings>) => Promise<unknown>;
};

export function PrivacySettingsEditor({ settings, overridesCount = 0, loading, error, onSave }: Props) {
  const [form, setForm] = useState({
    defaultProfileVisibility: "PUBLIC",
    defaultProofVisibility: "PUBLIC",
    defaultValidationVisibility: "PUBLIC",
    defaultAchievementVisibility: "PUBLIC",
    showConsistency: true,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      defaultProfileVisibility: settings.defaultProfileVisibility,
      defaultProofVisibility: settings.defaultProofVisibility,
      defaultValidationVisibility: settings.defaultValidationVisibility,
      defaultAchievementVisibility: settings.defaultAchievementVisibility,
      showConsistency: settings.showConsistency,
    });
  }, [settings]);

  const payload = useMemo(() => {
    return {
      defaultProfileVisibility: form.defaultProfileVisibility as VisibilityLevel,
      defaultProofVisibility: form.defaultProofVisibility as VisibilityLevel,
      defaultValidationVisibility: form.defaultValidationVisibility as VisibilityLevel,
      defaultAchievementVisibility: form.defaultAchievementVisibility as VisibilityLevel,
      showConsistency: form.showConsistency,
    };
  }, [form]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await onSave(payload);
      toast.success("Privacy settings updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update privacy settings");
    }
  };

  if (loading && !settings) {
    return (
      <LoadingState title="Loading privacy settings" description="Fetching your default privacy profile." rows={2} />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorState message={error} />}
      <div className="text-xs text-textMuted">Overrides active: {overridesCount}</div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Profile visibility</label>
          <div className="flex items-center gap-2">
            <Select
              value={form.defaultProfileVisibility}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultProfileVisibility: e.target.value }))}
              className="w-full"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <StatusBadge
              tone={
                form.defaultProfileVisibility === "PUBLIC"
                  ? "success"
                  : form.defaultProfileVisibility === "UNLISTED"
                    ? "warning"
                    : "neutral"
              }
            >
              {form.defaultProfileVisibility.toLowerCase()}
            </StatusBadge>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Proofs visibility</label>
          <div className="flex items-center gap-2">
            <Select
              value={form.defaultProofVisibility}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultProofVisibility: e.target.value }))}
              className="w-full"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <StatusBadge
              tone={
                form.defaultProofVisibility === "PUBLIC"
                  ? "success"
                  : form.defaultProofVisibility === "UNLISTED"
                    ? "warning"
                    : "neutral"
              }
            >
              {form.defaultProofVisibility.toLowerCase()}
            </StatusBadge>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Validations visibility</label>
          <div className="flex items-center gap-2">
            <Select
              value={form.defaultValidationVisibility}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultValidationVisibility: e.target.value }))}
              className="w-full"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <StatusBadge
              tone={
                form.defaultValidationVisibility === "PUBLIC"
                  ? "success"
                  : form.defaultValidationVisibility === "UNLISTED"
                    ? "warning"
                    : "neutral"
              }
            >
              {form.defaultValidationVisibility.toLowerCase()}
            </StatusBadge>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Achievements visibility</label>
          <div className="flex items-center gap-2">
            <Select
              value={form.defaultAchievementVisibility}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultAchievementVisibility: e.target.value }))}
              className="w-full"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <StatusBadge
              tone={
                form.defaultAchievementVisibility === "PUBLIC"
                  ? "success"
                  : form.defaultAchievementVisibility === "UNLISTED"
                    ? "warning"
                    : "neutral"
              }
            >
              {form.defaultAchievementVisibility.toLowerCase()}
            </StatusBadge>
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.showConsistency}
          onChange={(e) => setForm((prev) => ({ ...prev, showConsistency: e.target.checked }))}
        />
        Show consistency metrics on public profiles
      </label>
      <Button type="submit" disabled={loading} className="w-fit">
        Save privacy settings
      </Button>
    </form>
  );
}
