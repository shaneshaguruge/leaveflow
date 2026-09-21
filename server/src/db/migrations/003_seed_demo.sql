-- Demo leave requests and the balances they imply, so every table has seed data.
-- Balances only ever reflect APPROVED requests (used_days is a stored fact; remaining is computed).
-- All dates are weekdays, so used_days equals the working-day count.
INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason, status, decided_by, decided_at) VALUES
  -- Ishara: 2 Annual days (Mon-Tue), approved by her manager Ruwan
  (2, 1, '2026-03-02', '2026-03-03', 'Family wedding in Galle', 'APPROVED', 1, '2026-02-20 09:00:00+05:30'),
  -- Ruwan: 1 Sick day, approved by HR (Ruwan has no manager, so only HR_ADMIN can decide)
  (1, 3, '2026-02-09', '2026-02-09', 'Fever',                   'APPROVED', 3, '2026-02-10 10:30:00+05:30'),
  -- Ishara: 1 Casual day, waiting for Ruwan
  (2, 2, '2026-11-16', '2026-11-16', 'Bank appointment',        'PENDING',  NULL, NULL),
  -- Ruwan: 3 Annual days (Mon-Wed), waiting for HR
  (1, 1, '2026-12-21', '2026-12-23', 'Year-end family trip',    'PENDING',  NULL, NULL);

INSERT INTO leave_balances (user_id, leave_type_id, year, used_days) VALUES
  (2, 1, 2026, 2),   -- Ishara, Annual: 2 used -> 12 of 14 left
  (1, 3, 2026, 1);   -- Ruwan, Sick: 1 used -> 6 of 7 left
