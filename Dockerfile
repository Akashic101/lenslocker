# syntax=docker/dockerfile:1
# Build with Node so vite/SvelteKit load better-sqlite3 (native); Bun cannot load it during build.
# Install deps with Bun to match bun.lock. Runtime uses `bun run start` → `node build` (needs Node on PATH).
FROM node:22-bookworm AS builder
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl unzip ca-certificates python3 make g++ \
	&& rm -rf /var/lib/apt/lists/* \
	&& curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG DATABASE_URL=:memory:
ENV DATABASE_URL=$DATABASE_URL
# Provide a dummy secret ONLY for build
ENV BETTER_AUTH_SECRET=build_time_dummy_secret_not_used_in_runtime
ARG ORIGIN=http://127.0.0.1:3000
ENV ORIGIN=$ORIGIN

RUN ./node_modules/.bin/svelte-kit sync \
	&& ./node_modules/.bin/vite build \
	&& rm -rf node_modules \
	&& bun install --frozen-lockfile --production

FROM node:22-bookworm AS runner
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl unzip ca-certificates perl \
	&& rm -rf /var/lib/apt/lists/* \
	&& curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

ENV BODY_SIZE_LIMIT=100M

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/lib/server/db ./src/lib/server/db

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Strip CRLF if the script was checked out on Windows (else exec fails with "no such file or directory").
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
	&& chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
