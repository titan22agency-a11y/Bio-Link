import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageStats } from "@/lib/analytics";
import { Stat, StatsChart } from "@/components/admin/StatsChart";

export default async function AdminHome() {
  const [pages, published, clients, stats, recent] = await Promise.all([
    prisma.page.count(),
    prisma.page.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    pageStats("all", 30),
    prisma.page.findMany({ orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, slug: true, status: true, updatedAt: true } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <Link href="/admin/pages/new" className="btn-primary">+ New page</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Pages" value={pages} />
        <Stat label="Live" value={published} />
        <Stat label="Clients" value={clients} />
        <Stat label="Views (30d)" value={stats.totals.views.toLocaleString()} />
        <Stat label="Clicks (30d)" value={stats.totals.clicks.toLocaleString()} />
      </div>
      <div className="card"><StatsChart series={stats.series} /></div>
      <div className="card">
        <h2 className="mb-3 font-semibold">Recently edited</h2>
        <ul className="divide-y divide-stone-100">
          {recent.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
              <span className="text-stone-500">/{p.slug} · {p.status.toLowerCase()} · {p.updatedAt.toLocaleDateString()}</span>
            </li>
          ))}
          {!recent.length && <li className="py-2 text-sm text-stone-500">No pages yet.</li>}
        </ul>
      </div>
    </div>
  );
}
