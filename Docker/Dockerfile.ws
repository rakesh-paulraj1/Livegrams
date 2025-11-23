FROM node:24.0.0-alpine

WORKDIR /src

COPY ./packages ./packages
COPY ./package.json  ./package.json
COPY ./package-lock.json ./package-lock.json


COPY ./apps/websocket ./apps/websocket


RUN  pnpm run  install
RUN  pnpm run build 

EXPOSE 8080

CMD ["pnpm", "run","start:websocket"]