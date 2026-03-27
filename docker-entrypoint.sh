#!/bin/sh
# docker-entrypoint.sh
# Starts the Node.js backend and the Vite-built static frontend side-by-side.
# Used only by the single-container root Dockerfile.
# For multi-container prod, docker-compose.yml starts each service separately.

set -e

echo "==> C++ Shell startup"
echo "    Backend  → http://localhost:3001"
echo "    Frontend → http://localhost:8080"
echo ""

exec concurrently \
  --names "backend,frontend" \
  --prefix-colors "cyan,magenta" \
  "node /app/backend/dist/server.js" \
  "serve -s /app/frontend/dist -l 8080"
