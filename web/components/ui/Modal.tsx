"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = root ? getFocusableElements(root) : [];
    (focusables[0] || root)?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      active?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = getFocusableElements(root);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button aria-label="Close modal" className="absolute inset-0 bg-overlay" onClick={onClose} type="button" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={clsx(
          "relative w-full rounded-3xl border border-border bg-surface shadow-float outline-none",
          sizeStyles[size],
        )}
      >
        {title && (
          <div id={titleId} className="border-b border-border px-6 py-4 text-sm font-semibold">
            {title}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

type DrawerProps = Omit<ModalProps, "size"> & { side?: "right" | "bottom" };

export function Drawer({ open, onClose, title, children, side = "right" }: DrawerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = root ? getFocusableElements(root) : [];
    (focusables[0] || root)?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      active?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = getFocusableElements(root);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close drawer" className="absolute inset-0 bg-overlay" onClick={onClose} type="button" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={clsx(
          "absolute bg-surface border border-border shadow-float outline-none",
          side === "right"
            ? "right-0 top-0 h-full w-full max-w-lg rounded-l-3xl"
            : "bottom-0 left-0 w-full max-h-[80vh] rounded-t-3xl",
        )}
      >
        {title && (
          <div id={titleId} className="border-b border-border px-6 py-4 text-sm font-semibold">
            {title}
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function getFocusableElements(root: HTMLElement) {
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
  );
}
