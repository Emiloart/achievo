"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { PrivacySettings, VisibilityLevel } from "../hooks/usePrivacySettings";

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
    return <div className="text-sm text-gray-500">Loading privacy settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="text-xs text-gray-500">Overrides active: {overridesCount}</div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Profile visibility</label>
          <select
            value={form.defaultProfileVisibility}
            onChange={(e) => setForm((prev) => ({ ...prev, defaultProfileVisibility: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Proofs visibility</label>
          <select
            value={form.defaultProofVisibility}
            onChange={(e) => setForm((prev) => ({ ...prev, defaultProofVisibility: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Validations visibility</label>
          <select
            value={form.defaultValidationVisibility}
            onChange={(e) => setForm((prev) => ({ ...prev, defaultValidationVisibility: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Achievements visibility</label>
          <select
            value={form.defaultAchievementVisibility}
            onChange={(e) => setForm((prev) => ({ ...prev, defaultAchievementVisibility: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.showConsistency}
          onChange={(e) => setForm((prev) => ({ ...prev, showConsistency: e.target.checked }))}
        />
        Show consistency metrics on public profiles
      </label>
      <button type="submit" className="px-4 py-2 rounded-md bg-brand-600 text-white disabled:opacity-60">
        Save privacy settings
      </button>
    </form>
  );
}
