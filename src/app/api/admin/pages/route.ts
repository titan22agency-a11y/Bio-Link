import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit, handle, HttpError, requireRole } from "@/lib/api";
import { defaultContent } from "@/lib/blocks";
import { validateSlug } from "@/lib/slug";
import { PLAN_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** List pages. Staff see all; a CLIENT sees only their own (Phase 2). */
export const GET = handle(async (req: Request) => {
  const user = await requireRole("ADMIN", "SUPPORT", "CLIENT");
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const pages = await prisma.page.findMany({
    where: {
      ...(user.role === "CLIENT" ? { ownerId: user.id } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, customDomain: true, updatedAt: true, owner: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ pages });
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase(),
  lang: z.enum(["en", "ar"]).default("en"),
  ownerId: z.string().optional(),
  // Create a new client on the fly (Phase 1 onboarding).
  newClient: z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().toLowerCase().email() }).optional(),
});

export const POST = handle(async (req: Request) => {
  const user = await requireRole("ADMIN", "SUPPORT", "CLIENT");
  const body = createSchema.parse(await req.json());
  const slugErr = validateSlug(body.slug);
  if (slugErr) throw new HttpError(400, slugErr);

  let ownerId: string;
  if (user.role === "CLIENT") {
    ownerId = user.id;
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    const count = await prisma.page.count({ where: { ownerId } });
    if (count >= PLAN_LIMITS[sub?.plan ?? "FREE"].maxPages) throw new HttpError(402, "Page limit reached for your plan");
  } else if (body.newClient) {
    const client = await prisma.user.create({
      data: { ...body.newClient, role: "CLIENT", canLogin: false, subscription: { create: { plan: "FREE", provider: "MANUAL" } } },
    });
    ownerId = client.id;
    await audit(user.id, "client.create", client.id);
  } else if (body.ownerId) {
    ownerId = body.ownerId;
  } else {
    throw new HttpError(400, "Choose a client or create one");
  }

  const page = await prisma.page.create({
    data: {
      title: body.title,
      slug: body.slug,
      ownerId,
      lastEditorId: user.id,
      draft: defaultContent(body.newClient?.name ?? body.title, body.lang),
    },
  });
  await audit(user.id, "page.create", page.id, { slug: page.slug });
  return NextResponse.json({ page }, { status: 201 });
});
