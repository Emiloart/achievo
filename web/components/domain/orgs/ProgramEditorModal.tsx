"use client";

import type { ReactNode } from "react";
import { Button, Input, Textarea } from "../../ui";
import { Modal } from "../../ui/Modal";
import { UI_LABELS } from "../../../lib/uiCopy";

export type ProgramFormState = {
  slug: string;
  title: string;
  summary: string;
};

export type ProgramEditorModalProps = {
  open: boolean;
  mode: "create" | "edit";
  value: ProgramFormState;
  onChange: (value: ProgramFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving?: boolean;
  footerNote?: ReactNode;
};

export function ProgramEditorModal({
  open,
  mode,
  value,
  onChange,
  onClose,
  onSubmit,
  saving,
  footerNote,
}: ProgramEditorModalProps) {
  const isEdit = mode === "edit";
  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit program" : "Create program"}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-textMuted">Slug</label>
          <Input
            value={value.slug}
            onChange={(event) => onChange({ ...value, slug: event.target.value })}
            placeholder="program-slug"
            disabled={isEdit}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-textMuted">Title</label>
          <Input
            value={value.title}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
            placeholder="Program title"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-textMuted">Summary</label>
          <Textarea
            value={value.summary}
            onChange={(event) => onChange({ ...value, summary: event.target.value })}
            rows={4}
            placeholder="Short summary for reviewers"
          />
        </div>
        {footerNote ? <div className="text-xs text-textMuted">{footerNote}</div> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving}>
            {saving ? "Saving..." : isEdit ? UI_LABELS.saveChanges : UI_LABELS.createProgram}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
