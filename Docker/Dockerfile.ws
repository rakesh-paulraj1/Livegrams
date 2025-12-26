
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY apps/websocket ./apps/websocket

RUN pnpm install --frozen-lockfile
RUN pnpm run build:ws


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8081

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate


COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/websocket/package.json ./apps/websocket/package.json


RUN pnpm install --prod --frozen-lockfile --filter=websocket... \
    && pnpm prune --prod

COPY --from=builder /app/apps/websocket/dist ./apps/websocket/dist

EXPOSE 8081

CMD ["node", "apps/websocket/dist/index.js"]
