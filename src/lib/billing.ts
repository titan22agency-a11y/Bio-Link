import crypto from "node:crypto";
import type { PaymentProvider, Plan, SubscriptionStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * Phase 2 billing core. Each provider webhook only has to:
 *   1. verify its signature,
 *   2. call recordEvent() (idempotent, returns false on duplicates),
 *   3. map the payload to applySubscription().
 */

export function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && crypto.timingSafeEqual(ba, bb);
}

/** Store the raw event first. Returns null if this event was already handled. */
export async function recordEvent(provider: PaymentProvider, eventId: string, type: string, payload: unknown) {
  try {
    return await prisma.paymentEvent.create({
      data: { provider, eventId, type, payload: payload as Prisma.InputJsonValue },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.paymentEvent.findUnique({ where: { provider_eventId: { provider, eventId } } });
      return existing && !existing.processed ? existing : null; // retry unprocessed, skip done
    }
    throw e;
  }
}

export async function markEvent(id: string, error?: string) {
  await prisma.paymentEvent.update({ where: { id }, data: { processed: !error, error: error ?? null } });
}

export async function applySubscription(input: {
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerCustomerId?: string | null;
  providerSubId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const { userId, ...data } = input;
  await prisma.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

/** Plan a user effectively has right now (expired/canceled => FREE). */
export async function effectivePlan(userId: string): Promise<Plan> {
  const s = await prisma.subscription.findUnique({ where: { userId } });
  if (!s) return "FREE";
  if (s.status === "ACTIVE" || s.status === "TRIALING") return s.plan;
  if (s.status === "PAST_DUE" && s.currentPeriodEnd && s.currentPeriodEnd > new Date()) return s.plan;
  return "FREE";
}

// Merchant order references carry the user id so callbacks can be matched.
export const orderRef = (userId: string, plan: Plan) => `ld_${plan}_${userId}_${Date.now()}`;
export function parseOrderRef(ref: string): { userId: string; plan: Plan } | null {
  const m = /^ld_(FREE|PRO|BUSINESS)_([a-z0-9]+)_\d+$/.exec(ref);
  return m ? { plan: m[1] as Plan, userId: m[2] } : null;
}
