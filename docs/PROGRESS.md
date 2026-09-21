# LeaveFlow — Progress against the Field Guide checklists

Every "Before you move on" checkbox in the guide (**95** in total: 78 in Phases 0–10, 17 in the Capstone), in the
guide's own words. `[x]` done and verified by running it · `[~]` done differently from the guide (reason given) ·
`[ ]` not done. **No PR has been reviewed by a human**, so every item that needs a review is `[ ]`.
Proofs for Phases 6, 7, 8 and 10 were re-run on 2026-09-21 against `main` @ `e0f3abf`. Details: [`STATUS.md`](STATUS.md).

## Summary

| Phase | Done `[x]` | Done differently `[~]` | Not done `[ ]` | Total |
|---|---:|---:|---:|---:|
| 0 Foundations & Setup | 4 | 2 | 1 | 7 |
| 1 Requirements | 6 | 0 | 1 | 7 |
| 2 Design & Modeling | 5 | 2 | 0 | 7 |
| 3 Build v0 | 7 | 0 | 0 | 7 |
| 4 Git & Collaboration | 5 | 0 | 2 | 7 |
| 5 The 3-Tier Build | 6 | 1 | 1 | 8 |
| 6 Testing & Quality | 6 | 0 | 1 | 7 |
| 7 Local Deployment (Docker) | 0 | 1 | 6 | 7 |
| 8 CI/CD | 2 | 0 | 4 | 6 |
| 9 Cloud Deployment | 0 | 0 | 8 | 8 |
| 10 Production Operations | 1 | 0 | 6 | 7 |
| Capstone (rubric 9 + checklist 8) | 0 | 0 | 17 | 17 |
| **Total** | **42** | **6** | **47** | **95** |

Row check: 42 + 6 + 47 = 95; every row's three columns add up to its total.

## Phase 0 — Foundations & Setup (7)
- [ ] I can navigate, create files, and use a pipe in the terminal without looking anything up — self-assessed; not claimed here
- [x] `git --version` works and my name/email are configured globally — git 2.53.0, `shaneshaguruge` / `shanesha@arozentech.com`
- [~] `node -v` prints v20.x in a freshly opened terminal — **v24.14.0** on purpose: Node 20 reached end-of-life in April 2026
- [x] `docker run --rm hello-world` succeeds — passed 2026-09-17 from the Windows `admin` account; Docker is unavailable to the `Shanesha` account
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
- [ ] A paper wireframe of the Apply-for-leave screen exists (photo saved) — text wireframes only; no photo yet

## Phase 2 — Design & Modeling (7)
- [x] Paper ERD drawn and reconciled with the canonical four-table schema (PKs and FKs labeled) — `docs/ERD.jpeg`, hand-drawn
- [~] Request state machine drawn with all four states and each transition's actor — committed version is digital; a paper version exists but is not committed yet
- [~] "Apply for leave" sequence diagram shows validate → balance check → insert → 201, in that order — committed version is digital; the uncommitted paper version has no final 201 arrow
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
- [x] You commit to it: from now on, every change to LeaveFlow goes through a branch and a PR — PRs #11–#24; nothing pushed to `main` directly

