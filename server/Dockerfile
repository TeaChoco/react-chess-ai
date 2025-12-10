FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /usr/src/app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN pnpm install

COPY . .

EXPOSE 3000

RUN ["pnpm", "build"]

CMD ["node", "--max-old-space-size=512", "dist/main"]