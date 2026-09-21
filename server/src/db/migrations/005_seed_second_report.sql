-- Demo data for US-16 (who else on the team is off): a second report for Ruwan, with approved leave
-- that overlaps Ishara's seeded PENDING request (Mon 16 Nov 2026), so the Approvals screen has
-- something to show. Password 'password123' like every seed user (same precomputed bcrypt hash).
INSERT INTO users (name, email, password_hash, role, manager_id)
SELECT 'Kasun Perera', 'kasun@ceylonroots.lk', '$2b$10$iiNtsix3ViOfofFUCJcwa.Rw1O8U7jYlMsM8pAokYTb59hHXpRWfu', 'EMPLOYEE', id
FROM users WHERE email = 'ruwan@ceylonroots.lk';

-- Kasun: 3 Annual days, Mon 16 - Wed 18 Nov 2026 (weekdays, no public holiday), approved by Ruwan.
INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason, status, decided_by, decided_at)
SELECT k.id, 1, '2026-11-16', '2026-11-18', 'Sister''s wedding in Matara', 'APPROVED', r.id, '2026-10-01 09:00:00+05:30'
FROM users k, users r WHERE k.email = 'kasun@ceylonroots.lk' AND r.email = 'ruwan@ceylonroots.lk';

INSERT INTO leave_balances (user_id, leave_type_id, year, used_days)
SELECT id, 1, 2026, 3 FROM users WHERE email = 'kasun@ceylonroots.lk';
