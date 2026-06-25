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
RUN npm ci

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

CMD ["node", "dist/server.cjs"]