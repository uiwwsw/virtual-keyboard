FROM node:24-bookworm-slim AS build
WORKDIR /src
RUN corepack enable
COPY . .
RUN npm ci && npm run build

FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/demo-dist /srv
