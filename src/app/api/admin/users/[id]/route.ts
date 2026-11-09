import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { audit, handle, HttpError, requireRole, requireStaff } from "@/lib/api";

type Ctx = { params: { id: string } };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  company: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  plan: z.enum(["FREE", "PRO", "BUSINESS"]).optional(),
  canLogin: z.boolean().optional(),
  password: z.string().min(10).max(200).optional(),
  role: z.enum(["ADMIN", "SUPPORT", "CLIENT"]).optional(),
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const actor = await requireStaff();
  const body = patchSchema.parse(await req.json());
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) throw new HttpError(404, "User not found");
  if ((target.role !== "CLIENT" || body.role) && actor.role !== "ADMIN") throw new HttpError(403, "Only admins can change staff");

  const { plan, password, ...rest } = body;
  await prisma.user.update({
    where: { id: target.id },
    data: {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      ...(plan
        ? { subscription: { upsert: { create: { plan, provider: "MANUAL" }, update: { plan } } } }
        : {}),
    },
  });
  await audit(actor.id, "user.update", target.id, { fields: Object.keys(body) });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const actor = await requireRole("ADMIN");
  if (actor.id === params.id) throw new HttpError(400, "You cannot delete yourself");
  await prisma.user.delete({ where: { id: params.id } }); // cascades to pages
  await audit(actor.id, "user.delete", params.id);
  return NextResponse.json({ ok: true });
});
