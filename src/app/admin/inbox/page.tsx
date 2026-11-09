import Link from "next/link";
import { prisma } from "@/lib/db";
import { MarkRead } from "@/components/admin/MarkRead";

export default async function Inbox() {
  const items = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { page: { select: { id: true, title: true, slug: true } } },
  });
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <p className="text-sm text-stone-500">Messages sent through contact-form blocks on client pages.</p>
      <ul className="space-y-3">
        {items.map((m) => (
          <li key={m.id} className={`card ${m.read ? "opacity-70" : "border-stone-400"}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{m.name ?? "Anonymous"}</span>
              {m.email && <a href={`mailto:${m.email}`} className="text-stone-600 hover:underline">{m.email}</a>}
              {m.phone && <a href={`tel:${m.phone}`} className="text-stone-600 hover:underline" dir="ltr">{m.phone}</a>}
              <span className="ms-auto text-xs text-stone-400">{m.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm" dir="auto">{m.message}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
              <Link href={`/admin/pages/${m.page.id}`} className="hover:underline">{m.page.title} (/{m.page.slug})</Link>
              <MarkRead id={m.id} read={m.read} />
            </div>
          </li>
        ))}
        {!items.length && <li className="text-sm text-stone-500">No messages yet.</li>}
      </ul>
    </div>
  );
}
