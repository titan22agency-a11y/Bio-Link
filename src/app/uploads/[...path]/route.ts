import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

/**
 * Fallback file server for uploads when Nginx is not in front (dev / PM2 only).
 * In production Nginx serves /uploads/ straight from disk and never hits this.
 */
export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const root = path.resolve(env.uploadDir);
  const file = path.resolve(root, ...params.path);
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  const ext = path.extname(file).slice(1).toLowerCase();
  if (!TYPES[ext]) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(file);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": TYPES[ext], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
