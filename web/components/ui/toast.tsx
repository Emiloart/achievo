import toast from "react-hot-toast";

export const uiToast = {
  success: (message: string) =>
    toast.success(message, {
      style: { borderRadius: "999px", background: "#1b5c5e", color: "#fff" },
    }),
  error: (message: string) =>
    toast.error(message, {
      style: { borderRadius: "999px", background: "#b42318", color: "#fff" },
    }),
  info: (message: string) =>
    toast(message, {
      style: { borderRadius: "999px", background: "#0f172a", color: "#fff" },
    }),
};
