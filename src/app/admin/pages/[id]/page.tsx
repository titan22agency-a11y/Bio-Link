import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeContent } from "@/lib/blocks";
import { publicPageUrl } from "@/lib/env";
import { Editor } from "@/components/admin/Editor";

export default async function EditPage({ params }: { params: { id: string } }) {
  const page = await prisma.page.findUnique({
    where: { id: params.id },
    include: { owner: { select: { name: true, email: true, subscription: { select: { plan: true } } } } },
  });
  if (!page) notFound();

  const draft = normalizeContent(page.draft);
  const dirtySincePublish = page.status === "PUBLISHED" && JSON.stringify(page.published) !== JSON.stringify(page.draft);

  return (
    <Editor
      initialContent={draft}
      initialMeta={{
        id: page.id,
        slug: page.slug,
        customDomain: page.customDomain ?? "",
        title: page.title,
        status: page.status,
        seoTitle: page.seoTitle ?? "",
        seoDescription: page.seoDescription ?? "",
        ogImage: page.ogImage ?? "",
        noIndex: page.noIndex,
        ownerName: page.owner.name ?? page.owner.email,
        ownerPlan: page.owner.subscription?.plan ?? "FREE",
        publicUrl: publicPageUrl(page.slug, page.customDomain),
        dirtySincePublish,
      }}
    />
  );
}
