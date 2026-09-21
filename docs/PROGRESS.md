# LeaveFlow — Progress against the Field Guide checklists

Every "Before you move on" checkbox in the guide (**95** in total: 78 in Phases 0–10, 17 in the Capstone), in the
guide's own words. `[x]` done and verified by running it · `[~]` done differently from the guide (reason given) ·
`[ ]` not done. **No PR has been reviewed by a human**, so every item that needs a review is `[ ]`.
Proofs for Phases 6, 7, 8 and 10 were re-run on 2026-09-21; the Docker (Phase 7) and branch-protection (Phase 8) items against `main` @ `7ae5945`. Details: [`STATUS.md`](STATUS.md).

## Summary

| Phase | Done `[x]` | Done differently `[~]` | Not done `[ ]` | Total |
|---|---:|---:|---:|---:|
| 0 Foundations & Setup | 4 | 2 | 1 | 7 |
| 1 Requirements | 7 | 0 | 0 | 7 |
| 2 Design & Modeling | 6 | 1 | 0 | 7 |
| 3 Build v0 | 7 | 0 | 0 | 7 |
| 4 Git & Collaboration | 5 | 0 | 2 | 7 |
| 5 The 3-Tier Build | 7 | 0 | 1 | 8 |
| 6 Testing & Quality | 6 | 0 | 1 | 7 |
| 7 Local Deployment (Docker) | 6 | 1 | 0 | 7 |
| 8 CI/CD | 4 | 1 | 1 | 6 |
| 9 Cloud Deployment | 0 | 0 | 8 | 8 |
| 10 Production Operations | 1 | 0 | 6 | 7 |
| Capstone (rubric 9 + checklist 8) | 0 | 0 | 17 | 17 |
| **Total** | **53** | **5** | **37** | **95** |

Row check: 53 + 5 + 37 = 95; every row's three columns add up to its total.

