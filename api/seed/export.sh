#!/bin/bash
# ═══════════════════════════════════════════════════════════
# SDA Operation — Export Postgres data to SQL seed file
#
# วิธีใช้ (รันบนเครื่องเพื่อน):
#   chmod +x export.sh
#   ./export.sh
#
# หรือระบุ DATABASE_URL เอง:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/sda_operation ./export.sh
# ═══════════════════════════════════════════════════════════

set -e

# Default to local dev DB if DATABASE_URL not set
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/sda_operation}"
OUTPUT_FILE="$(dirname "$0")/seed_data.sql"

echo "═══ SDA Operation — Data Export ═══"
echo "Source DB: ${DB_URL%%@*}@***"
echo "Output:    ${OUTPUT_FILE}"
echo ""

# Export data only (no schema — schema comes from migrations)
# --data-only:    skip CREATE TABLE, indexes, etc.
# --inserts:      use INSERT INTO instead of COPY (more portable)
# --no-owner:     skip ownership commands
# --no-privileges: skip GRANT/REVOKE
# --exclude-table: skip migration tracking table
pg_dump "$DB_URL" \
  --data-only \
  --inserts \
  --no-owner \
  --no-privileges \
  --exclude-table='_migrations' \
  --exclude-table='password_reset_tokens' \
  > "$OUTPUT_FILE"

# Prepend header
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" << 'HEADER'
-- ═══════════════════════════════════════════════════════════
-- SDA Operation — Seed Data (exported from friend's DB)
-- Generated: TIMESTAMP_PLACEHOLDER
--
-- วิธี import:
--   node api/seed/import.js
-- หรือ:
--   psql $DATABASE_URL < api/seed/seed_data.sql
-- ═══════════════════════════════════════════════════════════

-- Disable FK checks during import
SET session_replication_role = 'replica';

HEADER

# Replace timestamp placeholder
sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$(date -u '+%Y-%m-%d %H:%M:%S UTC')/" "$TEMP_FILE" 2>/dev/null || \
  sed -i '' "s/TIMESTAMP_PLACEHOLDER/$(date -u '+%Y-%m-%d %H:%M:%S UTC')/" "$TEMP_FILE"
rm -f "${TEMP_FILE}.bak"

# Append the dump and re-enable FK
cat "$OUTPUT_FILE" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "-- Re-enable FK checks" >> "$TEMP_FILE"
echo "SET session_replication_role = 'origin';" >> "$TEMP_FILE"

mv "$TEMP_FILE" "$OUTPUT_FILE"

LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo "Done! ${LINE_COUNT} lines, ${FILE_SIZE}"
echo ""
echo "Next steps:"
echo "  1. git add api/seed/seed_data.sql"
echo "  2. git commit -m 'Add seed data from friend DB'"
echo "  3. git push"
echo "  4. บนเครื่องที่จะ deploy: node api/seed/import.js"
