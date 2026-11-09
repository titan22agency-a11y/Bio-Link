import { z } from "zod";

/**
 * Page content model shared by the builder, the API and the public renderer.
 * Stored as JSON in Page.draft / Page.published. Bump CONTENT_VERSION and add
 * a migration in `normalizeContent` when the shape changes.
 */
export const CONTENT_VERSION = 1;

const id = z.string().min(1).max(64);
const url = z.string().trim().max(2048);
const color = z.string().trim().max(64);

export const SOCIAL_PLATFORMS = [
  "instagram", "facebook", "x", "tiktok", "youtube", "linkedin", "snapchat",
  "whatsapp", "telegram", "github", "behance", "spotify", "email", "phone", "website",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const profileBlock = z.object({
  id, type: z.literal("profile"),
  avatarUrl: url.default(""),
  name: z.string().max(120).default(""),
  subtitle: z.string().max(200).default(""),
  avatarShape: z.enum(["circle", "rounded", "square"]).default("circle"),
  verified: z.boolean().default(false),
});

export const headingBlock = z.object({
  id, type: z.literal("heading"),
  text: z.string().max(200).default(""),
  size: z.enum(["sm", "md", "lg"]).default("md"),
  align: z.enum(["start", "center", "end"]).default("center"),
});

export const textBlock = z.object({
  id, type: z.literal("text"),
  text: z.string().max(5000).default(""),
  align: z.enum(["start", "center", "end"]).default("center"),
});

export const buttonBlock = z.object({
  id, type: z.literal("button"),
  label: z.string().max(120).default(""),
  url: url.default(""),
  sublabel: z.string().max(160).default(""),
  thumbnailUrl: url.default(""),
  highlight: z.enum(["none", "pulse", "shake"]).default("none"),
  openInNewTab: z.boolean().default(true),
  // Per-button colour override; empty = use theme.
  bg: color.default(""),
  fg: color.default(""),
});

export const socialBlock = z.object({
  id, type: z.literal("social"),
  style: z.enum(["icons", "pills"]).default("icons"),
  items: z.array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url })).max(20).default([]),
});

export const videoBlock = z.object({
  id, type: z.literal("video"),
  url: url.default(""),
  title: z.string().max(200).default(""),
});

export const imageBlock = z.object({
  id, type: z.literal("image"),
  src: url.default(""),
  alt: z.string().max(200).default(""),
  href: url.default(""),
  rounded: z.boolean().default(true),
});

export const contactBlock = z.object({
  id, type: z.literal("contact"),
  title: z.string().max(200).default("Get in touch"),
  askPhone: z.boolean().default(false),
  submitLabel: z.string().max(60).default("Send"),
  successMessage: z.string().max(300).default("Thanks! We'll get back to you soon."),
});

export const spacerBlock = z.object({
  id, type: z.literal("spacer"),
  size: z.enum(["sm", "md", "lg"]).default("md"),
  line: z.boolean().default(false),
});

export const blockSchema = z.discriminatedUnion("type", [
  profileBlock, headingBlock, textBlock, buttonBlock, socialBlock,
  videoBlock, imageBlock, contactBlock, spacerBlock,
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export const FONT_KEYS = [
  "inter", "poppins", "montserrat", "playfair",
  "cairo", "tajawal", "noto-kufi", "ibm-plex-arabic",
] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export const themeSchema = z.object({
  preset: z.string().max(40).default("custom"),
  bgType: z.enum(["solid", "gradient", "image"]).default("solid"),
  bgColor: color.default("#f5f5f4"),
  bgFrom: color.default("#6366f1"),
  bgTo: color.default("#ec4899"),
  bgAngle: z.number().int().min(0).max(360).default(135),
  bgImage: url.default(""),
  bgOverlay: z.number().min(0).max(0.9).default(0.3),
  textColor: color.default("#1c1917"),
  buttonBg: color.default("#1c1917"),
  buttonFg: color.default("#ffffff"),
  buttonStyle: z.enum(["filled", "outline", "soft", "shadow"]).default("filled"),
  buttonRadius: z.enum(["none", "md", "lg", "full"]).default("lg"),
  font: z.enum(FONT_KEYS).default("inter"),
});
export type Theme = z.infer<typeof themeSchema>;

export const contentSchema = z.object({
  version: z.literal(CONTENT_VERSION).default(CONTENT_VERSION),
  dir: z.enum(["ltr", "rtl"]).default("ltr"),
  lang: z.string().max(10).default("en"),
  theme: themeSchema.default({}),
  blocks: z.array(blockSchema).max(100).default([]),
  showBranding: z.boolean().default(true),
});
export type PageContent = z.infer<typeof contentSchema>;

/** Parse untrusted JSON (from DB or API) into a valid PageContent. */
export function normalizeContent(raw: unknown): PageContent {
  const parsed = contentSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : contentSchema.parse({});
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Default values for a freshly inserted block. */
export function createBlock(type: BlockType): Block {
  return blockSchema.parse({ id: newId(), type });
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  profile: "Profile",
  heading: "Heading",
  text: "Bio / Text",
  button: "Link button",
  social: "Social icons",
  video: "Video embed",
  image: "Image",
  contact: "Contact form",
  spacer: "Spacer / Divider",
};

export function defaultContent(name = "", lang: "en" | "ar" = "en"): PageContent {
  const rtl = lang === "ar";
  return contentSchema.parse({
    dir: rtl ? "rtl" : "ltr",
    lang,
    theme: { font: rtl ? "cairo" : "inter" },
    blocks: [
      { id: newId(), type: "profile", name, subtitle: "" },
      { id: newId(), type: "social", items: [] },
      { id: newId(), type: "button", label: rtl ? "زوروا موقعنا" : "Visit our website", url: "https://" },
    ],
  });
}

/** Convert a YouTube / Vimeo / TikTok share URL to an embeddable URL. */
export function toEmbedUrl(input: string): string | null {
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1];
      return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
    }
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "vimeo.com") {
      const v = u.pathname.match(/\/(\d+)/)?.[1];
      return v ? `https://player.vimeo.com/video/${v}` : null;
    }
    if (host === "tiktok.com") {
      const v = u.pathname.match(/\/video\/(\d+)/)?.[1];
      return v ? `https://www.tiktok.com/embed/v2/${v}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Only allow safe link schemes on public pages. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (!h || h === "https://") return null;
  if (/^(https?:|mailto:|tel:|sms:)/i.test(h)) return h;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(h)) return `https://${h}`;
  return null;
}
