"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useShareLinks, type ShareLink } from "../hooks/useShareLinks";
import { EmptyState } from "./states/EmptyState";
import { ErrorState } from "./states/ErrorState";
import { LoadingState } from "./states/LoadingState";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Modal } from "./ui/Modal";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CopyableText,
  Input,
  Select,
  StatusBadge,
  Textarea,
} from "./ui";

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

function formatExpiry(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function isExpired(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

export function ShareLinksManager() {
  const { links, error, state, createLink, updateLink, deleteLink } = useShareLinks();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ShareLink | null>(null);
  const [confirming, setConfirming] = useState<ShareLink | null>(null);
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

  const shareBase = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/s`;
  }, []);

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
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        description: form.description?.trim() || null,
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

  const handleDelete = async () => {
    if (!confirming) return;
    try {
      await deleteLink(confirming.id);
      toast.success("Share link revoked");
      setConfirming(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to revoke share link");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-semibold">Share links</div>
          <div className="text-sm text-textMuted">Create shareable profile links with tailored sections.</div>
        </div>
        <Button type="button" onClick={openCreate}>
          Create share link
        </Button>
      </div>

      {state.status === "loading" ? (
        <LoadingState title="Loading share links" description="Fetching active share tokens." rows={2} />
      ) : state.status === "failed" ? (
        <ErrorState message={error || "Unable to load share links."} />
      ) : links.length ? (
        <div className="space-y-3">
          {links.map((link) => {
            const expired = isExpired(link.expiresAt);
            const shareUrl = `${shareBase}/${link.slug}`;
            return (
              <Card key={link.id}>
                <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold">{link.title}</div>
                    <div className="text-xs text-textMuted">/{link.slug}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <StatusBadge
                      tone={
                        link.visibility === "PUBLIC"
                          ? "success"
                          : link.visibility === "UNLISTED"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {link.visibility.toLowerCase()}
                    </StatusBadge>
                    {expired && <StatusBadge tone="danger">expired</StatusBadge>}
                    {link.isPrimary && <StatusBadge tone="info">primary</StatusBadge>}
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {link.description && <div className="text-sm text-textMuted">{link.description}</div>}
                  <div className="grid gap-2 text-xs text-textMuted">
                    <div>Expires: {formatExpiry(link.expiresAt)}</div>
                    <CopyableText label="Share link" value={shareUrl} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(link)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(link)}>
                      Revoke
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No share links yet"
          description="Create a share link to expose selected profile sections."
          primaryAction={{ label: "Create share link", onClick: openCreate }}
        />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit share link" : "Create share link"}
      >
        <div className="space-y-4">
          <div className="grid gap-3">
            <Input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
              placeholder="slug"
            />
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
            />
            <Textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Description"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={form.visibility}
                onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Select value={form.theme} onChange={(e) => setForm((prev) => ({ ...prev, theme: e.target.value }))}>
                {THEME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.isPrimary}
                onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
              />
              Set as primary
            </label>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Sections</div>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                {SECTION_KEYS.map((section) => (
                  <label key={section.id} className="flex items-center gap-2">
                    <Checkbox
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
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">Expires at (optional)</label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save link
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={handleDelete}
        title="Revoke share link"
        description="This link will stop working immediately. Type REVOKE to confirm."
        confirmPhrase="REVOKE"
        confirmLabel="Revoke"
      />
    </div>
  );
}
