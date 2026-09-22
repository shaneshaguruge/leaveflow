# LeaveFlow — manual test cases (Phase 6)

Written from the acceptance criteria in `docs/requirements.md` §3 (US-2, US-3, US-4) and the PATCH rules in
`docs/api.md` §3. Run them in order, by hand, in the web app (or with an HTTP client against the API).

**Preconditions (run once before TC-01):** a freshly migrated database (`npm run migrate` on an empty database),
so the demo seed is in place. Everyone's password is `password123`. At that point, per the seed:

- Ishara Fernando (EMPLOYEE, manager Ruwan): Annual 1 used (2–3 Mar, 2 Mar is Medin poya — migration 004), Casual 1 PENDING (16 Nov), Sick 0.
- Ruwan Jayasuriya (MANAGER): Sick 1 used, Annual 2 PENDING working days (21–23 Dec; 23 Dec is Unduvap poya).

Day counts skip weekends and the public holidays in the `public_holidays` table (Q3, confirmed), so the
dates below are chosen to contain no holiday. The guide's example range 2–6 Mar 2026 is **not** used:
2 Mar 2026 is Medin Full Moon Poya Day, so it counts as 4 days, not 5.

**Run 2026-09-22** on a freshly migrated database (`leaveflow_e2e`, migrations 001–006) with an HTTP client against the
API, as allowed above: **5 of 5 pass**.

| ID    | Steps | Expected | Actual | Pass? |
|-------|-------|----------|--------|-------|
| TC-01 | Log in as Ishara. Apply for Annual leave Mon 9 Mar – Wed 11 Mar 2026, reason "Family visit". Open the balances page. (US-2, criterion 1) | Request listed with status PENDING. Annual shows 1 used, 3 reserved/pending, 10 remaining. | 201 PENDING; Annual 1 used, 3 reserved, 10 remaining | Pass |
| TC-02 | Log in as Ruwan. In the team inbox, approve Ishara's TC-01 request. Log back in as Ishara and open My requests and Balances. (US-4, criterion 1) | Status APPROVED; `decided_by` is Ruwan and `decided_at` is the time of approval. Annual shows 4 used, 0 pending, 10 remaining. | 200 APPROVED, decided by Ruwan Jayasuriya, `decided_at` set; Annual 4 used, 0 reserved, 10 remaining | Pass |
| TC-03 | As Ruwan, try to approve the TC-01 request again, then try to reject it (e.g. `PATCH /api/leave-requests/:id` with `approve`, then `reject`). (US-4, criterion 2) | Both refused with 409 "Request is not pending". Status stays APPROVED; Ishara's Annual used stays 4. | approve → 409 "Request is not pending", reject → 409 "Request is not pending"; still APPROVED, Annual used 4 | Pass |
| TC-04 | As Ishara, apply for Annual leave Mon 6 Jul – Fri 24 Jul 2026 (15 working days). (US-2, criterion 2) | Refused with 409 and a clear message: "Only 10 day(s) of this type left this year". No request is created. | 409 INSUFFICIENT_BALANCE "Only 10 day(s) of this type left this year"; request count unchanged (3 → 3) | Pass |
| TC-05 | As Ishara, open the balances page without applying for anything else. (US-3) | Annual 14 − 4 used = 10 remaining; Casual 7 with 1 day shown as reserved (the seeded 16 Nov request), 6 remaining; Sick 7 remaining. The pending Casual day is shown as reserved, not deducted as used. | Annual 4 used / 0 reserved / 10 left; Casual 0 used / 1 reserved / 6 left; Sick 0 / 0 / 7 | Pass |

A failed row becomes a bug report in `docs/bug-report-NNN.md`, using the template in `docs/bug-report-001.md`.

**Automated coverage of the same rules:** `server/tests/leaveRequests.test.js` checks the API side of TC-02
(approve + balance deducted), TC-03 (409 on a second approval) and TC-04 (409 INSUFFICIENT_BALANCE).
The manual cases add what those tests can't see: what the screens show the user.
