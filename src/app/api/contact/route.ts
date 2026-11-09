import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeContent } from "@/lib/blocks";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  pageId: z.string().min(1).max(40),
  blockId: z.string().max(64).optional(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(3000),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  if (!rateLimit(`c:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many messages, try later." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const body = parsed.data;
  if (body.website) return NextResponse.json({ ok: true }); // bot: pretend success

  const page = await prisma.page.findFirst({ where: { id: body.pageId, status: "PUBLISHED" }, select: { id: true, published: true } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // The page must actually contain a contact form.
  const hasForm = normalizeContent(page.published).blocks.some((b) => b.type === "contact");
  if (!hasForm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contactSubmission.create({
    data: { pageId: page.id, blockId: body.blockId, name: body.name, email: body.email, phone: body.phone || null, message: body.message },
  });
  // TODO(phase 2): email the page owner (Resend/SMTP) when notifications are enabled.
  return NextResponse.json({ ok: true });
}
