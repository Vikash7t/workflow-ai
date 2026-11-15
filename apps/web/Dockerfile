# ==============================================================================
# Workflow AI — Web Frontend Dockerfile (Multi-Stage Standalone Build)
# ==============================================================================

# --- Stage 1: Base Runtime ---
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app

# --- Stage 2: Monorepo Builder ---
FROM base AS builder
WORKDIR /app

# Copy root manifests and workspace configs
COPY package*.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/web/package.json ./apps/web/

# Install dependencies across monorepo
RUN npm ci

# Copy contracts and build
COPY packages/config ./packages/config
COPY packages/contracts ./packages/contracts
RUN npm run build:contracts

# Copy web source and build Next.js in standalone mode
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build --workspace=@workflow-ai/web

# --- Stage 3: Minimal Production Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output and public assets
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Drop privileges to non-root user
USER node

EXPOSE 3000

# Container liveness healthcheck
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
