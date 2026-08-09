#!/usr/bin/env bash
# =============================================================================
# WordFlow - Production Deploy Script
# =============================================================================
# Builds the frontend and starts all production services.
#
# Usage:
#   ./deploy/scripts/deploy.sh
#
# Prerequisites:
#   - Docker Engine 24+
#   - Docker Compose v2+
#   - .env.production file in project root
# =============================================================================

set -euo pipefail

# -- Configuration --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.production"
COMPOSE_FILES="docker-compose.yml:deploy/docker-compose.prod.yml"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error(){ echo -e "${RED}[ERROR]${NC} $*" >&2; }

# -- Pre-flight Checks --
log "Starting WordFlow deployment..."

# Check .env.production exists
if [[ ! -f "$ENV_FILE" ]]; then
    error ".env.production not found. Copy .env.production.example and fill in values."
    exit 1
fi

# Check Docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker daemon is not running or user lacks permission."
    exit 1
fi

# Check Docker Compose
if ! docker compose version >/dev/null 2>&1; then
    error "Docker Compose v2+ is required."
    exit 1
fi

# -- Load Environment --
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# -- Step 1: Build Frontend --
log "Step 1/4: Building frontend..."
cd "${PROJECT_ROOT}/src/web"

if [[ ! -d "node_modules" ]]; then
    log "  Installing frontend dependencies..."
    npm install
fi

log "  Running production build..."
npm run build
log "  Frontend build complete. Output: src/web/dist/"

# -- Step 2: Prepare Nginx Static Files --
log "Step 2/4: Preparing Nginx static files..."
mkdir -p /var/www/wordflow/dist
cp -r "${PROJECT_ROOT}/src/web/dist/"* /var/www/wordflow/dist/
log "  Static files copied to /var/www/wordflow/dist/"

# -- Step 3: Start Services --
log "Step 3/4: Starting production services..."
cd "$PROJECT_ROOT"

export COMPOSE_FILE="$COMPOSE_FILES"

# Pull latest images for infrastructure services
log "  Pulling infrastructure images..."
docker compose pull postgres redis minio nginx 2>/dev/null || true

# Start all services
log "  Starting containers..."
docker compose up -d --build

# -- Step 4: Wait for Healthy --
log "Step 4/4: Waiting for services to be healthy..."
MAX_WAIT=120
WAITED=0

for service in postgres redis minio api nginx; do
    log "  Checking ${service}..."
    while true; do
        status=$(docker compose ps --format json "$service" 2>/dev/null | grep -o '"State":"[a-z]*"' | head -1 || echo "")
        health=$(docker compose ps --format json "$service" 2>/dev/null | grep -o '"Health":"[a-z]*"' | head -1 || echo "")

        if [[ "$health" == *"healthy"* ]] || [[ "$status" == *"running"* && "$service" == "nginx" ]]; then
            log "    ${service} is ready."
            break
        fi

        if (( WAITED >= MAX_WAIT )); then
            warn "    ${service} not healthy after ${MAX_WAIT}s. Check logs: docker compose logs ${service}"
            break
        fi

        sleep 2
        (( WAITED += 2 )) || true
    done
done

# -- Summary --
echo ""
log "============================================"
log "  Deployment Complete!"
log "============================================"
echo ""
echo "  Frontend:  http://${DOMAIN:-your-domain.com}/"
echo "  API:       http://${DOMAIN:-your-domain.com}/api/v1/"
echo "  Health:    http://${DOMAIN:-your-domain.com}/health"
echo ""
echo "  Useful commands:"
echo "    docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f"
echo "    docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml ps"
echo "    docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml restart api"
echo ""
