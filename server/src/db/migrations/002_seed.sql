INSERT INTO leave_types (name, annual_allocation)
VALUES ('Annual', 14), ('Casual', 7), ('Sick', 7);
-- Everyone's password is 'password123' (bcrypt, cost 10 — the hash is precomputed above).
-- Generated with bcryptjs (same $2b$ format as bcrypt; no build tools needed on Windows).
INSERT INTO users (name, email, password_hash, role, manager_id) VALUES
  ('Ruwan Jayasuriya',   'ruwan@ceylonroots.lk',  '$2b$10$iiNtsix3ViOfofFUCJcwa.Rw1O8U7jYlMsM8pAokYTb59hHXpRWfu', 'MANAGER',  NULL),
  ('Ishara Fernando',    'ishara@ceylonroots.lk', '$2b$10$iiNtsix3ViOfofFUCJcwa.Rw1O8U7jYlMsM8pAokYTb59hHXpRWfu', 'EMPLOYEE', 1),
  ('Dilini Weerasinghe', 'dilini@ceylonroots.lk', '$2b$10$iiNtsix3ViOfofFUCJcwa.Rw1O8U7jYlMsM8pAokYTb59hHXpRWfu', 'HR_ADMIN', NULL);
