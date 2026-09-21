-- Down path for migrations/006_half_day_and_holidays.sql. NOT run by the migration runner (it only reads
-- migrations/). Run by hand, e.g.: psql "$DATABASE_URL" -f server/src/db/down/006_half_day_and_holidays.down.sql
-- It refuses once any half day exists: dropping day_part would turn every 0.5 into a full day. After that point,
-- rollback means restoring the pre-migration backup or fixing forward (docs/capstone/design.md §5).
-- Holidays HR added in the app are lost: export them first (GET /api/holidays?year=…).
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM leave_requests WHERE day_part <> 'FULL') THEN
    RAISE EXCEPTION 'half-day requests exist: restore from backup or fix forward instead';
  END IF;
END $$;
DROP TABLE public_holidays;
ALTER TABLE leave_requests DROP COLUMN day_part;
DELETE FROM schema_migrations WHERE filename = '006_half_day_and_holidays.sql';
COMMIT;
