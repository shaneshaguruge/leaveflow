# BUG-002 — A request that ends on the first day of another request is accepted

| | |
|---|---|
| **Title** | `POST /api/leave-requests` accepts a new request whose **end date** is the **start date** of the same person's existing PENDING/APPROVED request, so one day is booked twice |
| **Reported** | 2026-09-21, Phase 6 seeded bug hunt (branch `bughunt`), found by exploratory API testing |
| **Component** | `server/src/routes/leaveRequests.js` — overlap check in `POST /` |
| **Severity** | **Medium** — the same day is reserved twice, so the balance is over-reserved and the request history is inconsistent; the contract's `409 OVERLAPPING_REQUEST` rule (`api.md` §5) is broken |
| **Priority** | **High** — silent data error on the most common action (applying for leave) |
| **Status** | **Fixed** in the PR from `fix/overlap-boundary` into `bughunt`, with a regression test |

## Steps to reproduce

1. Log in as Kasun (`kasun@ceylonroots.lk` / `password123`).
2. `POST /api/leave-requests` `{ "leave_type_id": 1, "start_date": "2026-10-05", "end_date": "2026-10-07" }` → `201`.
3. `POST /api/leave-requests` `{ "leave_type_id": 1, "start_date": "2026-10-01", "end_date": "2026-10-05" }`.

## Expected

Step 3 returns `409 OVERLAPPING_REQUEST` ("These dates overlap your request #… (2026-10-05 to 2026-10-07)"):
both ranges include Mon 5 Oct. Date ranges are inclusive at both ends (`api.md` §5).

## Actual

Step 3 returns `201 Created`; 5 Oct is now in two requests. (The mirror case, a new request **starting** on an
existing request's end date, is correctly refused, which is why the existing test did not catch it.)
Exploratory run: `FAIL ending on existing start date overlaps → 409: got 201 expected 409`.

## Environment

- Windows 11 Pro, Node v24.14.0, PostgreSQL 16.14 (`npm run db`), API from branch `bughunt` @ `676e273` on port 4100
  against the `leaveflow_e2e` database

## Root cause and fix

Two inclusive ranges overlap when `existing.start_date <= new.end_date AND existing.end_date >= new.start_date`.
The query used `start_date < $3` (strict), so an existing request starting exactly on the new end date was missed.
Fix: `start_date <= $3`. Regression test "BUG-002 regression: a request ending ON an existing request's start date
overlaps (409)" also covers the identical single day and checks the day before/after stay bookable; it fails on the
buggy code (`Expected: 409, Received: 201`) and passes with the fix.

## Follow-up

- Boundary cases for every date comparison belong in tests: same day, day before, day after.
