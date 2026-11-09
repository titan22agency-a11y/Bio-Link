import type { FontKey } from "./blocks";

export const FONTS: Record<FontKey, { label: string; family: string; google: string; arabic: boolean }> = {
  inter: { label: "Inter", family: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;600;700", arabic: false },
  poppins: { label: "Poppins", family: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;600;700", arabic: false },
  montserrat: { label: "Montserrat", family: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@400;600;700", arabic: false },
  playfair: { label: "Playfair Display", family: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@400;600;700", arabic: false },
  cairo: { label: "Cairo (Arabic)", family: "'Cairo', system-ui, sans-serif", google: "Cairo:wght@400;600;700", arabic: true },
  tajawal: { label: "Tajawal (Arabic)", family: "'Tajawal', system-ui, sans-serif", google: "Tajawal:wght@400;500;700", arabic: true },
  "noto-kufi": { label: "Noto Kufi Arabic", family: "'Noto Kufi Arabic', system-ui, sans-serif", google: "Noto+Kufi+Arabic:wght@400;600;700", arabic: true },
  "ibm-plex-arabic": { label: "IBM Plex Sans Arabic", family: "'IBM Plex Sans Arabic', system-ui, sans-serif", google: "IBM+Plex+Sans+Arabic:wght@400;600;700", arabic: true },
};

export function googleFontHref(key: FontKey): string {
  return `https://fonts.googleapis.com/css2?family=${FONTS[key].google}&display=swap`;
}
