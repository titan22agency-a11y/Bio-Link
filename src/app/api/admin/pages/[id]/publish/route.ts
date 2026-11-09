import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit, handle, HttpError, loadPageFor, requireRole } from "@/lib/api";
import { normalizeContent } from "@/lib/blocks";
import { planViolations } from "@/lib/plans";
import { pagePaths } from "@/lib/published";

type Ctx = { params: { id: string } };

/** Publish: copy draft -> published snapshot and purge the ISR cache. */
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireRole("ADMIN", "SUPPORT", "CLIENT");
  const page = await loadPageFor(user, params.id);
  const content = normalizeContent(page.draft);

  if (user.role === "CLIENT") {
    const v = planViolations(page.owner.subscription?.plan ?? "FREE", content, page.customDomain);
    if (v.length) throw new HttpError(402, "Upgrade required", v);
  }

  await prisma.page.update({
    where: { id: page.id },
    data: { published: content, status: "PUBLISHED", publishedAt: new Date(), lastEditorId: user.id },
  });
  for (const p of pagePaths(page)) revalidatePath(p);
  await audit(user.id, "page.publish", page.id);
  return NextResponse.json({ ok: true });
});

/** Unpublish: page returns 404 publicly; draft is kept. */
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireRole("ADMIN", "SUPPORT", "CLIENT");
  const page = await loadPageFor(user, params.id);
  await prisma.page.update({ where: { id: page.id }, data: { status: "DRAFT" } });
  for (const p of pagePaths(page)) revalidatePath(p);
  await audit(user.id, "page.unpublish", page.id);
  return NextResponse.json({ ok: true });
});
