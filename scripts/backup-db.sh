#!/usr/bin/env bash
# ==============================================================================
# Workflow AI — Disaster Recovery: Database Backup Script
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/workflow_ai_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not defined." >&2
  exit 1
fi

echo "📦 Starting PostgreSQL database backup..."
pg_dump "${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --file="${BACKUP_FILE}"

echo "✅ Backup completed successfully: ${BACKUP_FILE}"
echo "📊 Backup size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Retain only the last 7 daily backups
echo "🧹 Pruning backups older than 7 days..."
find "${BACKUP_DIR}" -name "workflow_ai_*.dump" -mtime +7 -delete || true
echo "✨ Disaster recovery backup cycle finished."
