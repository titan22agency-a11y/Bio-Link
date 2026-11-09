import { z } from "zod";
import { prisma } from "@/lib/db";
import { deviceFromUA, isBot, visitorHash } from "@/lib/analytics";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  pageId: z.string().min(1).max(40),
  type: z.enum(["VIEW", "CLICK"]),
  blockId: z.string().max(80).optional(),
  target: z.string().max(2048).nullish(),
  referrer: z.string().max(2048).nullish(),
});

function refHost(ref?: string | null): string | null {
  if (!ref) return null;
  try { return new URL(ref).hostname.replace(/^www\./, "").slice(0, 120); } catch { return null; }
}

/** Beacon endpoint. Always answers 204 so it never leaks info or breaks pages. */
export async function POST(req: Request) {
  const ok = new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return ok;
  const ip = clientIp(req);
  if (!rateLimit(`t:${ip}`, 120, 60_000)) return ok;

  let body: z.infer<typeof schema>;
  try { body = schema.parse(JSON.parse(await req.text())); } catch { return ok; }

  // Only count events for pages that are live.
  const page = await prisma.page.findFirst({ where: { id: body.pageId, status: "PUBLISHED" }, select: { id: true } });
  if (!page) return ok;

  await prisma.analyticsEvent.create({
    data: {
      pageId: page.id,
      type: body.type,
      blockId: body.type === "CLICK" ? body.blockId : null,
      target: body.type === "CLICK" ? body.target?.slice(0, 2048) : null,
      visitorId: visitorHash(ip, ua),
      referrer: body.type === "VIEW" ? refHost(body.referrer) : null,
      // Set by Cloudflare or by Nginx GeoIP if configured.
      country: req.headers.get("cf-ipcountry") ?? req.headers.get("x-country-code"),
      device: deviceFromUA(ua),
    },
  }).catch(() => {});
  return ok;
}
