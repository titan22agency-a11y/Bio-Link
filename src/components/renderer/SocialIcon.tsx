import type { SocialPlatform } from "@/lib/blocks";

/**
 * Lightweight icons (no icon library, keeps public pages tiny).
 * Swap for brand SVGs (e.g. simple-icons, CC0) if pixel-perfect logos are needed.
 */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const glyph = (text: string) => (
  <text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">
    {text}
  </text>
);

const ICONS: Record<SocialPlatform, JSX.Element> = {
  instagram: (<g {...stroke}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></g>),
  facebook: glyph("f"),
  x: glyph("X"),
  tiktok: (<g {...stroke}><path d="M14 3v11a4 4 0 1 1-4-4" /><path d="M14 3c.5 3 2.5 5 5 5" /></g>),
  youtube: (<g {...stroke}><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" fill="currentColor" /></g>),
  linkedin: glyph("in"),
  snapchat: (<g {...stroke}><path d="M12 3c3 0 5 2.2 5 5v3l2 1-2 1.5c.5 1.5 2 2.5 3 3-2 .5-3 .5-3.5 1.5S14 20 12 20s-3-1-4.5-2-1.5-1-3.5-1.5c1-.5 2.5-1.5 3-3L5 12l2-1V8c0-2.8 2-5 5-5z" /></g>),
  whatsapp: (<g {...stroke}><path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 7.5 19.4z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-1-.5-2-1.5-2.4-2.4l.8-1-1-2z" /></g>),
  telegram: (<g {...stroke}><path d="M21 4 3 11l6 2 2 6 3-4 5 4z" /><path d="m9 13 12-9" /></g>),
  github: (<g {...stroke}><path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" /></g>),
  behance: glyph("Bē"),
  spotify: (<g {...stroke}><circle cx="12" cy="12" r="9" /><path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.6c2.5-.7 5-.4 7 .8M8.5 15.5c2-.5 3.8-.3 5.3.6" /></g>),
  email: (<g {...stroke}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></g>),
  phone: (<g {...stroke}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></g>),
  website: (<g {...stroke}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></g>),
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram", facebook: "Facebook", x: "X", tiktok: "TikTok", youtube: "YouTube",
  linkedin: "LinkedIn", snapchat: "Snapchat", whatsapp: "WhatsApp", telegram: "Telegram",
  github: "GitHub", behance: "Behance", spotify: "Spotify", email: "Email", phone: "Phone", website: "Website",
};

export function SocialIcon({ platform, size = 22 }: { platform: SocialPlatform; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[platform]}
    </svg>
  );
}

/** Turn what support staff type (handle, number, email) into a real link. */
export function socialHref(platform: SocialPlatform, value: string): string {
  const v = value.trim();
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  switch (platform) {
    case "email": return `mailto:${v}`;
    case "phone": return `tel:${v.replace(/[^\d+]/g, "")}`;
    case "whatsapp": return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
    case "instagram": return `https://instagram.com/${handle}`;
    case "tiktok": return `https://www.tiktok.com/@${handle}`;
    case "x": return `https://x.com/${handle}`;
    case "telegram": return `https://t.me/${handle}`;
    case "github": return `https://github.com/${handle}`;
    case "snapchat": return `https://snapchat.com/add/${handle}`;
    case "facebook": return `https://facebook.com/${handle}`;
    case "youtube": return `https://youtube.com/@${handle}`;
    default: return v.includes(".") ? `https://${v}` : v;
  }
}
