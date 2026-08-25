# ── build ───────────────────────────────────────────────────────────────────
# better-sqlite3 is a native module with no prebuilt arm64 binary for this
# combination, so the build stage carries a toolchain and compiles it. The
# runtime stage does not, which is most of the size difference between them.
FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Dependencies first: this layer is the slow one and only needs redoing when the
# manifests change, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies. Done after the build because nest/typescript are dev
# dependencies and the build needs them.
RUN npm prune --omit=dev

# ── runtime ─────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Runs as the image's existing unprivileged user rather than root. The data
# directory is chowned because the volume mounted over it inherits this owner.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 3000

# The datastore lives on a volume, not in the image.
ENV SQLITE_DATABASE=/data/monitor.sqlite

# Container-native health signal, so Docker restarts a process that is up but
# not serving rather than only one that has exited.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
