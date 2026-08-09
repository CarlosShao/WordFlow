#!/usr/bin/env bash
# =============================================================================
# WordFlow - Rollback Script
# =============================================================================
# Restores the database from a backup and/or reverts services to a previous state.
#
# Usage:
#   ./deploy/scripts/rollback.sh [OPTIONS]
#
# Options:
#   --db <file>       Restore database from specific backup file
#   --db-latest       Restore from the most recent backup (default)
#   --service <name>  Rollback a specific service (api|nginx|postgres|redis|minio)
#   --image <tag>     Docker image tag to rollback to (for API service)
#   --list-backups    List available backups and exit
#   --help            Show this help message
#
# Examples:
#   ./deploy/scripts/rollback.sh --db-latest
#   ./deploy/scripts/rollback.sh --db backups/wordflow_20250101_030000.sql.gz
#   ./deploy/scripts/rollback.sh --service api --image wordflow-api:previous
# =============================================================================

set -euo pipefail

# -- Configuration --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/.docker/volumes/backups"
COMPOSE_FILES="docker-compose.yml:deploy/docker-compose.prod.yml"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[ROLLBACK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error(){ echo -e "${RED}[ERROR]${NC} $*" >&2; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }

# -- Parse Arguments --
DB_RESTORE=""
DB_LATEST=false
SERVICE=""
IMAGE_TAG=""
LIST_BACKUPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --db)
            DB_RESTORE="$2"
            shift 2
            ;;
        --db-latest)
            DB_LATEST=true
            shift
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --image)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --list-backups)
            LIST_BACKUPS=true
            shift
            ;;
        --help)
            head -30 "$0" | grep -E "^#( |$)" | sed 's/^# \?//'
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# -- Load Env --
ENV_FILE="${PROJECT_ROOT}/.env.production"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

POSTGRES_USER="${POSTGRES_USER:-wordflow}"
POSTGRES_DB="${POSTGRES_DB:-wordflow}"

# -- List Backups --
if $LIST_BACKUPS; then
    echo "Available backups in ${BACKUP_DIR}:"
    echo "----------------------------------------------"
    if [[ -d "$BACKUP_DIR" && $(find "$BACKUP_DIR" -name "wordflow_*.sql.gz" | wc -l) -gt 0 ]]; then
        ls -lhS "${BACKUP_DIR}"/wordflow_*.sql.gz
    else
        echo "  No backups found."
    fi
    exit 0
fi

# -- Safety Warning --
echo ""
warn "WARNING: This will modify your production database/services."
warn "A backup is recommended before rollback."
echo ""
read -rp "  Are you sure you want to continue? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log "Rollback cancelled."
    exit 0
fi

# -- Database Restore --
if $DB_LATEST || [[ -n "$DB_RESTORE" ]]; then
    log "Starting database rollback..."

    # Find the backup file
    if $DB_LATEST; then
        LATEST_BACKUP=$(find "$BACKUP_DIR" -name "wordflow_*.sql.gz" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
        if [[ -z "$LATEST_BACKUP" ]]; then
            error "No backup files found in ${BACKUP_DIR}"
            exit 1
        fi
        DB_RESTORE="$LATEST_BACKUP"
    fi

    if [[ ! -f "$DB_RESTORE" ]]; then
        error "Backup file not found: ${DB_RESTORE}"
        exit 1
    fi

    log "  Restoring from: ${DB_RESTORE}"
    info "  WARNING: This will DROP and recreate all tables."

    # Stop API to prevent writes
    log "  Stopping API service..."
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILES" stop api

    # Restore database
    log "  Restoring database..."
    gunzip -c "$DB_RESTORE" | docker compose -f "$PROJECT_ROOT/$COMPOSE_FILES" exec -T postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null

    # Restart API
    log "  Restarting API service..."
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILES" start api

    log "Database restore complete."
fi

# -- Service Rollback --
if [[ -n "$SERVICE" ]]; then
    log "Rolling back service: ${SERVICE}"

    if [[ -n "$IMAGE_TAG" ]]; then
        log "  Using image: ${IMAGE_TAG}"
        # Pull and redeploy with specific image
        export API_VERSION="${IMAGE_TAG##*:}"
        docker compose -f "$PROJECT_ROOT/$COMPOSE_FILES" up -d --pull missing "$SERVICE"
    else
        # Restart current image
        docker compose -f "$PROJECT_ROOT/$COMPOSE_FILES" restart "$SERVICE"
    fi

    # Wait for health
    log "  Waiting for ${SERVICE} to be healthy..."
    sleep 5

    health=$(docker compose -f "$PROJECT_ROOT/$COMPOSE_FILES" ps --format json "$SERVICE" 2>/dev/null | grep -o '"Health":"[a-z]*"' | head -1 || echo "unknown")
    log "  ${SERVICE} status: ${health}"
fi

# -- Summary --
echo ""
log "============================================"
log "  Rollback Complete!"
log "============================================"
echo ""
echo "  Verify your deployment:"
echo "    curl -s https://${DOMAIN:-your-domain.com}/health"
echo "    docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml ps"
echo ""
