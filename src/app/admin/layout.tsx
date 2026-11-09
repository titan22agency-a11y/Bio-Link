import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOut } from "@/components/admin/SignOut";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · LinkDeck", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) redirect("/login");
  const unread = await prisma.contactSubmission.count({ where: { read: false } });

  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/pages", label: "Pages" },
    { href: "/admin/clients", label: "Clients" },
    { href: "/admin/inbox", label: `Inbox${unread ? ` (${unread})` : ""}` },
    ...(user.role === "ADMIN" ? [{ href: "/admin/team", label: "Team" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-900">
      <aside className="hidden w-52 shrink-0 flex-col bg-stone-900 p-4 text-stone-300 md:flex">
        <Link href="/admin" className="mb-6 text-lg font-bold text-white">LinkDeck</Link>
        <nav className="flex flex-col gap-1 text-sm">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-2 py-1.5 hover:bg-stone-800 hover:text-white">{n.label}</Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-stone-800 pt-3 text-xs">
          <div className="truncate text-stone-400">{user.email}</div>
          <div className="text-stone-500">{user.role}</div>
          <SignOut />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="flex gap-3 overflow-x-auto bg-stone-900 px-4 py-2 text-sm text-stone-300 md:hidden">
          {nav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap">{n.label}</Link>)}
        </nav>
        {children}
      </div>
    </div>
  );
}
