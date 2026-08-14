# Party List App - Docker Deployment

This guide will help you deploy the Party List application using Docker and Docker Compose.

## Prerequisites

- Docker installed on your server
- Docker Compose installed
- At least 2GB RAM and 5GB disk space

## Quick Start

1. **Clone the repository to your server**
2. **Configure environment variables**
3. **Deploy the application**

### 1. Environment Configuration

Copy the production environment template:

```bash
cp .env.production .env
```

Edit `.env` file and update the passwords:

```bash
# Database Configuration
DB_NAME=partylistdb
DB_USER=partyuser
DB_PASSWORD=your_secure_password_here
DB_ROOT_PASSWORD=your_secure_root_password_here
```

### 2. Deploy

#### Option A: Using the deployment script (Linux/Mac)

```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Using the deployment script (Windows)

```cmd
deploy.bat
```

#### Option C: Manual deployment

```bash
# Build and start services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Services

The application consists of three services:

- **Frontend (Port 80)**: React application served by Nginx
- **API (Internal)**: Node.js API server
- **Database (Port 3306)**: MariaDB database

## URLs

- **Application**: http://your-server-ip
- **API Health Check**: http://your-server-ip/api/health

## Management Commands

### View logs

```bash
docker-compose logs -f [service_name]
```

### Restart a service

```bash
docker-compose restart [service_name]
```

### Stop all services

```bash
docker-compose down
```

### Update application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Backup database

```bash
docker-compose exec db mysqldump -u root -p partylistdb > backup.sql
```

### Restore database

```bash
docker-compose exec -T db mysql -u root -p partylistdb < backup.sql
```

## Troubleshooting

### Check service health

```bash
docker-compose ps
```

### View service logs

```bash
docker-compose logs api
docker-compose logs frontend
docker-compose logs db
```

### Access database directly

```bash
docker-compose exec db mysql -u root -p partylistdb
```

### Reset everything

```bash
docker-compose down -v
docker system prune -f
docker-compose up -d --build
```

## Security Notes

- Change default passwords in `.env` file
- Consider setting up SSL/TLS with a reverse proxy (nginx/traefik)
- Regularly update Docker images
- Monitor logs for suspicious activity

## Performance Tuning

- Adjust database memory settings in `docker-compose.yml`
- Monitor container resource usage with `docker stats`
- Consider using Docker Swarm or Kubernetes for scaling
