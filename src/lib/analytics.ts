import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";

/**
 * Stats = raw AnalyticsEvent rows (recent days) + DailyStat rollups (older days).
 * scripts/rollup-analytics.ts moves old raw events into DailyStat inside one
 * transaction, so a day is never counted in both places.
 */

export function visitorHash(ip: string, ua: string): string {
  // Salt rotates daily so visitors can't be tracked across days.
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(`${env.analyticsSalt}:${day}:${ip}:${ua}`).digest("hex").slice(0, 32);
}

export function deviceFromUA(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export function isBot(ua: string): boolean {
  return !ua || /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse/i.test(ua);
}

export type DayRow = { date: string; views: number; uniques: number; clicks: number };

export async function pageStats(pageIds: string[] | "all", days: number) {
  const since = new Date(Date.now() - days * 864e5);
  since.setUTCHours(0, 0, 0, 0);
  const pageFilter = pageIds === "all" ? Prisma.empty : Prisma.sql`AND "pageId" IN (${Prisma.join(pageIds.length ? pageIds : [""])})`;

  const raw = await prisma.$queryRaw<{ date: Date; views: bigint; uniques: bigint; clicks: bigint }[]>`
    SELECT date_trunc('day', "createdAt")::date AS date,
           COUNT(*) FILTER (WHERE type = 'VIEW')                        AS views,
           COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'VIEW')     AS uniques,
           COUNT(*) FILTER (WHERE type = 'CLICK')                       AS clicks
    FROM "AnalyticsEvent"
    WHERE "createdAt" >= ${since} ${pageFilter}
    GROUP BY 1`;

  const rolled = await prisma.dailyStat.groupBy({
    by: ["date"],
    where: { date: { gte: since }, ...(pageIds === "all" ? {} : { pageId: { in: pageIds } }) },
    _sum: { views: true, uniques: true, clicks: true },
  });

  const map = new Map<string, DayRow>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    map.set(d, { date: d, views: 0, uniques: 0, clicks: 0 });
  }
  const add = (d: Date, v: number, u: number, c: number) => {
    const row = map.get(d.toISOString().slice(0, 10));
    if (row) { row.views += v; row.uniques += u; row.clicks += c; }
  };
  raw.forEach((r) => add(r.date, Number(r.views), Number(r.uniques), Number(r.clicks)));
  rolled.forEach((r) => add(r.date, r._sum.views ?? 0, r._sum.uniques ?? 0, r._sum.clicks ?? 0));

  const series = [...map.values()];
  const totals = series.reduce((a, r) => ({ views: a.views + r.views, uniques: a.uniques + r.uniques, clicks: a.clicks + r.clicks }), { views: 0, uniques: 0, clicks: 0 });
  return { series, totals, ctr: totals.views ? totals.clicks / totals.views : 0 };
}

export async function topClicks(pageId: string, days: number) {
  const since = new Date(Date.now() - days * 864e5);
  return prisma.analyticsEvent.groupBy({
    by: ["blockId", "target"],
    where: { pageId, type: "CLICK", createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { blockId: "desc" } },
    take: 20,
  });
}

export async function breakdown(pageId: string, days: number, field: "device" | "referrer" | "country") {
  const since = new Date(Date.now() - days * 864e5);
  return prisma.analyticsEvent.groupBy({
    by: [field],
    where: { pageId, type: "VIEW", createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { [field]: "desc" } },
    take: 8,
  });
}
