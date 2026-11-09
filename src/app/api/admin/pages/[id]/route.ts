import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit, handle, HttpError, loadPageFor, requireRole } from "@/lib/api";
import { contentSchema } from "@/lib/blocks";
import { normalizeDomain, validateSlug } from "@/lib/slug";
import { planViolations } from "@/lib/plans";
import { pagePaths } from "@/lib/published";

type Ctx = { params: { id: string } };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireRole("ADMIN", "SUPPORT", "CLIENT");
  const page = await loadPageFor(user, params.id);
  return NextResponse.json({ page });
});

const patchSchema = z.object({
  draft: contentSchema.optional(),
  title: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().toLowerCase().optional(),
  customDomain: z.string().nullable().optional(),
  seoTitle: z.string().max(120).nullable().optional(),
  seoDescription: z.string().max(300).nullable().optional(),
  ogImage: z.string().max(2048).nullable().optional(),
  noIndex: z.boolean().optional(),
  ownerId: z.string().optional(),
});

/** Save draft + page settings. Never touches the live snapshot (see /publish). */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireRole("ADMIN", "SUPPORT", "CLIENT");
  const page = await loadPageFor(user, params.id);
  const body = patchSchema.parse(await req.json());

  if (body.slug !== undefined && body.slug !== page.slug) {
    const err = validateSlug(body.slug);
    if (err) throw new HttpError(400, err);
  }
  let customDomain = page.customDomain;
  if (body.customDomain !== undefined) {
    customDomain = body.customDomain ? normalizeDomain(body.customDomain) : null;
    if (body.customDomain && !customDomain) throw new HttpError(400, "Invalid domain");
  }
  if (body.ownerId && user.role === "CLIENT") throw new HttpError(403, "Forbidden");

  const plan = page.owner.subscription?.plan ?? "FREE";
  const warnings = body.draft ? planViolations(plan, body.draft, customDomain) : [];
  // Phase 2: self-service clients cannot exceed their plan. Staff get warnings only.
  if (user.role === "CLIENT" && warnings.length) throw new HttpError(402, "Upgrade required", warnings);

  const updated = await prisma.page.update({
    where: { id: page.id },
    data: {
      draft: body.draft ?? undefined,
      title: body.title,
      slug: body.slug,
      customDomain,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
      ogImage: body.ogImage,
      noIndex: body.noIndex,
      ownerId: body.ownerId,
      lastEditorId: user.id,
    },
  });

  // Slug/domain/SEO changes affect the live page immediately.
  if (page.status === "PUBLISHED") {
    for (const p of [...pagePaths(page), ...pagePaths(updated)]) revalidatePath(p);
  }
  await audit(user.id, "page.update", page.id);
  return NextResponse.json({ page: { id: updated.id, slug: updated.slug }, warnings });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireRole("ADMIN");
  const page = await loadPageFor(user, params.id);
  await prisma.page.delete({ where: { id: page.id } });
  for (const p of pagePaths(page)) revalidatePath(p);
  await audit(user.id, "page.delete", page.id, { slug: page.slug });
  return NextResponse.json({ ok: true });
});
