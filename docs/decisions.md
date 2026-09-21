# Decision log (ADRs)

Short architecture decision records for LeaveFlow. Each entry: the decision, why, and where it happened.
Design-level decisions D1–D6 (3 tiers, 4 tables, state machine, one error shape, rules in the API, reports as
queries) are in [`design.md`](design.md) §2 and are not repeated here. Dates and PRs are from `git log` and GitHub.

| ADR | Date | Where | Status |
|---|---|---|---|
| 1 PostgreSQL instead of SQLite | 2026-09-21 | PR #14 | Accepted |
| 2 bcryptjs instead of bcrypt | 2026-09-21 | PR #14 | Accepted |
| 3 Embedded PostgreSQL for local dev before Docker worked | 2026-09-21 | PR #14 | Accepted; Docker Compose added in #22 |
| 4 Q1 approval rule: manager → own reports, HR_ADMIN → anyone | 2026-09-21 | PR #16 | Accepted; to confirm with Nadeesha |
| 5 One 400 code: `VALIDATION_ERROR` | 2026-09-21 | commit `c8f06ba` (contract), `d2ad4b0` (code) | Accepted |
| 6 Demo data lives in migrations | 2026-09-21 | PR #14, #26, #32 | Accepted |
| 7 Branch protection with 0 required approvals | 2026-09-21 | GitHub API, before PR #27 | Accepted |
| 8 Node 24 instead of Node 20 | 2026-09-21 | environment (Phase 0) | Accepted |
| 9 Proxy trust from the `TRUST_PROXY` env var | 2026-09-21 | PR #20 | Accepted |
| 10 Half days as `day_part` (FULL/AM/PM), holidays as a table keyed by date | 2026-09-22 | Capstone design PR | Accepted |

## ADR-1 PostgreSQL instead of SQLite

- **Context:** v0 (`d2ad4b0`) used SQLite (`better-sqlite3`), a single file, as the guide's Phase 3 does.
- **Decision:** move to PostgreSQL 16 with numbered migrations and a `schema_migrations` ledger (Phase 5 A).
- **Why:** several users write at once (transactions for approve + balance), production uses RDS Postgres, and
  every machine must replay the same schema steps. SQLite also needed a native build (`--ignore-scripts` workaround).
- **Consequence:** `DATABASE_URL` is the only DB setting; any Postgres 16 works (embedded, Compose, CI service, RDS).

## ADR-2 bcryptjs instead of bcrypt

- **Decision:** hash passwords with `bcryptjs`.
- **Why:** `bcrypt` needs C++ build tools, which this Windows machine does not have. `bcryptjs` is pure JavaScript and
  produces the same `$2b$` hashes, so the stored hashes stay compatible if we ever switch.
- **Cost:** slower hashing than native; irrelevant at 60 users.

## ADR-3 Embedded PostgreSQL for local dev before Docker worked

- **Context:** Docker was not usable from the developer's Windows account when Phase 5 started.
- **Decision:** `npm run db` starts a real PostgreSQL 16.14 from the `embedded-postgres` package (dev dependency,
  pinned `16.14.0-beta.17`) and creates the dev, test and e2e databases.
- **Consequence:** local dev, Jest and Playwright run without Docker. Once Docker worked, Compose (`postgres:16`,
  named volume) was added in #22 and verified in Phase 7; both paths are kept. Do not run `npm ci` in `server/` while
  the embedded server is running (Windows locks its binaries).

## ADR-4 Q1 approval rule

- **Context:** Nadeesha's email says both "team leads approve their own people's leave" and "every approval must come
  to me first" (requirements Q1).
- **Decision:** one step. A MANAGER approves or rejects only their own reports (`users.manager_id`); HR_ADMIN approves
  or rejects anyone. Only the owner cancels.
- **Why:** it matches the guide's Phase 5 build and needs no extra state. If Nadeesha wants "manager then HR", add a
  `MANAGER_APPROVED` state (`design.md` R3).
- **Follow-up:** BUG-003 (#47) showed the rule must be checked for **reject** as well as approve; a regression test
  covers it.

## ADR-5 One 400 code: `VALIDATION_ERROR`

- **Decision:** every malformed-input response is `400 VALIDATION_ERROR` (plus `BAD_TYPE` for an unknown leave type),
  not the guide's `VALIDATION`.
- **Why:** one code documented once in `api.md`, used by the contract (`c8f06ba`), the v0 code (`d2ad4b0`) and the
  validation middleware; clients branch on one value.

## ADR-6 Demo data lives in migrations

- **Decision:** seed users and demo requests are migrations (`002_seed.sql`, `003_seed_demo.sql`,
  `004_fix_demo_balance_for_holidays.sql`, `005_seed_second_report.sql`), not a separate seed script.
- **Why:** a fresh database gets the same demo world everywhere with one idempotent command; data fixes are new
  migrations, never edits to applied ones (004). `npm run seed` (#26) exists for the guide's step and runs the same
  runner. Kasun (005, #32) was added so the "who else is off" panel has an overlap to show.
- **Consequence:** production would need the demo seeds removed from its path (`deploy-aws.md`).

## ADR-7 Branch protection with 0 required approvals

- **Decision:** `main` requires a PR and the checks `lint`, `test-api`, `test-client`; required approvals **0**;
  admins not enforced; force pushes and deletions blocked.
- **Why:** solo developer. GitHub does not let an author approve their own PR, so 1 required approval would lock the
  only developer out. PRs are self-reviewed; CI is the gate.
- **Proof:** the fire drill (#27) was blocked by a red check and merged only after the fix, without `--admin`.
- **Revisit:** raise to 1 approval when a second person with write access joins.

## ADR-8 Node 24 instead of Node 20

- **Decision:** develop and build on Node 24 (`node:24-alpine` image), not the guide's Node 20.
- **Why:** Node 20 reached end-of-life in April 2026.

## ADR-9 Proxy trust from the `TRUST_PROXY` env var

- **Decision:** `app.js` sets Express `trust proxy` from `TRUST_PROXY` (number of hops); unset locally.
- **Why:** behind nginx, Render or CloudFront every request looks like it comes from the proxy, so the login rate limit
  would be shared by all users. An env var lets each environment set its hop count without code changes
  (Compose sets `1`). Unset, `X-Forwarded-For` is ignored and cannot be spoofed.

## ADR-10 Half days as `day_part`; public holidays as a table keyed by date

- **Context:** Capstone (Nadeesha): morning/afternoon half days costing 0.5, and a holiday calendar HR maintains.
- **Decision:** `leave_requests.day_part` (`FULL`/`AM`/`PM`, default `FULL`) describes the request's last day;
  `public_holidays(holiday_date PRIMARY KEY, name, year generated)` replaces the hard-coded list.
- **Why not a `half_day` boolean:** it can't say which half (AM + PM on one date would clash; managers can't see
  AM/PM) and is ambiguous on multi-day requests. **Why the date as key:** a date is a holiday or not; a surrogate id or
  `(date, name)` could count one date twice.
- **Details:** [`capstone/design.md`](capstone/design.md).
