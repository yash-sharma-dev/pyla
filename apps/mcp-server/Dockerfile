# ============================================================
# Stage 1: base — shared pnpm + Node foundation
# ============================================================
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# ============================================================
# Stage 2: deps — install workspace dependencies
# ============================================================
FROM base AS deps
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml .npmrc package.json pnpm-lock.yaml ./

# Copy all package.json files so pnpm can resolve the workspace graph
COPY apps/mcp-server/package.json        ./apps/mcp-server/
COPY packages/core-markdown/package.json ./packages/core-markdown/
COPY packages/core-plugins/package.json  ./packages/core-plugins/
COPY packages/core-schema/package.json   ./packages/core-schema/
COPY packages/supabase/package.json      ./packages/supabase/

RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: builder — compile with tsup
# tsup is configured with noExternal: [/@pyla\//], so all
# workspace packages are inlined into the bundle at build time.
# The runner stage therefore needs zero node_modules.
# ============================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules              ./node_modules
COPY --from=deps /app/apps/mcp-server/node_modules ./apps/mcp-server/node_modules
COPY --from=deps /app/packages/core-markdown/node_modules ./packages/core-markdown/node_modules
COPY --from=deps /app/packages/core-plugins/node_modules ./packages/core-plugins/node_modules
COPY --from=deps /app/packages/core-schema/node_modules ./packages/core-schema/node_modules
COPY --from=deps /app/packages/supabase/node_modules ./packages/supabase/node_modules

# Copy full monorepo source
COPY . .

# Build all @pyla/* packages the mcp-server depends on first
RUN pnpm --filter @pyla/supabase      build || true
RUN pnpm --filter @pyla/core-markdown build || true

# Build the MCP server itself
RUN pnpm --filter @pyla/mcp-server build

# ============================================================
# Stage 4: runner — minimal production image
# Only the compiled dist/ is needed; tsup already bundled deps.
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 mcpuser

# Copy node_modules from deps
COPY --from=deps --chown=mcpuser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=mcpuser:nodejs /app/apps/mcp-server/node_modules ./apps/mcp-server/node_modules
# Also copy workspace node_modules since third-party deps of workspace packages might be hoisted or linked
COPY --from=deps --chown=mcpuser:nodejs /app/packages/core-markdown/node_modules ./packages/core-markdown/node_modules
COPY --from=deps --chown=mcpuser:nodejs /app/packages/core-plugins/node_modules ./packages/core-plugins/node_modules
COPY --from=deps --chown=mcpuser:nodejs /app/packages/core-schema/node_modules ./packages/core-schema/node_modules
COPY --from=deps --chown=mcpuser:nodejs /app/packages/supabase/node_modules ./packages/supabase/node_modules

# Copy only the compiled bundle
COPY --from=builder --chown=mcpuser:nodejs /app/apps/mcp-server/dist ./apps/mcp-server/dist

USER mcpuser

# NOTE: The Pyla MCP server uses stdio transport (Model Context Protocol).
# It is not an HTTP server. When running in Docker for local development,
# the container stays alive and you connect via `docker exec` or by
# pointing your MCP client at `docker exec -i pyla-mcp-server node /app/dist/index.js`.
# The HTTP health-check port 3001 is exposed for liveness probes only.
EXPOSE 3001

# Keep the container running; the MCP client connects via stdin/stdout.
CMD ["node", "/app/apps/mcp-server/dist/index.js"]
