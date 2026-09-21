# BUG-003 — A manager can reject leave for people who are not their reports

| | |
|---|---|
| **Title** | `PATCH /api/leave-requests/:id {"action":"reject"}` by a MANAGER succeeds for **any** pending request, including HR's and the manager's own; only `approve` checks "Not your report" |
| **Reported** | 2026-09-21, Phase 6 seeded bug hunt (branch `bughunt`), found by exploratory permission testing |
| **Component** | `server/src/routes/leaveRequests.js` — permission checks in `PATCH /:id` |
| **Severity** | **High** — broken access control (OWASP A01): any manager can decide another team's (or their own) leave; the decision is final and cannot be undone |
| **Priority** | **High** — security rule from `api.md` §3 ("reject: the requester's manager, or HR_ADMIN") |
| **Status** | **Fixed** in the PR from `fix/reject-not-your-report` into `bughunt`, with a regression test |

## Steps to reproduce

1. Log in as Dilini (`dilini@ceylonroots.lk`, HR_ADMIN, nobody's report) and apply:
   `POST /api/leave-requests` `{ "leave_type_id": 1, "start_date": "2026-10-14", "end_date": "2026-10-14" }` → `201`, note the id.
2. Log in as Ruwan (`ruwan@ceylonroots.lk`, MANAGER of Ishara and Kasun only).
3. `PATCH /api/leave-requests/<id>` `{ "action": "reject" }`.

## Expected

`403 {"error":{"code":"FORBIDDEN","message":"Not your report"}}`; the request stays PENDING — the same answer
Ruwan gets when he tries to **approve** it.

## Actual

`200` and the request is `REJECTED` with `decided_by = 1` (Ruwan). Exploratory run:
`PASS manager approves non-report (HR) → 403` but `FAIL manager rejects non-report (HR) → 403: got 200 expected 403`.
Ruwan can also reject his **own** request.

## Environment

- Windows 11 Pro, Node v24.14.0, PostgreSQL 16.14 (`npm run db`), API from branch `bughunt` @ `676e273` on port 4100
  against the `leaveflow_e2e` database

## Root cause and fix

The report check was `if (action === 'approve' && role === 'MANAGER' && manager_id !== req.user.id)`, so `reject`
skipped it. Both decisions need it: `action !== 'cancel'` (cancel has its own owner-only check). Regression test
"BUG-003 regression: a manager cannot reject a request from someone who is not their report (403)" covers a
non-report and the manager's own request and checks the request is still PENDING; it fails on the buggy code
(`Expected: 403, Received: 200`) and passes with the fix.

## Follow-up

- The 403 matrix tests should cover **every** action × role pair, not only `approve`.
