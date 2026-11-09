import { prisma } from "@/lib/db";
import { NewPageForm } from "@/components/admin/NewPageForm";

export default async function NewPage({ searchParams }: { searchParams: { client?: string } }) {
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">New page</h1>
      <NewPageForm clients={clients} defaultClient={searchParams.client} />
    </div>
  );
}
