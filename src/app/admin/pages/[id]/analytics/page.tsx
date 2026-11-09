import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { breakdown, pageStats, topClicks } from "@/lib/analytics";
import { normalizeContent, BLOCK_LABELS } from "@/lib/blocks";
import { Stat, StatsChart } from "@/components/admin/StatsChart";

const RANGES = [7, 30, 90] as const;

export default async function PageAnalytics({ params, searchParams }: { params: { id: string }; searchParams: { d?: string } }) {
  const days = RANGES.find((r) => String(r) === searchParams.d) ?? 30;
  const page = await prisma.page.findUnique({ where: { id: params.id }, select: { id: true, title: true, slug: true, draft: true } });
  if (!page) notFound();

  const [stats, clicks, devices, referrers] = await Promise.all([
    pageStats([page.id], days),
    topClicks(page.id, days),
    breakdown(page.id, days, "device"),
    breakdown(page.id, days, "referrer"),
  ]);

  // Map block ids back to human labels.
  const blocks = normalizeContent(page.draft).blocks;
  const labelFor = (blockId: string | null) => {
    if (!blockId) return "—";
    const [id, platform] = blockId.split(":");
    const b = blocks.find((x) => x.id === id);
    if (!b) return "(deleted block)";
    if (platform) return `${BLOCK_LABELS[b.type]}: ${platform}`;
    return b.type === "button" ? b.label : BLOCK_LABELS[b.type];
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/admin/pages/${page.id}`} className="text-sm text-stone-500 hover:text-stone-900">← Builder</Link>
        <h1 className="text-2xl font-semibold">{page.title} <span className="text-base font-normal text-stone-500">/{page.slug}</span></h1>
        <div className="ms-auto flex gap-1">
          {RANGES.map((r) => (
            <Link key={r} href={`?d=${r}`} className={r === days ? "btn-primary" : "btn"}>{r}d</Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Views" value={stats.totals.views.toLocaleString()} />
        <Stat label="Unique visitors" value={stats.totals.uniques.toLocaleString()} />
        <Stat label="Clicks" value={stats.totals.clicks.toLocaleString()} />
        <Stat label="Click-through" value={`${(stats.ctr * 100).toFixed(1)}%`} />
      </div>
      <div className="card"><StatsChart series={stats.series} /></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="mb-3 font-semibold">Top links</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-stone-100">
              {clicks.map((c, i) => (
                <tr key={i}>
                  <td className="py-2">{labelFor(c.blockId)}<div className="max-w-md truncate text-xs text-stone-400">{c.target}</div></td>
                  <td className="py-2 text-right font-medium">{c._count._all}</td>
                </tr>
              ))}
              {!clicks.length && <tr><td className="py-2 text-stone-500">No clicks yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-2 font-semibold">Devices</h2>
            {devices.map((d) => <div key={d.device ?? "?"} className="flex justify-between text-sm"><span>{d.device ?? "unknown"}</span><span>{d._count._all}</span></div>)}
          </div>
          <div className="card">
            <h2 className="mb-2 font-semibold">Referrers</h2>
            {referrers.map((r) => <div key={r.referrer ?? "direct"} className="flex justify-between gap-2 text-sm"><span className="truncate">{r.referrer ?? "direct"}</span><span>{r._count._all}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
