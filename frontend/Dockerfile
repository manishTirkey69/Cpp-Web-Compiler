# ── Frontend Dockerfile (multi-stage) ────────────────────────────────────────
#
# Stage 1 (builder): install deps and run `vite build` → produces dist/
# Stage 2 (serve):   nginx serves dist/ and proxies /api + /ws to backend

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json tsconfig*.json vite.config.ts ./

RUN npm install

# Copy source and build
COPY index.html ./
COPY src/ ./src/

RUN npm run build
# Output: /app/dist/


# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config with ours
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
