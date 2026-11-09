import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { defaultContent } from "@/lib/blocks";
import { validateSlug } from "@/lib/slug";
import { clientIp, rateLimit } from "@/lib/ratelimit";

/**
 * Phase 2 self-registration. Disabled until SELF_SIGNUP_ENABLED=true.
 * Creates a CLIENT on the FREE plan with one draft page.
 * Before launch: add email verification and a CAPTCHA (e.g. Turnstile).
 */
const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
  slug: z.string().trim().toLowerCase(),
  lang: z.enum(["en", "ar"]).default("en"),
});

export async function POST(req: Request) {
  if (!env.selfSignup) return NextResponse.json({ error: "Signup is not open yet" }, { status: 404 });
  if (!rateLimit(`s:${clientIp(req)}`, 5, 60 * 60_000)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;
  const slugErr = validateSlug(b.slug);
  if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 });

  try {
    const user = await prisma.user.create({
      data: {
        name: b.name, email: b.email, role: "CLIENT", canLogin: true,
        passwordHash: await bcrypt.hash(b.password, 12),
        subscription: { create: { plan: "FREE", status: "ACTIVE", provider: "MANUAL" } },
        ownedPages: { create: { slug: b.slug, title: b.name, draft: defaultContent(b.name, b.lang) } },
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email or page name already taken" }, { status: 409 });
  }
}
