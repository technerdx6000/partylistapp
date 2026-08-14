# Production Deployment Checklist

## Pre-Deployment

- [ ] Docker and Docker Compose installed on server
- [ ] Server has adequate resources (2GB+ RAM, 5GB+ disk)
- [ ] Firewall configured to allow HTTP traffic (port 80)
- [ ] SSL certificate obtained (if using HTTPS)

## Security Configuration

- [ ] Changed default passwords in `.env` file
- [ ] Updated `DB_PASSWORD` with strong password
- [ ] Updated `DB_ROOT_PASSWORD` with strong password
- [ ] Reviewed nginx security headers in `nginx.conf`
- [ ] Disabled unnecessary ports in `docker-compose.yml`

## Environment Setup

- [ ] Copied `.env.production` to `.env`
- [ ] Updated environment variables for production
- [ ] Verified database connection settings
- [ ] Set `NODE_ENV=production`

## Initial Deployment

- [ ] Cloned repository to server
- [ ] Made deployment scripts executable (`chmod +x *.sh`)
- [ ] Run deployment: `./deploy.sh` or `deploy.bat`
- [ ] Verified all containers are healthy: `docker-compose ps`
- [ ] Tested application access: `http://server-ip`
- [ ] Tested API health: `http://server-ip/api/health`

## Post-Deployment Testing

- [ ] Create a test person
- [ ] Add test items to person
- [ ] Create test categories
- [ ] Add required items
- [ ] Assign required items to people
- [ ] Test toggle functionality (hide/show assigned)
- [ ] Verify data persistence after container restart

## Monitoring Setup

- [ ] Set up log rotation for Docker containers
- [ ] Configure monitoring/alerting for container health
- [ ] Set up database backup schedule
- [ ] Document recovery procedures

## Optional Enhancements

- [ ] Set up reverse proxy with SSL (nginx/traefik)
- [ ] Configure domain name and DNS
- [ ] Set up automated backups
- [ ] Configure log aggregation
- [ ] Set up monitoring dashboard

## Maintenance

- [ ] Document update procedure
- [ ] Schedule regular security updates
- [ ] Plan database maintenance windows
- [ ] Test backup/restore procedures
