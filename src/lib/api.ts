import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { ZodError } from "zod";
import { getSessionUser, type SessionUser } from "./auth";
import { prisma } from "./db";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Throws 401/403 unless the caller has one of the roles. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Not signed in");
  if (roles.length && !roles.includes(user.role)) throw new HttpError(403, "Forbidden");
  return user;
}

export const requireStaff = () => requireRole("ADMIN", "SUPPORT");

/**
 * Page access rule shared by every page endpoint:
 * staff can touch any page; a CLIENT only their own (Phase 2).
 */
export async function loadPageFor(user: SessionUser, pageId: string) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { owner: { select: { id: true, email: true, name: true, subscription: { select: { plan: true } } } } },
  });
  if (!page) throw new HttpError(404, "Page not found");
  if (user.role === "CLIENT" && page.ownerId !== user.id) throw new HttpError(403, "Forbidden");
  return page;
}

/** Wrap a route handler: converts thrown errors into JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input", details: e.flatten() }, { status: 400 });
      if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002")
        return NextResponse.json({ error: "Already taken (slug, domain or email)" }, { status: 409 });
      console.error(e);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  };
}

export async function audit(userId: string | null, action: string, entityId?: string, meta?: object) {
  await prisma.auditLog.create({ data: { userId, action, entityId, meta: meta as object | undefined } }).catch(() => {});
}
