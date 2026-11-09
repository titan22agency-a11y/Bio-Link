import type { CSSProperties } from "react";
import { type Block, type PageContent, type Theme, safeHref, toEmbedUrl } from "@/lib/blocks";
import { FONTS } from "@/lib/fonts";
import { ContactForm } from "./ContactForm";
import { PLATFORM_LABELS, SocialIcon, socialHref } from "./SocialIcon";

/**
 * Renders a page from its JSON content. Used by both the public route
 * (server-rendered, cached) and the admin live preview (client).
 * Keep it free of server-only imports.
 */
type Props = { content: PageContent; pageId?: string; preview?: boolean };

const RADIUS: Record<Theme["buttonRadius"], string> = { none: "0px", md: "8px", lg: "14px", full: "9999px" };
const ALIGN = { start: "text-start", center: "text-center", end: "text-end" } as const;
const GAP = { sm: "h-3", md: "h-6", lg: "h-12" } as const;

export function backgroundStyle(t: Theme): CSSProperties {
  if (t.bgType === "gradient") return { background: `linear-gradient(${t.bgAngle}deg, ${t.bgFrom}, ${t.bgTo})` };
  if (t.bgType === "image" && t.bgImage)
    return {
      backgroundColor: t.bgColor,
      backgroundImage: `linear-gradient(rgba(0,0,0,${t.bgOverlay}), rgba(0,0,0,${t.bgOverlay})), url("${t.bgImage.replace(/"/g, "")}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  return { backgroundColor: t.bgColor };
}

function buttonStyle(t: Theme, bg?: string, fg?: string): CSSProperties {
  const b = bg || t.buttonBg;
  const f = fg || t.buttonFg;
  const base: CSSProperties = { borderRadius: RADIUS[t.buttonRadius] };
  switch (t.buttonStyle) {
    case "outline": return { ...base, border: `2px solid ${b}`, color: b, background: "transparent" };
    case "soft": return { ...base, background: `color-mix(in srgb, ${b} 22%, transparent)`, color: t.textColor, backdropFilter: "blur(6px)" };
    case "shadow": return { ...base, background: b, color: f, boxShadow: `4px 4px 0 ${t.textColor}` };
    default: return { ...base, background: b, color: f };
  }
}

const BTN = "block w-full px-5 py-3.5 text-center font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]";

export function PageRenderer({ content, pageId, preview }: Props) {
  const t = content.theme;
  const rtl = content.dir === "rtl";
  return (
    <div
      dir={content.dir}
      lang={content.lang}
      className="min-h-full w-full"
      style={{ ...backgroundStyle(t), color: t.textColor, fontFamily: FONTS[t.font].family }}
    >
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col gap-4 px-5 pb-10 pt-12">
        {content.blocks.map((b) => (
          <BlockView key={b.id} block={b} theme={t} pageId={pageId} preview={preview} rtl={rtl} />
        ))}
        {content.showBranding && (
          <p className="mt-auto pt-8 text-center text-xs opacity-60">
            <a href="/" className="hover:underline">LinkDeck</a>
          </p>
        )}
      </main>
    </div>
  );
}

function BlockView({ block: b, theme: t, pageId, preview, rtl }: { block: Block; theme: Theme; pageId?: string; preview?: boolean; rtl: boolean }) {
  switch (b.type) {
    case "profile": {
      const shape = b.avatarShape === "circle" ? "rounded-full" : b.avatarShape === "rounded" ? "rounded-2xl" : "rounded-none";
      return (
        <header className="flex flex-col items-center gap-2 text-center">
          {b.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.avatarUrl} alt={b.name} width={96} height={96} className={`h-24 w-24 object-cover shadow-md ${shape}`} fetchPriority="high" />
          )}
          {b.name && (
            <h1 className="flex items-center gap-1.5 text-2xl font-bold">
              {b.name}
              {b.verified && (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-label="Verified"><circle cx="12" cy="12" r="10" fill="#3b82f6" /><path d="m8 12 3 3 5-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg>
              )}
            </h1>
          )}
          {b.subtitle && <p className="max-w-sm opacity-80">{b.subtitle}</p>}
        </header>
      );
    }
    case "heading": {
      const size = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[b.size];
      return <h2 className={`font-bold ${size} ${ALIGN[b.align]}`}>{b.text}</h2>;
    }
    case "text":
      return <p className={`whitespace-pre-line leading-relaxed opacity-90 ${ALIGN[b.align]}`}>{b.text}</p>;
    case "button": {
      const href = safeHref(b.url);
      const anim = b.highlight === "pulse" ? "animate-pulse" : b.highlight === "shake" ? "ld-shake" : "";
      const inner = (
        <span className="flex items-center gap-3">
          {b.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.thumbnailUrl} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          )}
          <span className="flex-1">
            <span className="block">{b.label || "Untitled link"}</span>
            {b.sublabel && <span className="block text-xs font-normal opacity-75">{b.sublabel}</span>}
          </span>
          {b.thumbnailUrl && <span className="w-10 shrink-0" />}
        </span>
      );
      if (!href) return <div className={`${BTN} opacity-60`} style={buttonStyle(t, b.bg, b.fg)}>{inner}</div>;
      return (
        <a
          href={href}
          data-track={b.id}
          className={`${BTN} ${anim}`}
          style={buttonStyle(t, b.bg, b.fg)}
          {...(b.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {inner}
        </a>
      );
    }
    case "social": {
      if (!b.items.length) return null;
      return (
        <nav className={`flex flex-wrap justify-center ${b.style === "pills" ? "gap-2" : "gap-4"}`} aria-label="Social links">
          {b.items.map((it, i) => {
            const href = safeHref(socialHref(it.platform, it.url));
            if (!href) return null;
            return b.style === "pills" ? (
              <a key={i} href={href} data-track={`${b.id}:${it.platform}`} target="_blank" rel="noopener noreferrer me"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium" style={buttonStyle(t)}>
                <SocialIcon platform={it.platform} size={16} /> {PLATFORM_LABELS[it.platform]}
              </a>
            ) : (
              <a key={i} href={href} data-track={`${b.id}:${it.platform}`} target="_blank" rel="noopener noreferrer me"
                aria-label={PLATFORM_LABELS[it.platform]} className="transition-transform hover:scale-110">
                <SocialIcon platform={it.platform} size={26} />
              </a>
            );
          })}
        </nav>
      );
    }
    case "video": {
      const src = toEmbedUrl(b.url);
      if (!src) return preview ? <p className="text-center text-sm opacity-60">Paste a YouTube, Vimeo or TikTok link</p> : null;
      return (
        <div className="overflow-hidden rounded-2xl shadow-md" style={{ aspectRatio: src.includes("tiktok") ? "9 / 16" : "16 / 9" }}>
          <iframe
            src={src}
            title={b.title || "Video"}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            className="h-full w-full border-0"
          />
        </div>
      );
    }
    case "image": {
      if (!b.src) return null;
      // eslint-disable-next-line @next/next/no-img-element
      const img = <img src={b.src} alt={b.alt} loading="lazy" className={`w-full object-cover ${b.rounded ? "rounded-2xl" : ""}`} />;
      const href = safeHref(b.href);
      return href ? <a href={href} data-track={b.id} target="_blank" rel="noopener noreferrer">{img}</a> : img;
    }
    case "contact":
      return <ContactForm block={b} pageId={pageId} preview={preview} rtl={rtl} buttonStyle={buttonStyle(t)} buttonClass={BTN} />;
    case "spacer":
      return b.line
        ? <hr className={`${{ sm: "my-1", md: "my-3", lg: "my-6" }[b.size]} border-current opacity-20`} />
        : <div className={GAP[b.size]} />;
  }
}
