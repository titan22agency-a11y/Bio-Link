import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handle, requireStaff } from "@/lib/api";

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireStaff();
  const { read } = (await req.json()) as { read?: boolean };
  await prisma.contactSubmission.update({ where: { id: params.id }, data: { read: !!read } });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  await requireStaff();
  await prisma.contactSubmission.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
