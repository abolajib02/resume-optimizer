# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first — cache this layer separately from source code
COPY package*.json ./
RUN npm ci

# Copy source and build
# VITE_API_BASE_URL is intentionally empty so all API calls become relative
# paths (e.g. /api/parse) which nginx will proxy to the backend container.
COPY . .
RUN VITE_API_BASE_URL="" npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Copy built assets and nginx config
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1
