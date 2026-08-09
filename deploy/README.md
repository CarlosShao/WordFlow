# WordFlow Deployment Guide

Production deployment configuration for the WordFlow application.

## Architecture

```
                  +-----------------------------------------------+
                  |              Cloud Server                     |
                  |                                               |
  Internet ---->  |  :80/:443  Nginx (reverse proxy)             |
                  |                  |                             |
                  |         +--------+--------+                   |
                  |         |                 |                   |
                  |   /api/* (proxy)     / (static)               |
                  |         |                 |                   |
                  |   +-----+-----+   +------+------+            |
                  |   | Fastify   |   | dist/       |            |
                  |   | API :3001 |   | (Vue build) |            |
                  |   +-----+-----+   +-------------+            |
                  |         |                                     |
                  |    +----+------------+                       |
                  |    |    |    |       |                       |
                  |  +--+ +--+ +--+      |                       |
                  |  |PG| |RD| |MinIO|   |                       |
                  |  +--+ +--+ +--+      |                       |
                  +-----------------------------------------------+
```

## Prerequisites

- Ubuntu 22.04+ server (1 CPU, 2GB RAM minimum)
- Docker Engine 24+ and Docker Compose v2+
- A registered domain pointing to your server (A record)
- SSH access to the server

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/wordflow.git /opt/wordflow
cd /opt/wordflow
```

### 2. Configure Environment Variables

```bash
cp .env.production.example .env.production
nano .env.production
```

Generate secure secrets:

```bash
openssl rand -hex 64     # JWT_SECRET
openssl rand -hex 64     # JWT_REFRESH_SECRET
openssl rand -base64 48  # POSTGRES_PASSWORD
openssl rand -base64 32  # REDIS_PASSWORD
```

Fill in all required values:

| Variable | Description |
|----------|-------------|
| `DOMAIN` | Your domain name |
| `JWT_SECRET` | Random 64+ hex chars |
| `JWT_REFRESH_SECRET` | Random 64+ hex chars |
| `POSTGRES_PASSWORD` | Strong password |
| `REDIS_PASSWORD` | Strong password |
| `MINIO_ACCESS_KEY` | Min 8 chars |
| `MINIO_SECRET_KEY` | Min 8 chars |
| `AI_API_KEY` | Your LLM provider API key |
| `GITHUB_CLIENT_ID` | GitHub OAuth App ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Secret |

### 3. Deploy

```bash
chmod +x deploy/scripts/*.sh
./deploy/scripts/deploy.sh
```

### 4. Verify

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml ps
curl -s https://your-domain.com/health
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f
```

## SSL Certificate (Let's Encrypt)

After verifying the site works over HTTP, set up HTTPS:

```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot renew --dry-run
```

After SSL is configured, update `deploy/nginx/wordflow.conf`:

1. Uncomment the HSTS header
2. Reload nginx: `docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml exec nginx nginx -s reload`

## Database Backups

### Manual Backup

```bash
./deploy/scripts/backup.sh
```

Backups are stored in `.docker/volumes/backups/` with 7-day retention.

### Scheduled Backup

```bash
crontab -e
# Add: 0 3 * * * /opt/wordflow/deploy/scripts/backup.sh >> /var/log/wordflow-backup.log 2>&1
```

### Restore from Backup

```bash
./deploy/scripts/rollback.sh --list-backups
./deploy/scripts/rollback.sh --db-latest
./deploy/scripts/rollback.sh --db .docker/volumes/backups/wordflow_20250101_030000.sql.gz
```

## Rollback a Service

```bash
./deploy/scripts/rollback.sh --service api
./deploy/scripts/rollback.sh --service api --image wordflow-api:previous
```

## Monitoring & Logs

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f api
docker stats
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | API not running: `docker compose logs api` |
| Client denied | Nginx can't read static files; check volume mount |
| DB connection refused | Check `POSTGRES_PASSWORD` in `.env.production` |
| Redis auth failed | Check `REDIS_PASSWORD` matches in both `REDIS_URL` and redis command |
| SSL issues | Run `sudo certbot certificates` to check cert status |

## Security Checklist

- [ ] All secrets generated with `openssl rand`
- [ ] `.env.production` is in `.gitignore`
- [ ] Database ports not exposed externally
- [ ] Redis password configured
- [ ] SSL/TLS enabled
- [ ] HSTS header enabled
- [ ] Regular backups scheduled
- [ ] Server firewall enabled (`ufw allow 22,80,443`)

## Directory Structure

```
deploy/
+-- README.md                  # This file
+-- docker-compose.prod.yml    # Production Docker Compose override
+-- nginx/
|   +-- wordflow.conf          # Nginx reverse proxy configuration
+-- scripts/
    +-- deploy.sh              # One-click deployment
    +-- backup.sh              # Database backup with retention
    +-- rollback.sh            # Database/service rollback
```
