# syntax=docker/dockerfile:1
FROM oven/bun:1 AS builder
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG DATABASE_URL=:memory:
ENV DATABASE_URL=$DATABASE_URL
ARG BETTER_AUTH_SECRET=
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ARG ORIGIN=http://127.0.0.1:3000
ENV ORIGIN=$ORIGIN

RUN bun run build \
	&& rm -rf node_modules \
	&& bun install --frozen-lockfile --production

FROM oven/bun:1 AS runner
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends perl \
	&& rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "run", "start"]
