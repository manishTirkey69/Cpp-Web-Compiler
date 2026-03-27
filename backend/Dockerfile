# ── Backend Dockerfile ───────────────────────────────────
# Base: official Emscripten image (includes em++, Node.js, Python, g++)
FROM emscripten/emsdk:latest

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install ALL deps (including devDeps for tsc build)
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript → dist/
RUN npm run build

# Remove devDependencies after build to slim the image
RUN npm prune --omit=dev

# Ensure the temp directory exists for compilation artefacts
RUN mkdir -p temp

EXPOSE 3001

CMD ["node", "dist/server.js"]
