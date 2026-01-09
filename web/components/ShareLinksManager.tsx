"use client";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useShareLinks, type ShareLink } from "../hooks/useShareLinks";

const SECTION_KEYS = [
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "goals", label: "Goals" },
  { id: "badges", label: "Badges" },
  { id: "streak", label: "Streak" },
  { id: "parties", label: "Parties" },
  { id: "activity", label: "Activity" },
  { id: "contact", label: "Contact" },
];

const DEFAULT_SECTIONS = SECTION_KEYS.reduce<Record<string, boolean>>((acc, key) => {
  acc[key.id] = false;
  return acc;
}, {});

const VISIBILITY_OPTIONS = ["PUBLIC", "UNLISTED", "DISABLED"] as const;
const THEME_OPTIONS = ["AUTO", "LIGHT", "DARK"] as const;

type FormState = {
  slug: string;
  title: string;
  description: string;
  visibility: string;
  theme: string;
  isPrimary: boolean;
  expiresAt: string;
  sections: Record<string, boolean>;
};

export function ShareLinksManager() {
  const { links, loading, error, createLink, updateLink, deleteLink } = useShareLinks();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ShareLink | null>(null);
  const [form, setForm] = useState<FormState>({
    slug: "",
    title: "",
    description: "",
    visibility: "UNLISTED",
    theme: "AUTO",
    isPrimary: false,
    expiresAt: "",
    sections: DEFAULT_SECTIONS,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      slug: "",
      title: "",
      description: "",
      visibility: "UNLISTED",
      theme: "AUTO",
      isPrimary: false,
      expiresAt: "",
      sections: {
        summary: true,
        skills: true,
        goals: true,
        badges: true,
        streak: true,
        parties: false,
        activity: false,
        contact: true,
      },
    });
    setShowModal(true);
  };

  const openEdit = (link: ShareLink) => {
    setEditing(link);
    setForm({
      slug: link.slug || "",
      title: link.title || "",
      description: link.description || "",
      visibility: link.visibility || "UNLISTED",
      theme: link.theme || "AUTO",
      isPrimary: Boolean(link.isPrimary),
      expiresAt: link.expiresAt ? link.expiresAt.slice(0, 16) : "",
      sections: { ...DEFAULT_SECTIONS, ...link.sections },
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        slug: form.slug,
        title: form.title,
        description: form.description || null,
        visibility: form.visibility,
        theme: form.theme,
        isPrimary: form.isPrimary,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        sections: form.sections,
      };
      if (editing) {
        await updateLink(editing.id, payload);
        toast.success("Share link updated");
      } else {
        await createLink(payload);
        toast.success("Share link created");
      }
      setShowModal(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save share link");
    }
  };

  const handleDelete = async (link: ShareLink) => {
    if (!confirm("Delete this share link?")) return;
    try {
      await deleteLink(link.id);
      toast.success("Share link removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete share link");
    }
  };

  const shareBase = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/s`;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Share Links</div>
          <div className="text-sm text-gray-500">Create shareable profile links with tailored sections.</div>
        </div>
        <button type="button" className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm" onClick={openCreate}>
          Create share link
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Loading share links...</div>
      ) : links.length ? (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="rounded-2xl border bg-white p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">{link.title}</div>
                  <div className="text-xs text-gray-500">/{link.slug}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{link.visibility}</span>
                  {link.isPrimary && (
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">Primary</span>
                  )}
                </div>
              </div>
              {link.description && <div className="text-sm text-gray-600">{link.description}</div>}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  className="px-2 py-1 rounded border"
                  onClick={() => navigator.clipboard?.writeText(`${shareBase}/${link.slug}`)}
                >
                  Copy link
                </button>
                <button type="button" className="px-2 py-1 rounded border" onClick={() => openEdit(link)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded border text-red-600"
                  onClick={() => handleDelete(link)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No share links yet.</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-xl space-y-4">
            <div className="text-lg font-semibold">{editing ? "Edit share link" : "Create share link"}</div>
            <div className="grid gap-3">
              <input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                className="rounded-md border px-3 py-2 text-sm"
                placeholder="slug"
              />
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-md border px-3 py-2 text-sm"
                placeholder="Title"
              />
              <input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-md border px-3 py-2 text-sm"
                placeholder="Description"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={form.theme}
                  onChange={(e) => setForm((prev) => ({ ...prev, theme: e.target.value }))}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  {THEME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                />
                Set as primary
              </label>
              <label className="text-sm font-semibold">Sections</label>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                {SECTION_KEYS.map((section) => (
                  <label key={section.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.sections[section.id]}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          sections: { ...prev.sections, [section.id]: e.target.checked },
                        }))
                      }
                    />
                    {section.label}
                  </label>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold">Expires at (optional)</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded-md border" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="button" className="px-3 py-2 rounded-md bg-brand-600 text-white" onClick={handleSave}>
                Save link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
