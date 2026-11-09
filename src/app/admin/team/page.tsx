import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DeleteUser, UserForm } from "@/components/admin/UserForm";

export default async function Team() {
  const me = await getSessionUser();
  if (me?.role !== "ADMIN") redirect("/admin");
  const staff = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPPORT"] } }, orderBy: { createdAt: "asc" } });

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Team</h1>
      <UserForm role="STAFF" />
      <div className="rounded-xl border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-100">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-3 text-sm">
              <span><span className="font-medium">{s.name}</span> <span className="text-stone-500">{s.email}</span></span>
              <span className="flex items-center gap-3">
                <span className="rounded bg-stone-100 px-2 py-0.5 text-xs">{s.role}</span>
                {s.id !== me.id && <DeleteUser userId={s.id} label={s.email} />}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
