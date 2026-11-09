import Link from "next/link";
import { prisma } from "@/lib/db";
import { publicPageUrl } from "@/lib/env";

const BADGE: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-stone-200 text-stone-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

export default async function PagesList({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const q = searchParams.q?.trim();
  const status = ["PUBLISHED", "DRAFT", "ARCHIVED"].includes(searchParams.status ?? "") ? (searchParams.status as "PUBLISHED") : undefined;
  const pages = await prisma.page.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q.toLowerCase() } },
        { owner: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } },
      ] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { owner: { select: { name: true, email: true, subscription: { select: { plan: true } } } }, lastEditor: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <form className="ms-auto flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search title, slug, client…" className="input w-64" />
          <select name="status" defaultValue={status ?? ""} className="input w-36">
            <option value="">All</option><option value="PUBLISHED">Live</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option>
          </select>
          <button className="btn">Filter</button>
        </form>
        <Link href="/admin/pages/new" className="btn-primary">+ New page</Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr><th className="p-3">Page</th><th className="p-3">Client</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50">
                <td className="p-3">
                  <Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                  <div className="text-xs text-stone-500">/{p.slug}{p.customDomain ? ` · ${p.customDomain}` : ""}</div>
                </td>
                <td className="p-3">{p.owner.name}<div className="text-xs text-stone-500">{p.owner.email}</div></td>
                <td className="p-3">{p.owner.subscription?.plan ?? "FREE"}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${BADGE[p.status]}`}>{p.status.toLowerCase()}</span></td>
                <td className="p-3 text-stone-500">{p.updatedAt.toLocaleString()}{p.lastEditor?.name ? <div className="text-xs">by {p.lastEditor.name}</div> : null}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  <Link href={`/admin/pages/${p.id}/analytics`} className="me-3 text-stone-500 hover:text-stone-900">Stats</Link>
                  {p.status === "PUBLISHED" && <a href={publicPageUrl(p.slug, p.customDomain)} target="_blank" rel="noreferrer" className="text-stone-500 hover:text-stone-900">Open ↗</a>}
                </td>
              </tr>
            ))}
            {!pages.length && <tr><td colSpan={6} className="p-6 text-center text-stone-500">No pages found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
