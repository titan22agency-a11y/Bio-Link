import { PrismaClient } from "@prisma/client";

/**
 * Moves raw AnalyticsEvent rows older than KEEP_DAYS into DailyStat and deletes
 * them, inside one transaction (a day is never counted twice).
 * Run nightly: see deploy/scripts/crontab.example.
 */
const KEEP_DAYS = Number(process.env.ANALYTICS_RAW_DAYS ?? 30);
const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5);
  cutoff.setUTCHours(0, 0, 0, 0);

  const [inserted, deleted] = await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO "DailyStat" (id, "pageId", date, views, uniques, clicks)
      SELECT md5(random()::text || clock_timestamp()::text), "pageId", date_trunc('day', "createdAt")::date,
             COUNT(*) FILTER (WHERE type = 'VIEW'),
             COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'VIEW'),
             COUNT(*) FILTER (WHERE type = 'CLICK')
      FROM "AnalyticsEvent"
      WHERE "createdAt" < ${cutoff}
      GROUP BY "pageId", date_trunc('day', "createdAt")::date
      ON CONFLICT ("pageId", date) DO UPDATE SET
        views = "DailyStat".views + EXCLUDED.views,
        uniques = "DailyStat".uniques + EXCLUDED.uniques,
        clicks = "DailyStat".clicks + EXCLUDED.clicks`,
    prisma.$executeRaw`DELETE FROM "AnalyticsEvent" WHERE "createdAt" < ${cutoff}`,
  ]);
  console.log(`Rolled up ${inserted} day rows, deleted ${deleted} raw events older than ${cutoff.toISOString()}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
