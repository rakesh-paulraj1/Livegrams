FROM node:20-slim

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY packages ./packages
COPY apps/websocket ./apps/websocket

RUN corepack enable \
  && corepack prepare pnpm@9.0.0 --activate \
  && pnpm install --frozen-lockfile

RUN pnpm run build:ws

EXPOSE 8080
CMD ["pnpm", "run", "start:ws"]
