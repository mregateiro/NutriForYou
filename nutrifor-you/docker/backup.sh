#!/bin/bash
# NutriForYou Database Backup Script
# Run via cron: 0 2 * * * /opt/nutrifor-you/docker/backup.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/nutriforyou_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Create compressed backup
echo "[$(date)] Starting database backup..."
pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
echo "[$(date)] Backup created: ${BACKUP_FILE}"

# Remove backups older than retention period
find "${BACKUP_DIR}" -name "nutriforyou_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"

# Verify backup integrity
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "[$(date)] Backup integrity verified: OK"
else
  echo "[$(date)] ERROR: Backup integrity check failed!" >&2
  exit 1
fi

echo "[$(date)] Backup complete: $(du -h "${BACKUP_FILE}" | cut -f1)"
