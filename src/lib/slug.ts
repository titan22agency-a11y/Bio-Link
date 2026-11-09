/** Slugs double as subdomains, so keep them DNS-safe. */
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

// Paths and subdomains the app itself uses. Keep in sync with middleware.ts.
export const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "www", "login", "logout", "signup", "register", "dashboard",
  "uploads", "static", "cdn", "mail", "sites", "_next", "pricing", "billing",
  "settings", "help", "support", "terms", "privacy",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Use 3-40 lowercase letters, numbers or dashes.";
  if (RESERVED_SLUGS.has(slug)) return "This name is reserved.";
  return null;
}

export function normalizeDomain(input: string): string | null {
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!d) return null;
  return /^(?=.{4,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(d) ? d : null;
}
