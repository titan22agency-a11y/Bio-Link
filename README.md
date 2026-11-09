# LinkDeck — self-hosted bio-link & landing page builder

Phase 1: the support team builds and publishes client pages from an admin dashboard.
Phase 2 (prepared, switched off): self-service signup, plans and payments (Stripe / Paymob / Fawry).

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 14 (App Router) + TypeScript | One codebase for the public pages, admin UI and API. ISR gives static-speed pages with instant updates on publish. |
| DB | PostgreSQL + Prisma | Relational data (users, pages, subscriptions, events) plus JSONB for flexible page content. |
| Auth | NextAuth (JWT sessions, credentials) | Stateless, role claims in the token; Google/email login can be added in Phase 2 without schema changes. |
| Styling | Tailwind CSS | Small CSS output; the public page ships about 89 kB JS on first load. |
| Validation | zod | One schema validates page content in the builder, the API and on render. |
| Hosting | Docker Compose **or** PM2, behind Nginx | Both are included. |

## How it works

```
                ┌──────────── Nginx (TLS, /uploads, rate limits) ────────────┐
 visitor ──▶    │ ourdomain.com/<slug>   <slug>.ourdomain.com   client.com    │
                └───────────────┬──────────────────────────────────────────────┘
                                ▼
                     Next.js  src/middleware.ts
                       • subdomain / custom domain ─rewrite─▶ /[site]
                       • /admin guarded by JWT (ADMIN, SUPPORT)
                                ▼
       /[site] (ISR, cached)          /admin (builder)         /api/*
       PageRenderer + Tracker         Editor + live preview     pages, publish, users,
                                                                upload, track, contact,
                                                                signup*, webhooks*
```

- **Draft vs. published.** `Page.draft` is what the builder edits. **Publish** copies it to `Page.published` and calls `revalidatePath`, so the live page changes right away. Saving a draft never touches the live page.
- **Blocks** (`src/lib/blocks.ts`): profile, heading, bio/text, link button, social icons, video (YouTube/Vimeo/TikTok), image, contact form, spacer/divider.
- **Themes:** solid, gradient or image background; text and button colours; 4 button styles; 4 corner styles; 8 fonts including 4 Arabic fonts; presets (some marked PRO).
- **RTL:** each page has its own `dir` and `lang`. Layout uses logical CSS (`ms-`, `text-start`), so Arabic pages mirror correctly.
- **SEO:** per-page title, description, OG/Twitter image, canonical URL, `noindex`, JSON-LD `ProfilePage`, `sitemap.xml` and `robots.txt`.
- **Analytics:** a small client beacon records views (one per tab session) and clicks on any `data-track` element. Visitor IDs are a salted daily hash of IP + user agent; raw IPs are never stored. Bots are filtered. A nightly script rolls raw events into `DailyStat`.
- **Contact forms:** stored in `ContactSubmission`, shown in **Admin → Inbox**. Protected by a honeypot field and rate limits.

## Roles

| Role | Phase 1 | Phase 2 |
|---|---|---|
| ADMIN | Everything, incl. team management and deletes | same |
| SUPPORT | Create, edit and publish any page; manage clients | same |
| CLIENT | Record only (`canLogin=false`) | Logs in, edits **only own pages**, plan limits enforced |

The API already scopes CLIENT users to their own pages (`loadPageFor` in `src/lib/api.ts`). Plan limits (`src/lib/plans.ts`) are shown to staff as warnings and enforced for CLIENT users.

## Local development

```bash
cp .env.example .env          # set DATABASE_URL, NEXTAUTH_SECRET, SEED_ADMIN_*
npm install
npx prisma migrate deploy     # creates tables
npm run db:seed               # admin user + Arabic demo page at /demo
npm run dev
```

- Admin: http://localhost:3000/login
- Demo page: http://localhost:3000/demo, or http://demo.localhost:3000

For local dev set `ROOT_DOMAIN=localhost:3000` and `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

## Production

See [deploy/README.md](deploy/README.md) for DNS, wildcard SSL, Docker or PM2, Nginx, custom domains, backups and cron.

## Turning on Phase 2

1. Set `SELF_SIGNUP_ENABLED=true`. `POST /api/signup` creates a FREE client with one draft page. Add email verification and a CAPTCHA first.
2. In `src/middleware.ts`, let `CLIENT` into `/admin/pages/*` (the APIs are already scoped).
3. Build a checkout route per provider using `orderRef()` from `src/lib/billing.ts`.
4. Set `PAYMENTS_ENABLED=true` and the provider secrets. Point the provider webhooks at:
   - `/api/webhooks/stripe` (signature verified; subscription create/update/delete)
   - `/api/webhooks/paymob` (HMAC-SHA512 verified)
   - `/api/webhooks/fawry` (SHA-256 signature verified)

   Each webhook is stored in `PaymentEvent` first and is idempotent. **Check the Paymob and Fawry signature field lists against their current docs before going live.**

## Project map

```
prisma/schema.prisma           data model (Phase 2 tables included)
prisma/migrations/             SQL migrations
prisma/seed.ts                 first admin + demo page
src/middleware.ts              multi-tenant host routing + admin guard
src/app/[site]/page.tsx        public page (ISR, SEO, OG)
src/app/admin/**               dashboard, pages, builder, analytics, clients, inbox, team
src/app/api/**                 REST API, tracking, contact, signup, webhooks
src/components/renderer/**     PageRenderer (shared by live page + preview)
src/components/admin/**        builder UI
src/lib/blocks.ts              content schema (single source of truth)
src/lib/plans.ts               tier limits
src/lib/billing.ts             subscription helpers for webhooks
scripts/rollup-analytics.ts    nightly analytics rollup
deploy/                        nginx, scripts, cron
Dockerfile, docker-compose.yml, ecosystem.config.js
```

## Adding a block type

1. Add a zod schema to `blockSchema` in `src/lib/blocks.ts`, and a label to `BLOCK_LABELS`.
2. Render it in `BlockView` in `src/components/renderer/PageRenderer.tsx`.
3. Add its form in `src/components/admin/BlockForm.tsx`.
4. Decide which plans can use it in `src/lib/plans.ts`.

TypeScript flags any `switch` that is missing the new type.