## Phase 0 — Foundations & Setup (7)
- [ ] I can navigate, create files, and use a pipe in the terminal without looking anything up — self-assessed; not claimed here
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
- [x] The full LeaveFlow repo is on GitHub and a fresh clone runs with npm install && npm run dev — needed `--ignore-scripts` while better-sqlite3 was installed; plain `npm ci` works since PR #15
- [ ] feat/cancel-leave was merged through a reviewed PR with a What/Why/How-to-test description — **needs mentor review** (PR #11 has the description and is merged, but no human reviewed it)
- [ ] You responded to every review comment and hardened the cancel guard against non-PENDING requests — **needs mentor review** (the guard is hardened; there are no review comments to answer)
- [x] You created, resolved, and committed a real merge conflict with no markers left behind — PR #13
- [x] The Phase 1 backlog exists as GitHub issues with US-IDs, and at least one PR closed one via Closes #N — issues #1–#10; #5 closed by PR #11
- [x] You commit to it: from now on, every change to LeaveFlow goes through a branch and a PR — PRs #11–#28; nothing pushed to `main` directly, and since 2026-09-21 branch protection enforces it

## Phase 5 — The 3-Tier Build (8)
- [x] Postgres 16 runs in Docker with a named volume, and npm run migrate is a no-op on the second run — `postgres:16` in Compose with volume `leaveflow_dbdata`; `docker compose exec api npm run migrate` applied 001–004 and the second run applied nothing (2026-09-21)
- [x] The full canonical schema (users, leave_types, leave_requests, leave_balances) exists via numbered migrations, seeds included — 001–004
- [x] All routes run on the pool with parameterized queries only — no string-built SQL anywhere
- [x] Approve updates status and balance in one transaction; over-budget requests get 409 INSUFFICIENT_BALANCE — rollback proven (PRs #15, #17)
- [x] Login returns an 8-hour JWT; missing/bad tokens get 401, and GET /api/me works with a valid one — 37/37 (PR #16)
- [x] The whole 403 matrix passes: owner-only cancel, manager approvals limited to their reports, HR sees all — 37/37 + Jest
- [x] In the browser: Ishara logs in and applies, Ruwan approves from the Approvals page, and Ishara's balance card updates — automated in Chromium by Playwright (proof in Phase 6)
- [ ] Five feature-branch PRs (Parts A–E) were reviewed and merged, and docs/api.md matches the running API — **needs mentor review** (merged as #14, #15, #16, #17, #21, #23, #28 without review; api.md matches the routes, checked in the 2026-09-21 audit)

## Phase 6 — Testing & Quality (7)
- [x] leaveDays is extracted to server/src/lib/leaveDays.js and the routes call it — `grep -n "require('../lib/leaveDays')" server/src/routes/*.js` → `balances.js:5`, `leaveRequests.js:6`
- [x] The Jest unit suite passes, including the (fixed) Vesak poya holiday case — `cd server && npx jest --runInBand --json` → 43 passed, 0 failed (2026-09-21, after #30 reject tests and #32 US-16; was 32 after #27/#28), incl. "leaveDays excludes Vesak poya from a spanning request"; CI test-api green on `main` @ `7ae5945`: https://github.com/shaneshaguruge/leaveflow/actions/runs/35587300869
- [x] Supertest covers the leave-request happy path plus 400, 401, and 403, against a separate leaveflow_test database — same run, `DATABASE_URL=…/leaveflow_test`: "happy path: employee applies, sees it listed, manager approves, balance is deducted", "rejects end_date before start_date with 400", "rejects a missing token with 401", "forbids an EMPLOYEE approving a request with 403" all PASS
- [x] The ApplyLeaveForm Vitest test passes with vitest run — `cd client && npx vitest run --reporter=verbose` → 12 passed (5 in `ApplyLeaveForm.test.jsx`, 4 in `TeamWeekPanel.test.jsx`; was 8 before #32); CI test-client green: run 35587300869, and on PR #32: https://github.com/shaneshaguruge/leaveflow/actions/runs/35591444394
- [x] The Playwright apply-approve spec passes with webServer booting both apps — `npx playwright test` → 3 passed (10.1s on `feat/team-week-view`, PR #32, with the US-16 assertions; 8.8s in the 2026-09-21 audit), incl. "employee applies, manager approves, employee sees APPROVED and her balance change"; not in CI
- [x] Five written test cases exist, and at least one bug report uses the full template — `grep -cE '^\| TC-0[0-9]' docs/test-cases.md` → 5 (TC-01…TC-05, written, not yet run by hand); `docs/bug-report-001.md` has Steps to reproduce / Expected / Actual
- [ ] You found, reported, and fixed all three seeded bugs via separate PRs — needs mentor to seed the bugs

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
- [ ] You can explain why CI uses npm ci and why runners being disposable makes green trustworthy — yours to answer
- [x] release.yml pushes ghcr.io/…/leaveflow-api tagged with the SHA and :main on every merge — every merge since #22; latest https://github.com/shaneshaguruge/leaveflow/actions/runs/35587300686 pushed `:7ae59450125872e2c65aa992903beab55b06c2e1` and `:main`
- [~] Branch protection on main requires all three checks plus one review — applied 2026-09-21 and read back: `checks=["lint","test-api","test-client"]`, `pr_required=true`, **`approvals=0`** (solo developer: one approval would lock the owner out; the review rule is left as a note for the mentor), `enforce_admins=false`, force pushes and deletions blocked
- [x] You ran the fire drill: red X blocked the merge, you read the log, fixed it, and green unlocked it — PR #27: `test-api` failed (run 35586869264), `mergeStateStatus=BLOCKED`, `gh pr merge` refused ("the base branch policy prohibits the merge"); log `Expected: 5, Received: 3` at `newYearWeek.test.js:6`; fixed the expectation → green (run 35587000556), `mergeStateStatus=CLEAN`, merged without `--admin`; only the corrected test is on `main`
- [x] The image with your latest merge SHA is visible under the repo's Packages — https://github.com/shaneshaguruge/leaveflow/pkgs/container/leaveflow-api (HTTP 200); `docker pull …:1bed2064e474…` and `…:main` gave the same image id `sha256:679518c5…`, and the app loads from it

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
- [ ] You survived the staged incident using the runbook and wrote a blameless post-mortem — runbook and template written; needs mentor
- [ ] A snapshot restore was performed, verified against real data, deleted, and logged with its RTO — drill written; needs RDS
- [x] The security self-audit table is verified: params, 403s, secrets, npm audit, rate limit — re-run locally (2026-09-21): params → 26 `query(` calls (after PR #32), 0 with `${}` inside SQL; 403s → Ishara approves own, Ruwan cancels Ishara's, Ruwan approves own, Ishara → `/team/requests` all `403`; secrets → `.env` in any commit: 0, JWT secret in `git log -p`: 0; npm audit → server (all and `--omit=dev`) and client "found 0 vulnerabilities" (re-run in the 2026-09-21 audit); rate limit → 11th bad login `429 RATE_LIMITED`
- [ ] The login endpoint returns 429 after 10 attempts/minute in prod — no prod. Locally proven: 11th bad login → `{"error":{"code":"RATE_LIMITED",…}} [429]`
- [ ] Nadeesha's overlap feature shipped to prod through story → PR → CI → staging → release — **built up to CI, not shipped**: issue #31 → US-16 story + AC in `requirements.md` → branch `feat/team-week-view` → PR #32 (`GET /api/team/requests?from=&to=` + "Team that week" panel) → CI green (https://github.com/shaneshaguruge/leaveflow/actions/runs/35591444394). Local: Jest 43/43 (9 in `teamWeek.test.js`: 200 with overlaps for the manager, 403 for an EMPLOYEE, empty array when clear, …), Vitest 12/12 (4 in `TeamWeekPanel.test.jsx`), Playwright 3/3 (approve flow asserts "No one else is off" and Kasun Perera). **Staging and prod: not done — no deployment exists (Phase 9)**; no mentor review

## Capstone (17)
Mentor rubric (9):
- [ ] Every code change traces back to an approved story — nothing shipped that nobody asked for
- [ ] The design doc argues real alternatives (day_part vs boolean) and commits to one with reasons
- [ ] The migration is reversible-aware: a written down-path, or an explicit note on why rollback means restore
- [ ] Day-math tests cover the edges: holidays inside ranges, weekends, half day on a boundary day, cancel refunds 0.5
- [ ] The PR is a reviewable size with a description that explains what, why, and how to test it
- [ ] CI green on the first push — or red diagnosed and fixed fast, without commenting tests out
- [ ] Deployed through the pipeline with no hand-edits on the server or in the database
- [ ] Scope held: the agreed stories shipped, stretch ideas parked in the backlog instead of smuggled in
- [ ] The demo survives at least one unrehearsed question with a live answer (or an honest "I'd check X")

Before you move on (8):
- [ ] Stories + acceptance criteria for both features written and approved by the mentor-as-customer
- [ ] Mini design doc argues day_part vs half_day boolean, designs public_holidays, and diffs the API contract
- [ ] Migration applied cleanly on a fresh database and on staging
- [ ] Day-math unit tests written before the implementation; API tests and one E2E flow updated — all green
- [ ] PR(s) reviewed and merged; CI green; main stayed deployable throughout
- [ ] Feature live in production via the pipeline, with seed data ready for the demo
- [ ] 15-minute demo delivered against the 2/8/5 structure, logs open, at least one unrehearsed question answered
- [ ] 30-minute retro with your mentor: rubric walked through line by line, one thing you'd do differently written down
