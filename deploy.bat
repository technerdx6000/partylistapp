@echo off
REM Build and deploy the Party List application for Windows

echo 🚀 Building and deploying Party List application...

REM Stop existing containers
echo ⏹️  Stopping existing containers...
docker compose down

REM Build images
echo 🔨 Building Docker images...
docker compose build --no-cache

REM Start services
echo ▶️  Starting services...
docker compose up -d

REM Wait for services to be healthy
echo ⏳ Waiting for services to be healthy...
timeout /t 30 /nobreak > nul

REM Check service health
echo 🏥 Checking service health...
docker compose ps

echo ✅ Deployment complete!
echo 🌐 Application available at: http://localhost
echo 📊 API health check: http://localhost/api/health

REM Show logs
echo 📝 Recent logs:
docker compose logs --tail=50
