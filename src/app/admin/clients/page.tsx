import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DeleteUser, PlanSelect, UserForm } from "@/components/admin/UserForm";

export default async function Clients() {
  const me = await getSessionUser();
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    include: { subscription: true, ownedPages: { select: { id: true, slug: true, status: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <UserForm role="CLIENT" />
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr><th className="p-3">Client</th><th className="p-3">Contact</th><th className="p-3">Plan</th><th className="p-3">Pages</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-medium">{c.name}<div className="text-xs font-normal text-stone-500">{c.company}</div></td>
                <td className="p-3">{c.email}<div className="text-xs text-stone-500">{c.phone}</div></td>
                <td className="p-3"><PlanSelect userId={c.id} plan={c.subscription?.plan ?? "FREE"} /></td>
                <td className="p-3">
                  {c.ownedPages.map((p) => (
                    <Link key={p.id} href={`/admin/pages/${p.id}`} className="me-2 hover:underline">/{p.slug}{p.status === "PUBLISHED" ? " ●" : ""}</Link>
                  ))}
                  <Link href={`/admin/pages/new?client=${c.id}`} className="text-stone-500 hover:text-stone-900">+ page</Link>
                </td>
                <td className="p-3 text-right">{me?.role === "ADMIN" && <DeleteUser userId={c.id} label={c.name ?? c.email} />}</td>
              </tr>
            ))}
            {!clients.length && <tr><td colSpan={5} className="p-6 text-center text-stone-500">No clients yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
