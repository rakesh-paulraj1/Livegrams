FROM node:lts AS build

WORKDIR /usr/src/app

COPY ./packages ./packages 
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/websocket ./apps/websocket

RUN npm install -g pnpm \&& pnpm install --frozen-lockfile


RUN pnpm run build:ws

EXPOSE 8080
CMD ["pnpm", "run", "start:ws"]
