#!/usr/bin/env bash
# =============================================================================
# WordFlow - Database Backup Script
# =============================================================================
# Creates a timestamped backup of the PostgreSQL database.
# Optionally uploads to MinIO for off-server storage.
#
# Usage:
#   ./deploy/scripts/backup.sh
#
# Scheduling (crontab -e):
#   0 3 * * * /opt/wordflow/deploy/scripts/backup.sh >> /var/log/wordflow-backup.log 2>&1
#
# Backup retention: Last 7 days locally
# =============================================================================

set -euo pipefail

# -- Configuration --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/.docker/volumes/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="wordflow_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

# Load env vars from .env.production if available
ENV_FILE="${PROJECT_ROOT}/.env.production"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

# Database connection defaults
POSTGRES_USER="${POSTGRES_USER:-wordflow}"
POSTGRES_DB="${POSTGRES_DB:-wordflow}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[BACKUP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
error(){ echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2; }

# -- Pre-flight --
mkdir -p "$BACKUP_DIR"

log "Starting database backup..."

# -- Step 1: Create Backup --
log "Dumping PostgreSQL database to ${BACKUP_FILE}..."

if docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/deploy/docker-compose.prod.yml" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
    2>/dev/null | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log "Backup created: ${BACKUP_DIR}/${BACKUP_FILE} (${BACKUP_SIZE})"
else
    error "Backup failed! Database may not be running."
    exit 1
fi

# -- Step 2: Verify Backup --
log "Verifying backup integrity..."
if gunzip -t "${BACKUP_DIR}/${BACKUP_FILE}" 2>/dev/null; then
    log "Backup integrity verified."
else
    warn "Backup integrity check failed. File may be corrupted."
fi

# -- Step 3: Upload to MinIO (if mc is available) --
if command -v mc >/dev/null 2>&1; then
    log "Uploading backup to MinIO..."
    mc cp "${BACKUP_DIR}/${BACKUP_FILE}" "wordflow/backups/${BACKUP_FILE}" 2>/dev/null \
        && log "Backup uploaded to MinIO: wordflow/backups/${BACKUP_FILE}" \
        || warn "MinIO upload failed (non-fatal)."
else
    log "MinIO client (mc) not found. Skipping remote upload."
fi

# -- Step 4: Clean Old Backups --
log "Cleaning backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "wordflow_*.sql.gz" -mtime +${RETENTION_DAYS} -print -delete 2>/dev/null | wc -l)
log "Removed ${DELETED} old backup(s)."

# -- Summary --
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "wordflow_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "============================================"
log "  Backup Complete!"
log "  File: ${BACKUP_FILE}"
log "  Local backups: ${BACKUP_COUNT} (${TOTAL_SIZE} total)"
log "============================================"
