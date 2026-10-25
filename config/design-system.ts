export const designSystem = {
  fonts: { sans: "var(--font-geist-sans)", mono: "var(--font-geist-mono)" },
  type: { body: "0.9375rem", small: "0.8125rem", heading: "1.875rem", weights: { normal: 400, medium: 500, semibold: 600, bold: 700 } },
  spacing: [4, 8, 12, 16, 24, 32] as const,
  layout: { sidebar: "16rem", sidebarCollapsed: "5rem", content: "80rem", pageGutter: "clamp(1rem, 3vw, 2rem)" },
  radius: { control: "0.375rem", surface: "0.5rem", dialog: "0.625rem" },
  shadow: { surface: "0 1px 3px rgb(0 0 0 / 0.06)" },
  controls: { height: "2.5rem", touchTarget: "2.75rem" },
  themes: {
    light: { background: "#fafafa", surface: "#ffffff", foreground: "#171717", muted: "#737373", border: "#e5e5e5", primary: "#171717", destructive: "#b42318" },
    dark: { background: "#171717", surface: "#202020", foreground: "#f5f5f5", muted: "#a3a3a3", border: "#3a3a3a", primary: "#f5f5f5", destructive: "#f87171" },
  },
  charts: {
    light: {
      series: ["#2563eb", "#d97706", "#059669", "#dc2626"],
      statuses: { present: "#15803d", absent: "#b91c1c", late: "#b45309", excused: "#1d4ed8" },
    },
    dark: {
      series: ["#60a5fa", "#fbbf24", "#34d399", "#f87171"],
      statuses: { present: "#4ade80", absent: "#f87171", late: "#fbbf24", excused: "#93c5fd" },
    },
  },
} as const;
