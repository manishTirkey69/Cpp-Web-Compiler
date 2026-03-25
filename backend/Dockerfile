# ── Backend Dockerfile ───────────────────────────────────
# Base: official Emscripten image (includes em++, Node.js, Python)
FROM emscripten/emsdk:latest

# Set working directory
WORKDIR /app

# Copy package files first for layer-caching
COPY package*.json ./

# Install Node dependencies
RUN npm install --omit=dev

# Copy the rest of the backend source
COPY . .

# Ensure the temp directory exists
RUN mkdir -p temp

# Expose the Express port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
