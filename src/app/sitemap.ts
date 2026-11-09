import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

// Rendered per request (cheap query) so builds never need a database.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await prisma.page
    .findMany({ where: { status: "PUBLISHED", noIndex: false }, select: { slug: true, publishedAt: true } })
    .catch(() => []);
  return [
    { url: env.appUrl, changeFrequency: "monthly", priority: 0.5 },
    ...pages.map((p) => ({ url: `${env.appUrl}/${p.slug}`, lastModified: p.publishedAt ?? undefined, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
