# ==============================================================================
# Workflow AI — API Dockerfile (Multi-Stage Production Build)
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
COPY apps/api/package.json ./apps/api/

# Install dependencies across all workspaces
RUN npm ci

# Copy contracts source and compile
COPY packages/config ./packages/config
COPY packages/contracts ./packages/contracts
RUN npm run build:contracts

# Copy API source, prisma schema and generate Prisma client
COPY apps/api ./apps/api
RUN npm run db:generate --workspace=@workflow-ai/api

# Build NestJS API distribution bundle
RUN npm run build --workspace=@workflow-ai/api

# --- Stage 3: Minimal Production Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules and built artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Drop privileges to standard non-root user
USER node

EXPOSE 4000

# Container liveness healthcheck
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health/live || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
