FROM node:20-slim AS builder

WORKDIR /usr/src/app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml turbo.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY apps/websocket ./apps/websocket

RUN pnpm install --frozen-lockfile

RUN pnpm run build:ws


FROM node:20-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get update && apt-get install -y \
    ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/apps/websocket/dist ./apps/websocket/dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/packages/typescript-config ./packages/typescript-config
COPY package.json pnpm-workspace.yaml ./

EXPOSE 8080

CMD ["node", "apps/websocket/dist/index.js"]
