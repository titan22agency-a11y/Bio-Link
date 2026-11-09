import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { applySubscription, markEvent, recordEvent, timingSafeEqualHex } from "@/lib/billing";
import type { Plan, SubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * Stripe webhook (Phase 2). Verifies the `Stripe-Signature` header manually
 * (HMAC-SHA256 over "<t>.<raw body>") so no SDK is needed yet.
 * When checkout ships, add `stripe` and use stripe.webhooks.constructEvent.
 *
 * Expected: Checkout Session created with client_reference_id = user id and
 * subscription metadata { userId, plan }.
 */
function verify(raw: string, header: string | null, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return sigs.some((s) => timingSafeEqualHex(s, expected));
}

const STATUS: Record<string, SubscriptionStatus> = {
  trialing: "TRIALING", active: "ACTIVE", past_due: "PAST_DUE", unpaid: "PAST_DUE",
  canceled: "CANCELED", incomplete_expired: "EXPIRED", incomplete: "PAST_DUE", paused: "PAST_DUE",
};

export async function POST(req: Request) {
  if (!env.payments || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Payments disabled" }, { status: 404 });
  const raw = await req.text();
  if (!verify(raw, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as { id: string; type: string; data: { object: Record<string, any> } };
  const rec = await recordEvent("STRIPE", event.id, event.type, event);
  if (!rec) return NextResponse.json({ received: true, duplicate: true });

  try {
    const obj = event.data.object;
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const userId = obj.metadata?.userId as string | undefined;
        const plan = (obj.metadata?.plan as Plan | undefined) ?? "PRO";
        if (!userId) throw new Error("subscription without metadata.userId");
        await applySubscription({
          userId,
          plan: event.type === "customer.subscription.deleted" ? "FREE" : plan,
          status: event.type === "customer.subscription.deleted" ? "CANCELED" : STATUS[obj.status] ?? "PAST_DUE",
          provider: "STRIPE",
          providerCustomerId: obj.customer,
          providerSubId: obj.id,
          currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000) : null,
          cancelAtPeriodEnd: !!obj.cancel_at_period_end,
        });
        break;
      }
      default:
        break; // stored for audit; not acted on
    }
    await markEvent(rec.id);
  } catch (e) {
    await markEvent(rec.id, String(e));
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
