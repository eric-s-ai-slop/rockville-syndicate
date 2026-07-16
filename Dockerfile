# syntax=docker/dockerfile:1.7

# ── Builder ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install Python, C++ compiler, and graphics dependencies for node-gyp/canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev

COPY package*.json ./
# Keep npm's tarball/index cache across BuildKit builds while retaining the
# lockfile-addressed install layer as the correctness boundary.
RUN --mount=type=cache,id=omega-npm,target=/root/.npm npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install the runtime graphics libraries so the compiled canvas package can execute
RUN apk add --no-cache \
    pixman \
    cairo \
    pango

# Copy all node_modules (vite is required by server.cjs at import time even in prod)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3324

ENV NODE_ENV=production

# Declare volatile provenance inputs only where they are consumed. In
# particular, OMEGA_BUILD_TIME changes for every release check; declaring it
# before RUN/COPY would invalidate otherwise reusable runtime layers.
ARG OMEGA_VERSION
ARG OMEGA_REVISION
ARG OMEGA_BUILD_TIME

ENV OMEGA_VERSION=$OMEGA_VERSION \
    OMEGA_REVISION=$OMEGA_REVISION \
    OMEGA_BUILD_TIME=$OMEGA_BUILD_TIME

LABEL org.opencontainers.image.version=$OMEGA_VERSION \
      org.opencontainers.image.revision=$OMEGA_REVISION \
      org.opencontainers.image.created=$OMEGA_BUILD_TIME

CMD ["node", "dist/server.cjs"]
