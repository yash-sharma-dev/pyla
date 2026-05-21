# ============================================================
# Stage 1: base — shared pnpm + Node foundation
# ============================================================
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# ============================================================
# Stage 2: deps — install ALL workspace dependencies
# ============================================================
FROM base AS deps
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml .npmrc package.json pnpm-lock.yaml ./

# Copy all package.json files from the monorepo so pnpm
# can resolve the workspace graph without copying source.
COPY apps/web/package.json              ./apps/web/
COPY apps/mcp-server/package.json       ./apps/mcp-server/
COPY packages/core-markdown/package.json ./packages/core-markdown/
COPY packages/core-plugins/package.json  ./packages/core-plugins/
COPY packages/core-schema/package.json   ./packages/core-schema/
COPY packages/supabase/package.json      ./packages/supabase/

RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: builder — compile the web app
# ============================================================
FROM base AS builder
WORKDIR /app

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules         ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/core-markdown/node_modules ./packages/core-markdown/node_modules
COPY --from=deps /app/packages/core-plugins/node_modules ./packages/core-plugins/node_modules
COPY --from=deps /app/packages/core-schema/node_modules ./packages/core-schema/node_modules
COPY --from=deps /app/packages/supabase/node_modules ./packages/supabase/node_modules

# Copy full source
COPY . .

# Build shared packages that web depends on
RUN pnpm --filter @pyla/supabase build || true

# Build arguments — injected at image build time by docker compose
# so the Next.js NEXT_PUBLIC_ vars are baked into the static bundle.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Enable Next.js standalone output for the smallest possible runtime image
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @pyla/web build

# ============================================================
# Stage 4: runner — minimal production image
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone server bundle produced by Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
