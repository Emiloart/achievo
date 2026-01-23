"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { Modal } from "../../ui/Modal";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Input,
  Select,
  StatusBadge,
  Textarea,
  uiToast,
} from "../../ui";
import { EmptyState } from "../../states/EmptyState";

export type ProjectShareLink = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  visibility: string;
  theme: string;
  sections: Record<string, boolean>;
  isPrimary: boolean;
};

export type ShareLinkPayload = {
  slug: string;
  title: string;
  description?: string | null;
  visibility: string;
  theme: string;
  sections: Record<string, boolean>;
  isPrimary: boolean;
};

const SECTION_LABELS: Record<string, string> = {
  summary: "Summary",
  goals: "Goals",
  activity: "Activity",
  team: "Team",
  clientNotes: "Client notes",
};

const VISIBILITY_OPTIONS = ["PUBLIC", "UNLISTED", "DISABLED"] as const;
const THEME_OPTIONS = ["AUTO", "LIGHT", "DARK"] as const;

export type ProjectShareLinksManagerProps = {
  links: ProjectShareLink[];
  onCreate: (payload: ShareLinkPayload) => Promise<void>;
  onUpdate: (id: string, payload: ShareLinkPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function ProjectShareLinksManager({ links, onCreate, onUpdate, onDelete }: ProjectShareLinksManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProjectShareLink | null>(null);
  const [confirming, setConfirming] = useState<ProjectShareLink | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ShareLinkPayload>({
    slug: "",
    title: "",
    description: "",
    visibility: "UNLISTED",
    theme: "AUTO",
    isPrimary: false,
    sections: {
      summary: true,
      goals: true,
      activity: true,
      team: true,
      clientNotes: true,
    },
  });

  const shareBase = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/projects/share`;
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
      sections: {
        summary: true,
        goals: true,
        activity: true,
        team: true,
        clientNotes: true,
      },
    });
    setShowModal(true);
  };

  const openEdit = (link: ProjectShareLink) => {
    setEditing(link);
    setForm({
      slug: link.slug,
      title: link.title,
      description: link.description || "",
      visibility: link.visibility,
      theme: link.theme,
      isPrimary: Boolean(link.isPrimary),
      sections: { ...link.sections },
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      slug: form.slug.trim().toLowerCase(),
      title: form.title.trim(),
      description: form.description?.trim() || null,
      visibility: form.visibility,
      theme: form.theme,
      isPrimary: form.isPrimary,
      sections: form.sections,
    } satisfies ShareLinkPayload;

    setSaving(true);
    try {
      if (editing) {
        await onUpdate(editing.id, payload);
        uiToast.success("Share link updated");
      } else {
        await onCreate(payload);
        uiToast.success("Share link created");
      }
      setShowModal(false);
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to save share link");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirming) return;
    setSaving(true);
    try {
      await onDelete(confirming.id);
      uiToast.success("Share link revoked");
      setConfirming(null);
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to revoke share link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-semibold">Share links</div>
          <div className="text-sm text-textMuted">Control public access to project summaries.</div>
        </div>
        <Button type="button" onClick={openCreate}>
          Create share link
        </Button>
      </div>

      {links.length ? (
        <div className="space-y-3">
          {links.map((link) => {
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
                    {link.isPrimary ? <StatusBadge tone="info">primary</StatusBadge> : null}
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {link.description ? <div className="text-sm text-textMuted">{link.description}</div> : null}
                  <div className="text-xs text-textMuted">Share link: {shareUrl}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(link)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(link)}>
                      Revoke
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          void navigator.clipboard.writeText(shareUrl);
                        }
                      }}
                    >
                      Copy link
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
          description="Create a share link to expose selected project sections."
          primaryAction={{ label: "Create share link", onClick: openCreate }}
        />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit share link" : "Create share link"}
      >
        <div className="space-y-4">
          <Input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase() }))}
            placeholder="Slug"
          />
          <Input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Title"
          />
          <Textarea
            value={form.description ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            placeholder="Description"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              value={form.visibility}
              onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Select
              value={form.theme}
              onChange={(event) => setForm((prev) => ({ ...prev, theme: event.target.value }))}
            >
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
              onChange={(event) => setForm((prev) => ({ ...prev, isPrimary: event.target.checked }))}
            />
            Primary link
          </label>
          <div className="space-y-2">
            <div className="text-sm font-semibold">Sections</div>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              {Object.entries(form.sections).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={value}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        sections: { ...prev.sections, [key]: event.target.checked },
                      }))
                    }
                  />
                  {SECTION_LABELS[key] || key}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
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
