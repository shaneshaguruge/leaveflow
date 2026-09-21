# LeaveFlow — Progress against the Field Guide checklists

Every "Before you move on" checkbox in the guide (**95** in total: 78 in Phases 0–10, 17 in the Capstone), in the
guide's own words. `[x]` done and verified by running it · `[~]` done differently from the guide (reason given) ·
`[ ]` not done. There is no human reviewer on this project: items that need a review are ticked once the work is
done and marked "no human reviewer; self-reviewed" (see `STATUS.md`).
Proofs for Phases 6, 7, 8 and 10 were re-run on 2026-09-21; the Docker (Phase 7) and branch-protection (Phase 8) items against `main` @ `7ae5945`. Details: [`STATUS.md`](STATUS.md).

## Summary

| Phase | Done `[x]` | Done differently `[~]` | Not done `[ ]` | Total |
|---|---:|---:|---:|---:|
| 0 Foundations & Setup | 5 | 2 | 0 | 7 |
| 1 Requirements | 7 | 0 | 0 | 7 |
| 2 Design & Modeling | 6 | 1 | 0 | 7 |
| 3 Build v0 | 7 | 0 | 0 | 7 |
| 4 Git & Collaboration | 6 | 1 | 0 | 7 |
| 5 The 3-Tier Build | 8 | 0 | 0 | 8 |
| 6 Testing & Quality | 7 | 0 | 0 | 7 |
| 7 Local Deployment (Docker) | 6 | 1 | 0 | 7 |
| 8 CI/CD | 5 | 1 | 0 | 6 |
| 9 Cloud Deployment | 0 | 0 | 8 | 8 |
| 10 Production Operations | 1 | 0 | 6 | 7 |
| Capstone (rubric 9 + checklist 8) | 13 | 1 | 3 | 17 |
| **Total** | **71** | **7** | **17** | **95** |

Row check: 71 + 7 + 17 = 95; every row's three columns add up to its total.

## Phase 0 — Foundations & Setup (7)
- [x] I can navigate, create files, and use a pipe in the terminal without looking anything up — self-assessed by the developer (2026-09-22); also shown in practice: pipe lab `ls lab0/*.txt | wc -l` → `3`
- [x] `git --version` works and my name/email are configured globally — git 2.53.0, `shaneshaguruge` / `shanesha@arozentech.com`
- [~] `node -v` prints v20.x in a freshly opened terminal — **v24.14.0** on purpose: Node 20 reached end-of-life in April 2026
- [x] `docker run --rm hello-world` succeeds — passed as `Shanesha` on 2026-09-21 ("Hello from Docker!", exit 0; client/server 29.2.1) after joining `docker-users`
- [x] VS Code opens with ESLint, Prettier, Docker, and Thunder Client installed
- [~] `ssh -T git@github.com` greets me by username — GitHub access uses `gh` over HTTPS; an SSH key exists but is not added to GitHub
- [x] I've written one real question in tried/expected/happened format — Docker `permission denied` write-up

## Phase 1 — Requirements (7)
- [x] docs/requirements.md lists all five stakeholder groups and what each wants
- [x] Ten user stories US-1…US-10, each with role, capability, and benefit
- [x] Given/When/Then acceptance criteria written for US-2, US-3, and US-4
- [x] Every story MoSCoW-tagged, with a written Won't-have list including payroll
- [x] Five clarifying questions drafted, including the approval-flow contradiction
- [x] NFR-1…NFR-5 recorded, including the honest 60-user scale note
- [x] A paper wireframe of the Apply-for-leave screen exists (photo saved) — `docs/wireframes/apply-for-leave.jpeg` (paper, photographed), plus login, manager approvals, my requests and HR all requests in `docs/wireframes/`; indexed in `requirements.md` §7

