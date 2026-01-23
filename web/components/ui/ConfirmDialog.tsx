"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../packages/ui/src/Button";
import { Input } from "../../../packages/ui/src/Input";
import { Modal } from "./Modal";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmPhrase?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmPhrase = "EXECUTE",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const canConfirm = value.trim() === confirmPhrase;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {description && <p className="text-sm text-textMuted">{description}</p>}
        <div className="space-y-2 text-sm">
          <div className="text-textMuted">Type &quot;{confirmPhrase}&quot; to continue.</div>
          <Input value={value} onChange={(event) => setValue(event.target.value)} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!canConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
