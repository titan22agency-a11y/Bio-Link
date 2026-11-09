import type { Theme } from "./blocks";

/** Theme presets. `pro: true` presets are gated by plan (see lib/plans.ts). */
export const THEME_PRESETS: { key: string; label: string; pro: boolean; theme: Partial<Theme> }[] = [
  { key: "stone", label: "Stone", pro: false, theme: { bgType: "solid", bgColor: "#f5f5f4", textColor: "#1c1917", buttonBg: "#1c1917", buttonFg: "#ffffff", buttonStyle: "filled", buttonRadius: "lg" } },
  { key: "midnight", label: "Midnight", pro: false, theme: { bgType: "solid", bgColor: "#0f172a", textColor: "#f8fafc", buttonBg: "#f8fafc", buttonFg: "#0f172a", buttonStyle: "outline", buttonRadius: "full" } },
  { key: "sunset", label: "Sunset", pro: true, theme: { bgType: "gradient", bgFrom: "#f97316", bgTo: "#db2777", bgAngle: 135, textColor: "#ffffff", buttonBg: "#ffffff", buttonFg: "#9d174d", buttonStyle: "filled", buttonRadius: "full" } },
  { key: "ocean", label: "Ocean", pro: true, theme: { bgType: "gradient", bgFrom: "#0ea5e9", bgTo: "#1e3a8a", bgAngle: 160, textColor: "#ffffff", buttonBg: "#ffffff", buttonFg: "#1e3a8a", buttonStyle: "soft", buttonRadius: "lg" } },
  { key: "forest", label: "Forest", pro: true, theme: { bgType: "solid", bgColor: "#14532d", textColor: "#ecfdf5", buttonBg: "#bbf7d0", buttonFg: "#14532d", buttonStyle: "shadow", buttonRadius: "md" } },
  { key: "gold", label: "Desert Gold", pro: true, theme: { bgType: "gradient", bgFrom: "#1c1917", bgTo: "#78350f", bgAngle: 180, textColor: "#fde68a", buttonBg: "#fbbf24", buttonFg: "#1c1917", buttonStyle: "filled", buttonRadius: "none" } },
];