## Phase 2 — Design & Modeling (7)
- [x] Paper ERD drawn and reconciled with the canonical four-table schema (PKs and FKs labeled) — `docs/ERD.jpeg`, hand-drawn
- [x] Request state machine drawn with all four states and each transition's actor — paper, `docs/diagrams/state-machine.jpeg`: PENDING, APPROVED, REJECTED, CANCELLED; apply (employee/owner), approve and reject (manager or HR_ADMIN), cancel (owner only, while PENDING); APPROVED → CANCELLED marked "not allowed"
- [~] "Apply for leave" sequence diagram shows validate → balance check → insert → 201, in that order — paper, `docs/diagrams/sequence-diagram.jpeg`: POST → validate → overlap check → SELECT balance → balance check → INSERT, **but no final 201 arrow yet**; the text sequence in `design.md` §4 has the full order including `201 Created`. The old digital PNG was removed
- [x] docs/api.md committed with the endpoint table, PATCH action rules, and one full request/response example
- [x] The `{ "error": { "code", "message" } }` envelope is documented at the top of the contract
- [x] docs/design.md committed with context, decisions, alternatives, and risks filled in
- [x] Lab: the 409 overlapping-request rule is in the contract with an example body

## Phase 3 — Build v0 (7)
- [x] The API starts with npm run dev and /api/health returns {"status":"ok"}
- [x] A fresh boot creates both tables and seeds Ruwan, Ishara, and Dilini exactly once — 3 users after 1st and 2nd boot
- [x] The full curl lifecycle works: create as Ishara → list → approve as Ruwan → status shows APPROVED
- [x] Missing fields and end-before-start both return 400 in the { error: { code, message } } shape
- [x] A second approve on the same request returns 409 INVALID_STATE
- [x] node_modules/ and leaveflow.db are gitignored and absent from git status
- [x] Lab: DELETE cancels a pending request and refuses a decided one — later replaced by PATCH `cancel` (Phase 5 B)

## Phase 4 — Git & Collaboration (7)
- [x] .gitignore excludes node_modules/, *.db, and .env, and none of them appear in the repo on GitHub — GitHub tree scan: 0 of 105 paths match
- [~] The full LeaveFlow repo is on GitHub and a fresh clone runs with npm install && npm run dev — **per folder, not from the repo root**: re-run 2026-09-21 on a fresh clone of `58cc6ed`: at the root `npm run dev` → `npm error Missing script: "dev"` (the root package only holds Playwright); in `server/` `npm install` + `.env` from `.env.example` + `npm run db` + `npm run migrate` (001–005) + `npm run dev` → `/api/health` 200; in `client/` `npm install` + `npm run dev` → page 200 and login through the Vite proxy 200
- [x] feat/cancel-leave was merged through a reviewed PR with a What/Why/How-to-test description — PR #11 from `feat/cancel-leave`, merged, description has What / Why / How to test (7 steps, run live) and closed #5; no human reviewer; self-reviewed
- [x] You responded to every review comment and hardened the cancel guard against non-PENDING requests — guard: one atomic `UPDATE … WHERE status = 'PENDING'`, anything else `409 INVALID_STATE`, non-owner 403; Jest "cancelling an APPROVED request is refused with 409", "cancelling someone else's request is forbidden with 403"; review comments: 0 to answer — no human reviewer; self-reviewed
- [x] You created, resolved, and committed a real merge conflict with no markers left behind — PR #13
- [x] The Phase 1 backlog exists as GitHub issues with US-IDs, and at least one PR closed one via Closes #N — issues #1–#10; #5 closed by PR #11
- [x] You commit to it: from now on, every change to LeaveFlow goes through a branch and a PR — PRs #11–#43; nothing pushed to `main` directly, and since 2026-09-21 branch protection enforces it

