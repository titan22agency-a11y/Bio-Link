import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/renderer/PageRenderer";
import { Tracker } from "@/components/renderer/Tracker";
import { getPublishedPage } from "@/lib/published";
import { googleFontHref } from "@/lib/fonts";
import { env, publicPageUrl } from "@/lib/env";

/**
 * Public client page.
 * Incremental Static Regeneration: first hit renders from the DB and caches;
 * publishing calls revalidatePath() so updates appear instantly. The hourly
 * revalidate is only a safety net.
 */
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // build nothing up front; pages are cached on first request
}

type Params = { params: { site: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await getPublishedPage(params.site);
  if (!page) return { title: "Not found" };
  const profile = page.content.blocks.find((b) => b.type === "profile");
  const bio = page.content.blocks.find((b) => b.type === "text");
  const title = page.seoTitle || (profile?.type === "profile" && profile.name) || page.title;
  const description =
    page.seoDescription ||
    (profile?.type === "profile" && profile.subtitle) ||
    (bio?.type === "text" && bio.text.slice(0, 160)) ||
    `${title} — links`;
  const image = page.ogImage || (profile?.type === "profile" && profile.avatarUrl) || undefined;
  const url = publicPageUrl(page.slug, page.customDomain);
  return {
    metadataBase: new URL(env.appUrl),
    title,
    description,
    alternates: { canonical: url },
    robots: page.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { type: "profile", title, description, url, images: image ? [{ url: image }] : undefined, locale: page.content.lang },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
    icons: image ? { icon: image } : undefined,
  };
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const page = await getPublishedPage(params.site);
  const t = page?.content.theme;
  return { themeColor: t ? (t.bgType === "gradient" ? t.bgFrom : t.bgColor) : undefined, width: "device-width", initialScale: 1 };
}

export default async function SitePage({ params }: Params) {
  const page = await getPublishedPage(params.site);
  if (!page) notFound();

  const profile = page.content.blocks.find((b) => b.type === "profile");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: page.title,
    url: publicPageUrl(page.slug, page.customDomain),
    dateModified: page.publishedAt?.toISOString(),
    mainEntity: profile?.type === "profile" ? { "@type": "Thing", name: profile.name, image: profile.avatarUrl || undefined } : undefined,
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={googleFontHref(page.content.theme.font)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageRenderer content={page.content} pageId={page.id} />
      <Tracker pageId={page.id} />
    </>
  );
}
