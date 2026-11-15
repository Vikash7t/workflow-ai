#!/usr/bin/env bash
# ==============================================================================
# Workflow AI — Disaster Recovery: Database Restore Script
# ==============================================================================
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not defined." >&2
  exit 1
fi

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <path-to-backup.dump>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file '${BACKUP_FILE}' does not exist." >&2
  exit 1
fi

echo "⚠️  WARNING: This will overwrite data in the target database specified by DATABASE_URL."
echo "Target backup: ${BACKUP_FILE}"
read -p "Type 'CONFIRM' to proceed with restore: " CONFIRMATION

if [ "${CONFIRMATION}" != "CONFIRM" ]; then
  echo "❌ Restore cancelled by user."
  exit 0
fi

echo "🔄 Restoring database from backup..."
pg_restore "${DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --single-transaction \
  "${BACKUP_FILE}"

echo "✅ Database restore successfully completed."
