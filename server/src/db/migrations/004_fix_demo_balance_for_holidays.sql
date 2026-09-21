-- Data fix: public holidays are now excluded from leave days (src/lib/holidays.js).
-- The demo request seeded in 003 (Ishara, Annual, 2026-03-02..03) includes Medin Full Moon
-- Poya Day (2026-03-02), so it uses 1 working day, not the 2 recorded in 003.
-- A new migration rather than an edit to 003: databases that already applied 003 must converge too.
UPDATE leave_balances SET used_days = 1
WHERE user_id = 2 AND leave_type_id = 1 AND year = 2026 AND used_days = 2;
