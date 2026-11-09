import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { handle, HttpError, requireRole } from "@/lib/api";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// Detect type from magic bytes, never trust the client-provided MIME type.
function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  if (buf.subarray(0, 4).toString() === "GIF8") return "gif";
  return null;
}

/**
 * Stores images on local disk under UPLOAD_DIR/<yyyy-mm>/<hash>.<ext>.
 * Nginx serves /uploads directly. Swap this for S3/R2 later without touching
 * the builder (it only needs the returned URL).
 */
export const POST = handle(async (req: Request) => {
  await requireRole("ADMIN", "SUPPORT", "CLIENT");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file");
  if (file.size > env.uploadMaxMb * 1024 * 1024) throw new HttpError(413, `Max ${env.uploadMaxMb} MB`);

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw new HttpError(415, "Only JPG, PNG, WEBP or GIF");

  const month = new Date().toISOString().slice(0, 7);
  const name = `${crypto.createHash("sha256").update(buf).digest("hex").slice(0, 24)}.${ext}`;
  const dir = path.join(env.uploadDir, month);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: `/uploads/${month}/${name}` }, { status: 201 });
});
