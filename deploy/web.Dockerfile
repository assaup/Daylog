# Build the SPA, then serve it (and proxy the API) with Caddy.
# Build context must be the repo root so we can reach ./frontend and ./deploy.

# --- Stage 1: build the React app ---
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin in production: the SPA calls /api, which Caddy proxies to backend.
ENV VITE_API_BASE=/api
RUN npm run build

# --- Stage 2: Caddy serving the build + reverse-proxying the API ---
FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
