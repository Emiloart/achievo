"use client";

import { Button, Input, Select, Textarea } from "../../ui";
import { Modal } from "../../ui/Modal";
import { UI_LABELS } from "../../../lib/uiCopy";

export type MilestoneFormState = {
  programId: string;
  order: number;
  title: string;
  description: string;
};

export type ProgramOption = {
  id: string;
  title: string;
};

export type MilestoneEditorModalProps = {
  open: boolean;
  programs: ProgramOption[];
  value: MilestoneFormState;
  onChange: (value: MilestoneFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving?: boolean;
};

export function MilestoneEditorModal({
  open,
  programs,
  value,
  onChange,
  onClose,
  onSubmit,
  saving,
}: MilestoneEditorModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add milestone">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-textMuted">Program</label>
          <Select value={value.programId} onChange={(event) => onChange({ ...value, programId: event.target.value })}>
            <option value="" disabled>
              Select program
            </option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-textMuted">Order</label>
            <Input
              type="number"
              min={0}
              value={value.order}
              onChange={(event) =>
                onChange({
                  ...value,
                  order: Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0,
                })
              }
              placeholder="1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-textMuted">Title</label>
            <Input
              value={value.title}
              onChange={(event) => onChange({ ...value, title: event.target.value })}
              placeholder="Milestone title"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-textMuted">Description</label>
          <Textarea
            value={value.description}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            rows={4}
            placeholder="Describe the outcome required for approval"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving || !value.programId}>
            {saving ? "Saving..." : `${UI_LABELS.add} milestone`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
