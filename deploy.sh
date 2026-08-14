#!/bin/bash

# Build and deploy the Party List application

echo "🚀 Building and deploying Party List application..."

# Stop existing containers
echo "⏹️  Stopping existing containers..."
docker-compose down

# Build images
echo "🔨 Building Docker images..."
docker-compose build --no-cache

# Start services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

echo "✅ Deployment complete!"
echo "🌐 Application available at: http://localhost"
echo "📊 API health check: http://localhost/api/health"

# Show logs
echo "📝 Recent logs:"
docker-compose logs --tail=50
