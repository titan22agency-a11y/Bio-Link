import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { applySubscription, markEvent, parseOrderRef, recordEvent, timingSafeEqualHex } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Fawry server notification (Phase 2).
 * Signature = SHA-256 hex of:
 *   fawryRefNumber + merchantRefNumber + paymentAmount(2dp) + orderAmount(2dp)
 *   + orderStatus + paymentMethod + paymentRefrenceNumber + secureKey
 * ("paymentRefrenceNumber" is Fawry's own spelling.)
 * Confirm against Fawry's current V2 notification docs before going live.
 */
export async function POST(req: Request) {
  const key = process.env.FAWRY_SECURE_KEY;
  if (!env.payments || !key) return NextResponse.json({ error: "Payments disabled" }, { status: 404 });

  const n = (await req.json().catch(() => null)) as Record<string, any> | null;
  if (!n?.fawryRefNumber) return NextResponse.json({ error: "Bad payload" }, { status: 400 });

  const raw = [
    n.fawryRefNumber, n.merchantRefNumber,
    Number(n.paymentAmount).toFixed(2), Number(n.orderAmount).toFixed(2),
    n.orderStatus, n.paymentMethod, n.paymentRefrenceNumber ?? "", key,
  ].join("");
  const expected = crypto.createHash("sha256").update(raw).digest("hex");
  if (!timingSafeEqualHex(String(n.messageSignature ?? "").toLowerCase(), expected)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const rec = await recordEvent("FAWRY", `${n.fawryRefNumber}:${n.orderStatus}`, String(n.orderStatus), n);
  if (!rec) return NextResponse.json({ received: true, duplicate: true });

  try {
    const ref = parseOrderRef(String(n.merchantRefNumber));
    if (ref && n.orderStatus === "PAID") {
      await applySubscription({
        userId: ref.userId, plan: ref.plan, status: "ACTIVE", provider: "FAWRY",
        providerSubId: String(n.fawryRefNumber), currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
      });
    }
    await markEvent(rec.id);
  } catch (e) {
    await markEvent(rec.id, String(e));
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
