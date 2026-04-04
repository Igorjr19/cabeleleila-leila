# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api

# Build contracts then API
RUN pnpm --filter @cabeleleila/contracts build 2>/dev/null || true
RUN pnpm --filter api build

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/contracts ./packages/contracts

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

EXPOSE 3001

CMD ["node", "apps/api/dist/main"]
