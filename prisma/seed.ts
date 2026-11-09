import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultContent, newId } from "../src/lib/blocks";

const prisma = new PrismaClient();

/**
 * Creates the first ADMIN from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD and a
 * published demo page at /demo (Arabic, RTL). Safe to re-run.
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (10+ chars) in .env");
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Admin ready: ${admin.email}`);

  const client = await prisma.user.upsert({
    where: { email: "demo-client@example.com" },
    update: {},
    create: {
      email: "demo-client@example.com", name: "مقهى الياسمين", role: "CLIENT", canLogin: false,
      subscription: { create: { plan: "PRO", provider: "MANUAL" } },
    },
  });

  const content = defaultContent("مقهى الياسمين", "ar");
  content.theme = { ...content.theme, preset: "gold", bgType: "gradient", bgFrom: "#1c1917", bgTo: "#78350f", bgAngle: 180, textColor: "#fde68a", buttonBg: "#fbbf24", buttonFg: "#1c1917", buttonStyle: "filled", buttonRadius: "full" };
  content.blocks = [
    { id: newId(), type: "profile", name: "مقهى الياسمين", subtitle: "قهوة مختصة · القاهرة", avatarUrl: "", avatarShape: "circle", verified: true },
    { id: newId(), type: "social", style: "icons", items: [{ platform: "instagram", url: "@example" }, { platform: "whatsapp", url: "+201000000000" }, { platform: "tiktok", url: "@example" }] },
    { id: newId(), type: "button", label: "اطلب الآن", url: "https://example.com/order", sublabel: "توصيل خلال ٣٠ دقيقة", thumbnailUrl: "", highlight: "pulse", openInNewTab: true, bg: "", fg: "" },
    { id: newId(), type: "button", label: "قائمة الطعام", url: "https://example.com/menu", sublabel: "", thumbnailUrl: "", highlight: "none", openInNewTab: true, bg: "", fg: "" },
    { id: newId(), type: "text", text: "نفتح يوميًا من ٨ صباحًا حتى منتصف الليل.", align: "center" },
    { id: newId(), type: "contact", title: "تواصل معنا", askPhone: true, submitLabel: "إرسال", successMessage: "شكرًا! سنرد عليك قريبًا." },
  ];

  await prisma.page.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo", title: "Demo – Yasmine Café", ownerId: client.id, lastEditorId: admin.id,
      draft: content, published: content, status: "PUBLISHED", publishedAt: new Date(),
    },
  });
  console.log("Demo page ready at /demo");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
