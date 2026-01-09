/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "serif"],
      },
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface-2)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        textMuted: "var(--color-text-muted)",
        accent: {
          DEFAULT: "var(--color-accent)",
          soft: "var(--color-accent-soft)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        status: {
          verified: "var(--status-verified)",
          partial: "var(--status-partial)",
          unverified: "var(--status-unverified)",
          private: "var(--status-private)",
          unlisted: "var(--status-unlisted)",
        },
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#b3d7ff",
          300: "#84beff",
          400: "#4e9dff",
          500: "#1f7fff",
          600: "#0d63e6",
          700: "#0a4eb4",
          800: "#0a4091",
          900: "#0b376f",
        },
      },
      boxShadow: {
        soft: "0 6px 20px -12px rgba(19, 27, 38, 0.25)",
        card: "0 16px 40px -24px rgba(15, 23, 42, 0.35)",
        float: "0 24px 60px -32px rgba(8, 15, 26, 0.45)",
      },
      borderRadius: {
        xl: "1.5rem",
        "2xl": "2rem",
      },
    },
  },
  plugins: [],
};
