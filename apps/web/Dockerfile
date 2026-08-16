FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS build

# Set working directory
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig packages/tsconfig

# Install dependencies needed for the web workspace build
RUN npm ci

# Copy web workspace source
COPY apps/web apps/web
COPY packages/shared packages/shared

# Build the application
RUN npm run --workspace @listcollab/web build

FROM nginxinc/nginx-unprivileged:stable-alpine AS production

USER root

COPY apps/web/nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/apps/web/dist /usr/share/nginx/html

RUN mkdir -p /var/cache/nginx /var/run/nginx && \
    chown -R 101:101 /usr/share/nginx/html /var/cache/nginx /var/run/nginx /etc/nginx

USER 101

EXPOSE 8080

HEALTHCHECK --interval=60s --timeout=10s --start-period=20s --retries=5 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
