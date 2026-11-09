import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { applySubscription, markEvent, parseOrderRef, recordEvent, timingSafeEqualHex } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Paymob "transaction processed" callback (Phase 2).
 * HMAC-SHA512 over these fields concatenated in this fixed order, keyed with
 * PAYMOB_HMAC_SECRET; Paymob sends the result as ?hmac=...
 * Confirm the field list against Paymob's current docs before going live.
 */
const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id",
  "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
  "is_voided", "order.id", "owner", "pending", "source_data.pan", "source_data.sub_type",
  "source_data.type", "success",
];

const get = (o: any, path: string) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), o);

export async function POST(req: Request) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!env.payments || !secret) return NextResponse.json({ error: "Payments disabled" }, { status: 404 });

  const hmac = new URL(req.url).searchParams.get("hmac") ?? "";
  const body = (await req.json().catch(() => null)) as { type?: string; obj?: any } | null;
  const obj = body?.obj;
  if (!obj) return NextResponse.json({ error: "Bad payload" }, { status: 400 });

  const concatenated = HMAC_FIELDS.map((f) => String(get(obj, f) ?? "")).join("");
  const expected = crypto.createHmac("sha512", secret).update(concatenated).digest("hex");
  if (!timingSafeEqualHex(hmac.toLowerCase(), expected)) return NextResponse.json({ error: "Bad signature" }, { status: 400 });

  const rec = await recordEvent("PAYMOB", String(obj.id), body?.type ?? "TRANSACTION", body);
  if (!rec) return NextResponse.json({ received: true, duplicate: true });

  try {
    const ref = parseOrderRef(String(obj.order?.merchant_order_id ?? ""));
    if (obj.success === true && !obj.is_refunded && !obj.is_voided && ref) {
      // One-off payment = 30 days of the plan. Recurring billing needs Paymob subscriptions.
      await applySubscription({
        userId: ref.userId, plan: ref.plan, status: "ACTIVE", provider: "PAYMOB",
        providerSubId: String(obj.order?.id ?? ""), currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
      });
    }
    await markEvent(rec.id);
  } catch (e) {
    await markEvent(rec.id, String(e));
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
