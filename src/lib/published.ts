import { cache } from "react";
import { prisma } from "./db";
import { normalizeContent } from "./blocks";
import { SLUG_RE } from "./slug";

/**
 * Look up a published page by slug or custom domain.
 * `site` containing a dot = custom domain (slugs never contain dots).
 * Wrapped in React `cache` so metadata + page share one query per request.
 */
export const getPublishedPage = cache(async (site: string) => {
  const key = decodeURIComponent(site).toLowerCase();
  const isDomain = key.includes(".");
  if (!isDomain && !SLUG_RE.test(key)) return null;
  const page = await prisma.page.findFirst({
    where: { status: "PUBLISHED", ...(isDomain ? { customDomain: key } : { slug: key }) },
    select: {
      id: true, slug: true, customDomain: true, title: true, published: true, publishedAt: true,
      seoTitle: true, seoDescription: true, ogImage: true, noIndex: true,
    },
  });
  if (!page?.published) return null;
  return { ...page, content: normalizeContent(page.published) };
});

/** Paths to revalidate when a page changes (slug route + custom-domain route). */
export function pagePaths(p: { slug: string; customDomain?: string | null }): string[] {
  return [`/${p.slug}`, ...(p.customDomain ? [`/${p.customDomain}`] : [])];
}