## Phase 5 — The 3-Tier Build (8)
- [~] Postgres 16 runs in Docker with a named volume, and npm run migrate is a no-op on the second run — **no Docker**: PostgreSQL 16.14 via `embedded-postgres` with a persistent data dir; second `npm run migrate` prints nothing
- [x] The full canonical schema (users, leave_types, leave_requests, leave_balances) exists via numbered migrations, seeds included — 001–004
- [x] All routes run on the pool with parameterized queries only — no string-built SQL anywhere
- [x] Approve updates status and balance in one transaction; over-budget requests get 409 INSUFFICIENT_BALANCE — rollback proven (PRs #15, #17)
- [x] Login returns an 8-hour JWT; missing/bad tokens get 401, and GET /api/me works with a valid one — 37/37 (PR #16)
- [x] The whole 403 matrix passes: owner-only cancel, manager approvals limited to their reports, HR sees all — 37/37 + Jest
- [x] In the browser: Ishara logs in and applies, Ruwan approves from the Approvals page, and Ishara's balance card updates — automated in Chromium by Playwright (proof in Phase 6)
- [ ] Five feature-branch PRs (Parts A–E) were reviewed and merged, and docs/api.md matches the running API — **needs mentor review** (merged as #14, #15, #16, #17, #21, #23 without review; api.md does match, #23)

## Phase 6 — Testing & Quality (7)
- [x] leaveDays is extracted to server/src/lib/leaveDays.js and the routes call it — `grep -n "require('../lib/leaveDays')" server/src/routes/*.js` → `balances.js:5`, `leaveRequests.js:6`
- [x] The Jest unit suite passes, including the (fixed) Vesak poya holiday case — `cd server && npx jest --runInBand --json` → 29 passed, 0 failed, incl. "leaveDays excludes Vesak poya from a spanning request"; CI test-api green: https://github.com/shaneshaguruge/leaveflow/actions/runs/35574470437
- [x] Supertest covers the leave-request happy path plus 400, 401, and 403, against a separate leaveflow_test database — same run, `DATABASE_URL=…/leaveflow_test`: "happy path: employee applies, sees it listed, manager approves, balance is deducted", "rejects end_date before start_date with 400", "rejects a missing token with 401", "forbids an EMPLOYEE approving a request with 403" all PASS
- [x] The ApplyLeaveForm Vitest test passes with vitest run — `cd client && npx vitest run --reporter=verbose` → 8 passed (5 in `ApplyLeaveForm.test.jsx`); CI test-client green: run 35574470437
- [x] The Playwright apply-approve spec passes with webServer booting both apps — `npx playwright test` on `main` @ `e0f3abf` → 3 passed (7.7s), incl. "employee applies, manager approves, employee sees APPROVED and her balance change"; not in CI
- [x] Five written test cases exist, and at least one bug report uses the full template — `grep -cE '^\| TC-0[0-9]' docs/test-cases.md` → 5 (TC-01…TC-05, written, not yet run by hand); `docs/bug-report-001.md` has Steps to reproduce / Expected / Actual
- [ ] You found, reported, and fixed all three seeded bugs via separate PRs — needs mentor to seed the bugs

## Phase 7 — Local Deployment (Docker) (7)
- [~] server/Dockerfile builds, with a .dockerignore keeping node_modules and .env out — built on **GitHub's runner**, not this PC: Release run https://github.com/shaneshaguruge/leaveflow/actions/runs/35574470431 (`docker buildx build … --push ./server`, success); `.dockerignore` checked with Docker's rules (`@balena/dockerignore`): `node_modules/`, `.env`, `.env.local`, `.pgdata/`, `*.db` EXCLUDED, `src/`, `package*.json` included
- [ ] You ran the API image manually with -p and -e DATABASE_URL and understand both flags — needs Docker
- [ ] client/Dockerfile is multi-stage and nginx.conf proxies /api to the api service — written (PR #22), but never built or run, so the proxy is unproven; needs Docker
- [ ] docker compose up --build starts db, api, and web; compose ps shows db healthy — needs Docker
- [ ] Migrations and seeds run via docker compose exec api … — needs Docker
- [ ] The new-machine test passes: fresh clone to working login at localhost:8080 in 5 minutes — needs Docker
- [ ] You verified data survives down/up and understand why down -v erases it — needs Docker (the embedded-postgres equivalent was verified in Phase 5 A)

## Phase 8 — CI/CD (6)
- [x] .github/workflows/ci.yml runs lint, test-api (with a Postgres service container), and test-client on every PR — all three jobs success on every PR since CI existed: #22 https://github.com/shaneshaguruge/leaveflow/actions/runs/35573736031, #23 https://github.com/shaneshaguruge/leaveflow/actions/runs/35574142412, #24 https://github.com/shaneshaguruge/leaveflow/actions/runs/35574409911
- [ ] You can explain why CI uses npm ci and why runners being disposable makes green trustworthy — yours to answer
- [x] release.yml pushes ghcr.io/…/leaveflow-api tagged with the SHA and :main on every merge — every merge since #22: runs 35573813742 (`:73705cd…`, `:main`), 35574206230 (`:19ee038…`, `:main`), 35574470431 (`:e0f3abf…`, `:main`), from `gh run view <id> --log` ("pushing ghcr.io/shaneshaguruge/leaveflow-api:<sha>")
- [ ] Branch protection on main requires all three checks plus one review — needs admin; steps in `docs/branch-protection.md`
- [ ] You ran the fire drill: red X blocked the merge, you read the log, fixed it, and green unlocked it — needs branch protection first
- [ ] The image with your latest merge SHA is visible under the repo's Packages — not proven: the push is in the Release log, but listing packages returns `You need at least read:packages scope to get a package's versions. (HTTP 403)`

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
- [x] The security self-audit table is verified: params, 403s, secrets, npm audit, rate limit — re-run locally: params → 25 `query(` calls, 0 with `${}` inside SQL; 403s → Ishara approves own, Ruwan cancels Ishara's, Ruwan approves own, Ishara → `/team/requests` all `403`; secrets → `.env` in any commit: 0, JWT secret in `git log -p`: 0; npm audit → server and client "found 0 vulnerabilities"; rate limit → 11th bad login `429 RATE_LIMITED`
- [ ] The login endpoint returns 429 after 10 attempts/minute in prod — no prod. Locally proven: 11th bad login → `{"error":{"code":"RATE_LIMITED",…}} [429]`
- [ ] Nadeesha's overlap feature shipped to prod through story → PR → CI → staging → release — not built

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
