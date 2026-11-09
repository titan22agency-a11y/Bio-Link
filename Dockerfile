# syntax=docker/dockerfile:1.7
# Multi-stage build -> small runtime image using Next.js standalone output.

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── deps: full install (incl. dev deps for build, prisma CLI, tsx) ─────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ── tools: used by the one-off `migrate` service (migrations + seed) ──
FROM deps AS tools
COPY . .
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed"]

# ── build ──────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runtime ────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -g 1001 app && useradd -u 1001 -g app -m app \
 && mkdir -p /data/uploads /app/.next/cache && chown -R app:app /data /app
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
