import toast from "react-hot-toast";

type ToastKind = "success" | "error" | "info";

const styles = {
  success: { borderRadius: "var(--radius-full)", background: "var(--color-accent)", color: "var(--color-on-accent)" },
  error: { borderRadius: "var(--radius-full)", background: "var(--color-danger)", color: "var(--color-on-accent)" },
  info: { borderRadius: "var(--radius-full)", background: "var(--color-info)", color: "var(--color-on-accent)" },
};

const onceRegistry = new Map<string, number>();

function show(kind: ToastKind, message: string, id?: string) {
  const options = { id, style: styles[kind] };
  if (kind === "success") return toast.success(message, options);
  if (kind === "error") return toast.error(message, options);
  return toast(message, options);
}

export function toastGroup(key: string, kind: ToastKind, message: string) {
  return show(kind, message, key);
}

export function toastOnce(key: string, kind: ToastKind, message: string, ttlMs = 5000) {
  const now = Date.now();
  const expiresAt = onceRegistry.get(key) || 0;
  if (expiresAt > now) return;
  onceRegistry.set(key, now + ttlMs);
  return show(kind, message);
}

export const uiToast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
  group: (key: string, kind: ToastKind, message: string) => toastGroup(key, kind, message),
  once: (key: string, kind: ToastKind, message: string, ttlMs?: number) => toastOnce(key, kind, message, ttlMs),
};
