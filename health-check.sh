#!/bin/bash

# Health check script for Party List application

echo "🏥 Party List Application Health Check"
echo "====================================="

# Check if containers are running
echo "📦 Container Status:"
docker-compose ps

echo ""

# Check frontend health
echo "🌐 Frontend Health:"
if curl -f -s http://localhost/health > /dev/null; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Unhealthy"
fi

# Check API health
echo ""
echo "🔧 API Health:"
if curl -f -s http://localhost/api/health > /dev/null; then
    echo "✅ API: Healthy"
    echo "📊 API Response:"
    curl -s http://localhost/api/health | jq .
else
    echo "❌ API: Unhealthy"
fi

# Check database connectivity
echo ""
echo "🗄️  Database Health:"
if docker-compose exec -T db mysqladmin ping -h localhost --silent; then
    echo "✅ Database: Healthy"
else
    echo "❌ Database: Unhealthy"
fi

echo ""
echo "📝 Recent logs:"
echo "---------------"
docker-compose logs --tail=10
