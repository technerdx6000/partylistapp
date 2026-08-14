# Multi-stage build for React frontend
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Ensure dirs exist and are writable
RUN mkdir -p /var/cache/nginx /var/run && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Healthcheck that TrueNAS will use
HEALTHCHECK --interval=60s --timeout=10s --start-period=20s --retries=5 \
    CMD wget -qO- http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
