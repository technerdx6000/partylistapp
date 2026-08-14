# Multi-stage build for React frontend
FROM node:22-alpine AS build

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

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

# Copy built application from build stage
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Ensure dirs exist and are writable
RUN mkdir -p /var/cache/nginx /var/run && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Healthcheck that TrueNAS will use
HEALTHCHECK --interval=60s --timeout=10s --start-period=20s --retries=5 \
    CMD wget -qO- http://127.0.0.1/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
