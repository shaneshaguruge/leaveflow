# BUG-004 — Pending leave for next year reduces this year's balance

| | |
|---|---|
| **Title** | `GET /api/balances` counts **every** PENDING request as "reserved" in the current year, including requests that start in another year, so "remaining" on the balance cards drops wrongly |
| **Reported** | 2026-09-21, Phase 6 seeded bug hunt (branch `bughunt`), found by reading `balances.js` and confirmed by an API test |
| **Component** | `server/src/routes/balances.js` — pending-days query |
| **Severity** | **Medium** — wrong balance shown to the employee and used by the apply form's "N remaining" preview; nothing is deducted wrongly in the database |
| **Priority** | **High** — employees plan next year's leave in Q4 (e.g. the New Year week), exactly when this shows |
| **Status** | **Fixed** in PR #48 (`fix/balance-pending-year` into the throwaway `bughunt` branch); the regression test is on `main` since PR #49 |

## Steps to reproduce

1. Log in as Ishara (`ishara@ceylonroots.lk` / `password123`); `GET /api/balances` → Annual
   `{"used_days":1,"pending_days":2,"remaining_days":11}`.
2. `POST /api/leave-requests` `{ "leave_type_id": 1, "start_date": "2027-01-11", "end_date": "2027-01-15" }` → `201`.
3. `GET /api/balances` again.

## Expected

The 2026 Annual card is unchanged (`pending_days: 2`, `remaining_days: 11`). A 2027 request reserves 2027 days;
`POST` already checks the balance per year (`EXTRACT(YEAR FROM start_date) = year`).

## Actual

`{"used_days":1,"pending_days":7,"remaining_days":6}` — the 5 days in January 2027 are subtracted from 2026.
Exploratory run: `FAIL 2026 reserved changed by 5`.

## Environment

- Windows 11 Pro, Node v24.14.0, PostgreSQL 16.14 (`npm run db`), API from branch `bughunt` @ `676e273` on port 4100
  against the `leaveflow_e2e` database

## Root cause and fix

`used_days` is read for the current year, but the pending query had no year condition. Fix: add
`AND EXTRACT(YEAR FROM start_date) = $2` (same rule as the `POST` balance check). Regression test
"BUG-004 regression: a pending request in another year does not reserve this year's balance" applies for a Mon–Fri
week in January of next year and checks `pending_days` / `remaining_days` do not move; it fails on the buggy code
(`Expected: 0, Received: 5` difference) and passes with the fix. The test computes the dates from the current year,
so it keeps working after 2026.

## Follow-up

- A request that **spans** New Year (e.g. 30 Dec–2 Jan) is charged entirely to its start year, both here and on
  approve. That is the documented rule today; worth confirming with HR.
