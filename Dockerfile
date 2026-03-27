# ── Root Dockerfile: single-container dev/CI build ───────────────────────────
#
# Builds BOTH the frontend (Vite → dist/) and backend (tsc → dist/)
# inside the Emscripten image, then runs them together with `concurrently`.
#
# For production, prefer docker-compose.yml (two separate containers + nginx).
#
# Base: emscripten/emsdk — already ships Node.js, Python, g++, em++
FROM emscripten/emsdk:latest

WORKDIR /app

# ── Install global helpers ────────────────────────────────────────────────────
RUN npm install -g concurrently serve

# ── Backend: install + build TypeScript ───────────────────────────────────────
COPY backend/package*.json   ./backend/
COPY backend/tsconfig.json   ./backend/
RUN  cd backend && npm install

COPY backend/src/            ./backend/src/
RUN  cd backend && npm run build     # → backend/dist/
RUN  cd backend && npm prune --omit=dev

# ── Frontend: install + Vite build ────────────────────────────────────────────
COPY frontend/package*.json    ./frontend/
COPY frontend/tsconfig*.json   ./frontend/
COPY frontend/vite.config.ts   ./frontend/
RUN  cd frontend && npm install

COPY frontend/index.html       ./frontend/
COPY frontend/src/             ./frontend/src/
RUN  cd frontend && npm run build    # → frontend/dist/

# ── Runtime setup ─────────────────────────────────────────────────────────────
RUN mkdir -p backend/temp

# Vite bakes the API base URL at build time via VITE_API_URL.
# In this single-container layout both backend and serve share localhost,
# so no env injection is needed — the Vite proxy config handles dev,
# and serve + the Express server share the same origin for prod.

ENV NODE_ENV=production

# 3001 → Express backend
# 8080 → `serve` (static frontend)
EXPOSE 3001 8080

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN  chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
