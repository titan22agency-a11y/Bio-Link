import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Multi-tenant routing.
 *
 *   ourdomain.com/<slug>          -> app/[site]  (served directly, no rewrite)
 *   <slug>.ourdomain.com/         -> rewrite to /<slug>
 *   links.clientbrand.com/        -> rewrite to /links.clientbrand.com
 *                                    (app/[site] treats a value with a dot as a custom domain)
 *
 * Only "/" is rewritten on tenant hosts; /api/* and /_next/* pass through so
 * analytics and contact forms work on every host.
 *
 * Also guards /admin with the NextAuth JWT.
 */
const ROOT = (process.env.ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
const RESERVED = new Set(
  (process.env.RESERVED_SUBDOMAINS ?? "www,admin,app,api,static,cdn,mail").split(",").map((s) => s.trim()),
);

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const hostNoPort = host.split(":")[0];
  const rootNoPort = ROOT.split(":")[0];

  const isRoot = hostNoPort === rootNoPort || hostNoPort === `www.${rootNoPort}` || hostNoPort === "127.0.0.1";
  const isSub = !isRoot && hostNoPort.endsWith(`.${rootNoPort}`);

  if (!isRoot) {
    // Tenant hosts only expose the page itself plus public APIs/assets.
    if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL(url.pathname, `${url.protocol}//${ROOT}`));
    }
    if (url.pathname === "/") {
      const site = isSub ? hostNoPort.slice(0, -(rootNoPort.length + 1)) : hostNoPort;
      if (isSub && (RESERVED.has(site) || site.includes("."))) return NextResponse.next();
      return NextResponse.rewrite(new URL(`/${site}`, req.url));
    }
    return NextResponse.next();
  }

  if (url.pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(login);
    }
    // Phase 1: the dashboard is staff-only. Phase 2: open /admin/pages to CLIENT
    // (API routes already scope CLIENT users to their own pages).
    if (token.role !== "ADMIN" && token.role !== "SUPPORT") {
      return NextResponse.redirect(new URL("/login?error=forbidden", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  // Skip static files and Next internals.
  matcher: ["/((?!_next/|uploads/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
