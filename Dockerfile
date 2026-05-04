FROM oven/bun as build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY svelte.config.js vite.config.ts tsconfig.json biome.json components.json ./
COPY src/ ./src/
RUN bun run build
RUN bun run compile

FROM docker.io/library/debian:bookworm-slim
ENV HTTP_HOST=0.0.0.0 HTTP_PORT=3000 ARCHIVE_DIR=/video
EXPOSE 3000
STOPSIGNAL SIGKILL
COPY --from=build /app/motion-ui /motion-ui

ENTRYPOINT ["/motion-ui"]