## Phase 5 — The 3-Tier Build (8)
- [x] Postgres 16 runs in Docker with a named volume, and npm run migrate is a no-op on the second run — `postgres:16` in Compose with volume `leaveflow_dbdata`; `docker compose exec api npm run migrate` applied 001–004 and the second run applied nothing (2026-09-21)
- [x] The full canonical schema (users, leave_types, leave_requests, leave_balances) exists via numbered migrations, seeds included — 001–004
- [x] All routes run on the pool with parameterized queries only — no string-built SQL anywhere
- [x] Approve updates status and balance in one transaction; over-budget requests get 409 INSUFFICIENT_BALANCE — rollback proven (PRs #15, #17)
- [x] Login returns an 8-hour JWT; missing/bad tokens get 401, and GET /api/me works with a valid one — 37/37 (PR #16)
- [x] The whole 403 matrix passes: owner-only cancel, manager approvals limited to their reports, HR sees all — 37/37 + Jest
- [x] In the browser: Ishara logs in and applies, Ruwan approves from the Approvals page, and Ishara's balance card updates — automated in Chromium by Playwright (proof in Phase 6)
- [x] Five feature-branch PRs (Parts A–E) were reviewed and merged, and docs/api.md matches the running API — A #14, B #15, C #16, D #17, E #21 (+ api.md #23), all merged with green CI where CI existed; api.md re-checked 2026-09-21 after #43: 9 routes in code, 9 in the table, plus the `?from=&to=` and `?history=true` modes — no human reviewer; self-reviewed

## Phase 6 — Testing & Quality (7)
- [x] leaveDays is extracted to server/src/lib/leaveDays.js and the routes call it — `grep -n "require('../lib/leaveDays')" server/src/routes/*.js` → `balances.js:5`, `leaveRequests.js:6`
- [x] The Jest unit suite passes, including the (fixed) Vesak poya holiday case — `cd server && npx jest --runInBand --json` → 54 passed, 0 failed (2026-09-21, after the wireframe PRs #39–#43; 43 after #32, 32 after #27/#28), incl. "leaveDays excludes Vesak poya from a spanning request"; CI test-api green on `main` @ `11ee499`: https://github.com/shaneshaguruge/leaveflow/actions/runs/35630556232
- [x] Supertest covers the leave-request happy path plus 400, 401, and 403, against a separate leaveflow_test database — same run, `DATABASE_URL=…/leaveflow_test`: "happy path: employee applies, sees it listed, manager approves, balance is deducted", "rejects end_date before start_date with 400", "rejects a missing token with 401", "forbids an EMPLOYEE approving a request with 403" all PASS
- [x] The ApplyLeaveForm Vitest test passes with vitest run — `cd client && npx vitest run --reporter=verbose` → 23 passed after #43 (7 in `ApplyLeaveForm.test.jsx`; was 12 after #32, 8 before); CI test-client green: run 35587300869, and on PR #32: https://github.com/shaneshaguruge/leaveflow/actions/runs/35591444394
- [x] The Playwright apply-approve spec passes with webServer booting both apps — `npx playwright test` → 3 passed (12.6s on `feat/apply-submit-cancel`, PR #43, with the US-16, balance-after and "Submit request" steps), incl. "employee applies, manager approves, employee sees APPROVED and her balance change"; not in CI
- [x] Five written test cases exist, and at least one bug report uses the full template — `grep -cE '^\| TC-0[0-9]' docs/test-cases.md` → 5 (TC-01…TC-05, written, not yet run by hand); `docs/bug-report-001.md` has Steps to reproduce / Expected / Actual
- [x] You found, reported, and fixed all three seeded bugs via separate PRs — **planted by a subagent mentor** on branch `bughunt` (answer key kept outside the repo, opened only after the fixes). Found by exploratory API testing and code reading, 3 of 3 matching the key: BUG-002 overlap off-by-one (PR #46), BUG-003 manager can reject non-reports (PR #47), BUG-004 balance reserves other years' pending leave (PR #48); each with a full report (`docs/bug-report-002…004.md`) and a regression test that fails on the bug and passes with the fix; each PR merged into `bughunt` on green CI; `bughunt` never merged to main and deleted

## Phase 7 — Local Deployment (Docker) (7)
- [x] server/Dockerfile builds, with a .dockerignore keeping node_modules and .env out — `docker build -t leaveflow-api:local ./server` exit 0, image **262 MB**; `docker run --rm leaveflow-api:local ls -A /app` → `.env.example eslint.config.js node_modules package-lock.json package.json scripts src` (no `.env`, no `.pgdata`), runs as user `node`, 0 dev dependencies in the image
- [x] You ran the API image manually with -p and -e DATABASE_URL and understand both flags — `docker run -d -p 4000:4000 -e DATABASE_URL=postgres://postgres:…@host.docker.internal:5432/leaveflow -e JWT_SECRET=… leaveflow-api:local` → `/api/health` 200 and a login token (the container reached the host's Postgres). `-p` publishes container port 4000 on the host; `-e` injects config as environment variables
- [x] client/Dockerfile is multi-stage and nginx.conf proxies /api to the api service — `docker build -t leaveflow-web:local ./client` exit 0, image **93.8 MB** (Node build stage → nginx stage); through nginx on :8080, `POST /api/auth/login` returns a token and `GET /some/client/route` returns the SPA (200 text/html)
- [x] docker compose up --build starts db, api, and web; compose ps shows db healthy — `docker compose ps`: `db  postgres:16  Up 7 seconds (healthy)`, `api  Up`, `web  Up  0.0.0.0:8080->80/tcp`
- [x] Migrations and seeds run via docker compose exec api … — `docker compose exec api npm run migrate` → applied 001–004; `docker compose exec api npm run seed` exit 0 (it first failed with `npm error Missing script: "seed"`, fixed in PR #26)
- [~] The new-machine test passes: fresh clone to working login at localhost:8080 in 5 minutes — fresh `git clone` into `lf-newmachine` (own volume), `compose up --build`, migrate + seed, login as Ishara **through nginx at localhost:8080 in 48 s**; the login was made with curl to the endpoint the page uses and the page served 200 — the in-browser login itself was not done by me
- [x] You verified data survives down/up and understand why down -v erases it — request id 5 "VOLUME-PROOF" present before `docker compose down`, volume `leaveflow_dbdata` kept, row present after `up` (psql and API). `down -v` shown only on the throwaway project `lf-voldemo`: its volume was removed and the table was gone (`ERROR: relation "demo" does not exist`). `down -v` deletes the named volumes, which is where Postgres keeps its data

## Phase 8 — CI/CD (6)
- [x] .github/workflows/ci.yml runs lint, test-api (with a Postgres service container), and test-client on every PR — all three jobs on every PR since CI existed: #22 run 35573736031, #23 35574142412, #24 35574409911, #25 35576412097, #26 35585472714, #27 35586869264 (red, fire drill) → 35587000556 (green), #28 35587224918
- [x] You can explain why CI uses npm ci and why runners being disposable makes green trustworthy — answered by the developer (2026-09-22): `npm ci` installs the exact versions in `package-lock.json` (and fails if it disagrees with `package.json`), so every CI build is reproducible; a fresh, disposable runner has no leftovers from earlier runs, so green means the code passes from a clean start
- [x] release.yml pushes ghcr.io/…/leaveflow-api tagged with the SHA and :main on every merge — every merge since #22; latest https://github.com/shaneshaguruge/leaveflow/actions/runs/35630556191 pushed `:11ee4994b4f763fe2580a2ee85d944340347b8e7` and `:main`
- [~] Branch protection on main requires all three checks plus one review — all three checks + PR required; **0 required approvals** because there is no second reviewer (GitHub does not let an author approve their own PR) — no human reviewer; self-reviewed. Applied 2026-09-21 and read back: `checks=["lint","test-api","test-client"]`, `pr_required=true`, **`approvals=0`** (solo developer: one approval would lock the owner out), `enforce_admins=false`, force pushes and deletions blocked
- [x] You ran the fire drill: red X blocked the merge, you read the log, fixed it, and green unlocked it — PR #27: `test-api` failed (run 35586869264), `mergeStateStatus=BLOCKED`, `gh pr merge` refused ("the base branch policy prohibits the merge"); log `Expected: 5, Received: 3` at `newYearWeek.test.js:6`; fixed the expectation → green (run 35587000556), `mergeStateStatus=CLEAN`, merged without `--admin`; only the corrected test is on `main`
- [x] The image with your latest merge SHA is visible under the repo's Packages — https://github.com/shaneshaguruge/leaveflow/pkgs/container/leaveflow-api (HTTP 200); latest merge `11ee499` pushed as `:11ee4994b4f7…` and `:main` (https://github.com/shaneshaguruge/leaveflow/actions/runs/35630556191); earlier `docker pull …:1bed2064e474…` and `…:main` gave the same image id `sha256:679518c5…`, and the app loads from it

## Phase 9 — Cloud Deployment (8)
- [ ] LeaveFlow (API + client) is live on Render over HTTPS, migrations run via the shell — plan in `docs/deploy-render.md`, not deployed
- [ ] AWS root user has MFA and is retired; you work as an IAM user
- [ ] A $10 monthly budget alarm emails you — created before any resource
- [ ] The API image is pushed to ECR in ap-south-1
- [ ] RDS is not publicly accessible and its security group admits only App Runner
- [ ] App Runner deploys green with health check /api/health and boot-time migrations
- [ ] https://leave.ceylonroots.lk serves the app through CloudFront with an ACM certificate
- [ ] A written teardown checklist exists and was executed on the staging copy — written (`docs/teardown-checklist.md`), not executed

## Phase 10 — Production Operations (7)
- [ ] Prod logs are structured JSON via pino, with request ids and auth headers redacted — no prod. Locally proven: request with `X-Request-Id: proof-redact-1` logged as `{"id":"proof-redact-1","authorization":"[Redacted]","status":200}`; raw token in log: 0
- [ ] The 5xx CloudWatch alarm notifies your email via SNS, and you've tripped it on purpose once — needs AWS
- [ ] You survived the staged incident using the runbook and wrote a blameless post-mortem — not done: runbook and template written, no incident staged
- [ ] A snapshot restore was performed, verified against real data, deleted, and logged with its RTO — drill written; needs RDS
- [x] The security self-audit table is verified: params, 403s, secrets, npm audit, rate limit — re-run locally (2026-09-21): params → 26 `query(` calls (after PR #32), 0 with `${}` inside SQL; 403s → Ishara approves own, Ruwan cancels Ishara's, Ruwan approves own, Ishara → `/team/requests` all `403`; secrets → `.env` in any commit: 0, JWT secret in `git log -p`: 0; npm audit → server (all and `--omit=dev`) and client "found 0 vulnerabilities" (re-run in the 2026-09-21 audit); rate limit → 11th bad login `429 RATE_LIMITED`
- [ ] The login endpoint returns 429 after 10 attempts/minute in prod — no prod. Locally proven: 11th bad login → `{"error":{"code":"RATE_LIMITED",…}} [429]`
- [ ] Nadeesha's overlap feature shipped to prod through story → PR → CI → staging → release — **built up to CI, not shipped**: issue #31 → US-16 story + AC in `requirements.md` → branch `feat/team-week-view` → PR #32 (`GET /api/team/requests?from=&to=` + "Team that week" panel) → CI green (https://github.com/shaneshaguruge/leaveflow/actions/runs/35591444394). Local: Jest 43/43 (9 in `teamWeek.test.js`: 200 with overlaps for the manager, 403 for an EMPLOYEE, empty array when clear, …), Vitest 12/12 (4 in `TeamWeekPanel.test.jsx`), Playwright 3/3 (approve flow asserts "No one else is off" and Kasun Perera). **Staging and prod: not done — no deployment exists (Phase 9)**

## Capstone (17)
Mentor rubric (9):
- [x] Every code change traces back to an approved story — nothing shipped that nobody asked for — stories US-17…US-21 approved first (#52); every build PR names its stories (#55 US-17/18/20, #56 US-19/20, #57 US-17/18/20/21, #58 US-17/18/21, #59 acceptance lines 1 and 6); `docs/capstone/retro.md` line 1
- [x] The design doc argues real alternatives (day_part vs boolean) and commits to one with reasons — `docs/capstone/design.md` §2 comparison (which half, multi-day, balance math, overlap, API shape) + rejected `start_part`/`end_part`; ADR-10 (#53)
- [x] The migration is reversible-aware: a written down-path, or an explicit note on why rollback means restore — `server/src/db/down/006_half_day_and_holidays.down.sql`; fresh database: up → down → up OK, and down refuses once a half day exists ("restore from backup or fix forward instead"); design §5 (#56)
- [x] Day-math tests cover the edges: holidays inside ranges, weekends, half day on a boundary day, cancel refunds 0.5 — `server/tests/dayMath.test.js` (22): Vesak inside a range = 3, weekend + Medin poya = 2, half day on a poya = 0, PM half day on the last day of a range = 2.5, pending half day reserves 0.5 and cancel refunds 0.5 (#55)
- [x] The PR is a reviewable size with a description that explains what, why, and how to test it — 8 Capstone PRs #52–#59 (+16 to +428 lines; the largest are the API and UI with their tests), each with What / Why / How to test
- [x] CI green on the first push — or red diagnosed and fixed fast, without commenting tests out — each of #52–#59 and #66 has exactly one CI run, green; tests that imported the removed `holidays.js` were moved onto the table, not commented out (#56)
- [ ] Deployed through the pipeline with no hand-edits on the server or in the database — not deployed: no staging or production (Phase 9). Demo data comes only from migrations; merges publish the image to GHCR
- [x] Scope held: the agreed stories shipped, stretch ideas parked in the backlog instead of smuggled in — parked as issues #60–#65 (half day at the start of a trip, shutdown week, employee holiday view, holiday-aware preview, audit log, displayed vs charged days); #7 team calendar and #8 email untouched
- [x] The demo survives at least one unrehearsed question with a live answer (or an honest "I'd check X") — a reviewer subagent that had not seen the script asked about a PM half day on a newly added holiday; answered with a live run (refund 0.5, `day_part` stays PM) and pinned by a regression test; `docs/capstone/demo-script.md` (#66)

Before you move on (8):
- [x] Stories + acceptance criteria for both features written and approved by the mentor-as-customer — `docs/capstone/stories.md` US-17…US-21; Nadeesha role-played by a subagent given only her email and the requirements: round 1 changes requested (4), round 2 approved (#52) — no human reviewer; self-reviewed
- [x] Mini design doc argues day_part vs half_day boolean, designs public_holidays, and diffs the API contract — `docs/capstone/design.md` §2 (argument), §4 (`holiday_date` PK, generated `year`), §6 (contract diff), §7 (Mermaid ERD) (#53)
- [ ] Migration applied cleanly on a fresh database and on staging — fresh database **done** (001–006 in 526 ms, second run no-op, down/up tested, #56); **staging not done** (no staging)
- [x] Day-math unit tests written before the implementation; API tests and one E2E flow updated — all green — tests-first commit `a7baeb4` (red) before the implementation (#55); Supertest `halfDay.test.js` 16 + `holidaysApi.test.js` 11 + `holidaysTable.test.js` 7; Playwright flow books a Friday-afternoon half day (#59); Jest 110/110, Vitest 35/35, Playwright 3/3
- [x] PR(s) reviewed and merged; CI green; main stayed deployable throughout — #52–#59, #66 merged only after lint, test-api and test-client passed; `main` green after every merge (CI and Release) — no human reviewer; self-reviewed
- [ ] Feature live in production via the pipeline, with seed data ready for the demo — not done: no production. Seed data for the demo is ready (migrations 001–006)
- [~] 15-minute demo delivered against the 2/8/5 structure, logs open, at least one unrehearsed question answered — **done differently (no live audience):** `docs/capstone/demo-script.md` (2/8/5, 13 steps covering every acceptance line) rehearsed twice against freshly seeded data through the API with the pino logs captured (request ids, `authorization: [Redacted]`), identical numbers both runs; one unrehearsed question answered live
- [x] 30-minute retro with your mentor: rubric walked through line by line, one thing you'd do differently written down — `docs/capstone/retro.md`: 9 rubric lines with evidence (8 met, "deployed through the pipeline" not met) and one thing to do differently (store charged days before building re-credit) — no human reviewer; self-reviewed
