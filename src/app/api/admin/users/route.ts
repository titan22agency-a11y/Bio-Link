import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { audit, handle, HttpError, requireStaff } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  await requireStaff();
  const role = new URL(req.url).searchParams.get("role");
  const users = await prisma.user.findMany({
    where: role === "CLIENT" || role === "SUPPORT" || role === "ADMIN" ? { role } : {},
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, company: true, phone: true, canLogin: true, createdAt: true,
      subscription: { select: { plan: true, status: true } }, _count: { select: { ownedPages: true } } },
  });
  return NextResponse.json({ users });
});

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["ADMIN", "SUPPORT", "CLIENT"]).default("CLIENT"),
  password: z.string().min(10).max(200).optional(),
  company: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  plan: z.enum(["FREE", "PRO", "BUSINESS"]).default("FREE"),
});

export const POST = handle(async (req: Request) => {
  const actor = await requireStaff();
  const body = createSchema.parse(await req.json());
  // Only admins can create staff accounts.
  if (body.role !== "CLIENT" && actor.role !== "ADMIN") throw new HttpError(403, "Only admins can add staff");
  if (body.role !== "CLIENT" && !body.password) throw new HttpError(400, "Staff accounts need a password (min 10 chars)");

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      role: body.role,
      company: body.company,
      phone: body.phone,
      passwordHash: body.password ? await bcrypt.hash(body.password, 12) : null,
      // Phase 1: clients don't log in. Phase 2: flip on via invite/signup.
      canLogin: body.role !== "CLIENT" || !!body.password,
      subscription: body.role === "CLIENT" ? { create: { plan: body.plan, provider: "MANUAL" } } : undefined,
    },
    select: { id: true, email: true, name: true, role: true },
  });
  await audit(actor.id, "user.create", user.id, { role: user.role });
  return NextResponse.json({ user }, { status: 201 });
});
