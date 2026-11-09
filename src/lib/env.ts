export const env = {
  rootDomain: (process.env.ROOT_DOMAIN ?? "localhost:3000").toLowerCase(),
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  selfSignup: process.env.SELF_SIGNUP_ENABLED === "true",
  payments: process.env.PAYMENTS_ENABLED === "true",
  uploadDir: process.env.UPLOAD_DIR || `${process.cwd()}/public/uploads`,
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB ?? 5),
  analyticsSalt: process.env.ANALYTICS_SALT ?? "dev-salt",
};

export function publicPageUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}`;
  return `${env.appUrl}/${slug}`;
}
