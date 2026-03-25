# ── Single Container: Emscripten + Node.js backend + static frontend ──
#
# Uses the official Emscripten image (already has Node.js + em++ + Python).
# Installs `serve` globally to host the frontend on port 8080.
# Express backend runs on port 3000 (internal).
# A tiny process manager (concurrently) starts both.

FROM emscripten/emsdk:latest

WORKDIR /app

# ── Install global tools ───────────────────────────────────────────────
# `serve`       → static file server for the frontend
# `concurrently`→ run backend + frontend server in parallel
RUN npm install -g serve concurrently

# ── Backend dependencies ───────────────────────────────────────────────
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# ── Copy source ────────────────────────────────────────────────────────
COPY backend/  ./backend/
COPY frontend/ ./frontend/

# Ensure temp dir exists for compilation artefacts
RUN mkdir -p backend/temp

# ── Environment defaults ───────────────────────────────────────────────
# BACKEND_URL is injected into the frontend at runtime via a small script
# written into index.html by the entrypoint. Override with docker run -e.
# NOTE: The browser hits the HOST-side mapped port (3001 → container 3000).
# docker-compose.yml overrides this with the correct host-facing URL.
ENV BACKEND_URL=http://localhost:3001/compile
ENV NODE_ENV=production

# ── Ports ─────────────────────────────────────────────────────────────
# 3000 → Express API (backend)
# 8080 → serve (frontend)
EXPOSE 3000 8080

# ── Entrypoint ────────────────────────────────────────────────────────
# Inject BACKEND_URL into the frontend before starting servers
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
