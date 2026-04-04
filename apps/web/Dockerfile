# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web

RUN pnpm --filter @cabeleleila/contracts build 2>/dev/null || true
RUN pnpm --filter web build --configuration=production

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

EXPOSE 80
