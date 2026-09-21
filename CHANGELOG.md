# Changelog

All changes, grouped by Field Guide phase. Every entry is a merged pull request (merge time in UTC) or, before PRs
began, a direct commit. Dates come from `git log` and `gh pr list --state all`. Nothing is deployed: there is no
staging or production environment.

## Phase 1–2 — Requirements and design (2026-09-21)

- `c8f06ba` (commit, 05:43) — SRS `docs/requirements.md` (US-1…US-15, Given/When/Then, MoSCoW, Q1–Q5, NFR-1…5),
  `docs/design.md`, API contract `docs/api.md`, ERD photo, digital state machine and sequence diagrams
  (replaced by the paper versions in #33).
- GitHub issues #1–#10 (US-1…US-10) opened at 06:23.

## Phase 3 — Walking skeleton v0 (2026-09-21)

- `d2ad4b0` (commit, 06:18) — Express v0 on SQLite: health, create/list/approve, 400/409 errors, DELETE cancel lab.

## Phase 4 — Git and collaboration (2026-09-21)

- #11 (06:48) Cancel a pending request; guard against non-PENDING requests (closes #5).
- #12 (06:48) Root `.gitignore`.
- #13 (06:49) Real merge conflict on the health route, resolved.

## Phase 5 — Three-tier build (2026-09-21)

- #14 (06:54) PostgreSQL 16, pool, migration runner, schema and seed (Part A); embedded Postgres for local dev.
- #15 (06:58) API on the pool, approve in one transaction, balances with pending/remaining (Part B).
- #16 (07:03) JWT login, auth middleware, role rules: manager → own reports, HR_ADMIN → anyone (Part C).
- #17 (07:12) Central error handler, validation, pool error listener (Part E, code; fixes BUG-001).
- #21 (07:34) React 18 client: login, My leave, Approvals, All requests; Vitest; Playwright (Part D).
- #23 (07:42) `docs/api.md` rebuilt from real responses (Part E, docs).

## Phase 6 — Testing and quality (2026-09-21)

- #19 (07:26) `lib/leaveDays.js`, 2026 holidays, Jest + Supertest suite, test cases, BUG-001 report.
- #30 (10:53) Automated US-4 reject test; stale docs refreshed.
- Seeded bug hunt: mentor subagent planted 3 bugs on a throwaway `bughunt` branch; fixed there with regression tests —
  #46 (18:09) BUG-002 overlap off-by-one, #47 (18:11) BUG-003 missing 403 on reject, #48 (18:14) BUG-004 balance
  counted other years' pending leave. #49 (18:18) brought the reports and regression tests to `main`.

## Phase 7 — Docker (2026-09-21)

- #22 (07:37) Server and client Dockerfiles, nginx, Compose (db, api, web), CI and release workflows.
- #26 (09:51) `npm run seed` for the Compose step.

## Phase 8 — CI/CD (2026-09-21)

- Branch protection on `main` applied through the GitHub API before the fire drill: checks `lint`, `test-api`,
  `test-client`, PR required, 0 approvals.
- #27 (10:08) Fire drill: a failing New Year week test blocked the merge, fixed, merged on green.
- #28 (10:10) `413 PAYLOAD_TOO_LARGE` instead of a generic error.

## Phase 10 — Operations and the change request (2026-09-21)

- #20 (07:32) pino JSON logs with request ids and redaction, login rate limit (429 after 10/min), `TRUST_PROXY`,
  deploy/runbook/observability/restore/teardown docs (Phase 9–10 plans).
- #32 (10:58) US-16 "who else is off": `GET /api/team/requests?from=&to=` and the "Team that week" panel (closes #31).

## Wireframes and wireframe gaps (2026-09-21)

- #33 (16:44) Paper wireframes (5) and paper diagrams committed; Phase 1 complete.
- #39 (16:54) HR All requests shows employee names (closes #34).
- #40 (16:58) HR Type filter and "Decided by" (closes #35).
- #41 (17:03) Export CSV for HR, US-12 (closes #36).
- #42 (17:09) Approvals: balance after approval, newest first, history (closes #37).
- #43 (17:12) Apply form: "Submit request" and Cancel (closes #38).

## Capstone — half-day leave and public holidays (2026-09-21 UTC, 2026-09-22 Sri Lanka time)

- #52 (18:54) Stories US-17…US-21 with acceptance criteria, approved by Nadeesha (subagent) after two rounds.
- #53 (18:56) Mini design doc: `day_part` vs boolean, `public_holidays` (date as key), down path, API diff, ERD; ADR-10.
- #54 (18:58) Wireframes: half-day Apply form and HR holidays (SVG + PNG).
- #55 (19:03) Day math with half days, reserved/remaining, half-day overlap: tests committed first (red), then the code.
- #56 (19:07) Migration 006: `day_part`, `public_holidays` seeded with the 25 holidays of 2026; `holidays.js` reads the table; written down path.
- #57 (19:14) API: `day_part` on requests (Annual/Casual only), holiday named in refusals, AM+PM on one date, HR `/holidays` with re-credit on add.
- #58 (19:21) UI: Full day / Morning / Afternoon, AM/PM badges and half-day dates, HR Holidays screen.
- #59 (19:24) Playwright flow books a Friday-afternoon half day.
- #66 (19:33) Demo script (rehearsed twice), unrehearsed question answered live with a regression test, retro.
- Stretch ideas parked as issues #60–#65.

## Records

- #18 (07:14), #24 (07:45), #25 (08:10), #29 (10:15), #44 (17:16), #45 (17:49), #51 (18:37) — `docs/PROGRESS.md` and
  `docs/STATUS.md` updates with proof.
- #50 (18:35) Project docs: README, CHANGELOG, decision log, docs and bug-report indexes.
