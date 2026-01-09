"use client";
import { useEffect, useMemo, useState } from "react";
import type { ProfessionalProfile } from "../hooks/useProfessionalProfile";
import toast from "react-hot-toast";

const AVAILABILITY_OPTIONS = [
  { value: "UNSPECIFIED", label: "Unspecified" },
  { value: "OPEN_TO_WORK", label: "Open to work" },
  { value: "OPEN_TO_COLLAB", label: "Open to collaborate" },
  { value: "NOT_AVAILABLE", label: "Not available" },
];

type Props = {
  professional: ProfessionalProfile;
  saving?: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
};

function toCommaList(items: string[]) {
  return items.join(", ");
}

export function ProfessionalProfileEditor({ professional, saving, onSave }: Props) {
  const [form, setForm] = useState({
    headline: professional.headline || "",
    currentRole: professional.currentRole || "",
    currentOrg: professional.currentOrg || "",
    location: professional.location || "",
    timezone: professional.timezone || "",
    bioShort: professional.bioShort || "",
    skillsText: toCommaList(professional.skills || []),
    industriesText: toCommaList(professional.industries || []),
    availability: professional.availability || "UNSPECIFIED",
    hourlyRateMin: professional.hourlyRateMin?.toString() || "",
    hourlyRateMax: professional.hourlyRateMax?.toString() || "",
    currency: professional.currency || "",
    websiteUrl: professional.websiteUrl || "",
    githubUrl: professional.githubUrl || "",
    linkedinUrl: professional.linkedinUrl || "",
    xUrl: professional.xUrl || "",
    portfolioUrl: professional.portfolioUrl || "",
    isPublic: professional.isPublic ?? true,
  });

  useEffect(() => {
    setForm({
      headline: professional.headline || "",
      currentRole: professional.currentRole || "",
      currentOrg: professional.currentOrg || "",
      location: professional.location || "",
      timezone: professional.timezone || "",
      bioShort: professional.bioShort || "",
      skillsText: toCommaList(professional.skills || []),
      industriesText: toCommaList(professional.industries || []),
      availability: professional.availability || "UNSPECIFIED",
      hourlyRateMin: professional.hourlyRateMin?.toString() || "",
      hourlyRateMax: professional.hourlyRateMax?.toString() || "",
      currency: professional.currency || "",
      websiteUrl: professional.websiteUrl || "",
      githubUrl: professional.githubUrl || "",
      linkedinUrl: professional.linkedinUrl || "",
      xUrl: professional.xUrl || "",
      portfolioUrl: professional.portfolioUrl || "",
      isPublic: professional.isPublic ?? true,
    });
  }, [professional]);

  const payload = useMemo(() => {
    return {
      headline: form.headline,
      currentRole: form.currentRole,
      currentOrg: form.currentOrg,
      location: form.location,
      timezone: form.timezone,
      bioShort: form.bioShort,
      skills: form.skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      industries: form.industriesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      availability: form.availability,
      hourlyRateMin: form.hourlyRateMin || null,
      hourlyRateMax: form.hourlyRateMax || null,
      currency: form.currency,
      websiteUrl: form.websiteUrl,
      githubUrl: form.githubUrl,
      linkedinUrl: form.linkedinUrl,
      xUrl: form.xUrl,
      portfolioUrl: form.portfolioUrl,
      isPublic: form.isPublic,
    };
  }, [form]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await onSave(payload);
      toast.success("Professional profile updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update professional profile");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Headline</label>
          <input
            value={form.headline}
            onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Blockchain dev & technical writer"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Current role</label>
          <input
            value={form.currentRole}
            onChange={(e) => setForm((prev) => ({ ...prev, currentRole: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Lead Engineer"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Current org</label>
          <input
            value={form.currentOrg}
            onChange={(e) => setForm((prev) => ({ ...prev, currentOrg: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Emilo Labs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Awka, Nigeria"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Timezone</label>
          <input
            value={form.timezone}
            onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Africa/Lagos"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Availability</label>
          <select
            value={form.availability}
            onChange={(e) => setForm((prev) => ({ ...prev, availability: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Hourly rate min</label>
          <input
            value={form.hourlyRateMin}
            onChange={(e) => setForm((prev) => ({ ...prev, hourlyRateMin: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="20"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Hourly rate max</label>
          <input
            value={form.hourlyRateMax}
            onChange={(e) => setForm((prev) => ({ ...prev, hourlyRateMax: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Currency</label>
          <input
            value={form.currency}
            onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="USD"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">Short bio</label>
        <textarea
          value={form.bioShort}
          onChange={(e) => setForm((prev) => ({ ...prev, bioShort: e.target.value }))}
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={3}
          placeholder="Concise professional summary."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Skills</label>
          <input
            value={form.skillsText}
            onChange={(e) => setForm((prev) => ({ ...prev, skillsText: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="solidity, nestjs, cybersecurity"
          />
          <div className="text-xs text-gray-500">Comma-separated tags.</div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Industries</label>
          <input
            value={form.industriesText}
            onChange={(e) => setForm((prev) => ({ ...prev, industriesText: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="defi, edtech"
          />
          <div className="text-xs text-gray-500">Comma-separated tags.</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Website</label>
          <input
            value={form.websiteUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">GitHub</label>
          <input
            value={form.githubUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, githubUrl: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="https://github.com/..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">LinkedIn</label>
          <input
            value={form.linkedinUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="https://linkedin.com/in/..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">X (Twitter)</label>
          <input
            value={form.xUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, xUrl: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="https://x.com/..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Portfolio</label>
          <input
            value={form.portfolioUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
        />
        Public professional profile
      </label>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-md bg-brand-600 text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save professional profile"}
      </button>
    </form>
  );
}
