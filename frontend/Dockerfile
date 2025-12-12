FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set the websocket URL for production
ARG VITE_WS_URL
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
