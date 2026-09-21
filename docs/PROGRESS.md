# LeaveFlow — Progress against the Field Guide checklists

Each phase's "Before you move on" list, in the guide's own words.
`[x]` done and verified by running it · `[~]` done differently from the guide (reason given) · `[ ]` not done.
Only items that were actually run are ticked. Details and proof: [`STATUS.md`](STATUS.md).

## Phase 0 — Foundations & Setup
- [ ] I can navigate, create files, and use a pipe in the terminal without looking anything up — self-assessed; not claimed here
- [x] `git --version` works and my name/email are configured globally — git 2.53.0, `shaneshaguruge` / `shanesha@arozentech.com`
- [~] `node -v` prints v20.x in a freshly opened terminal — **v24.14.0** on purpose: Node 20 reached end-of-life in April 2026
- [x] `docker run --rm hello-world` succeeds — passed 2026-09-17 from the Windows `admin` account; Docker is unavailable to the `Shanesha` account
- [x] VS Code opens with ESLint, Prettier, Docker, and Thunder Client installed
- [~] `ssh -T git@github.com` greets me by username — GitHub access uses `gh` over HTTPS; an SSH key exists but is not added to GitHub
- [x] I've written one real question in tried/expected/happened format — Docker `permission denied` write-up

## Phase 1 — Requirements
- [x] docs/requirements.md lists all five stakeholder groups and what each wants
- [x] Ten user stories US-1…US-10, each with role, capability, and benefit
- [x] Given/When/Then acceptance criteria written for US-2, US-3, and US-4
- [x] Every story MoSCoW-tagged, with a written Won't-have list including payroll
- [x] Five clarifying questions drafted, including the approval-flow contradiction
- [x] NFR-1…NFR-5 recorded, including the honest 60-user scale note
- [ ] A paper wireframe of the Apply-for-leave screen exists (photo saved) — text wireframes only; no photo yet

## Phase 2 — Design & Modeling
- [x] Paper ERD drawn and reconciled with the canonical four-table schema (PKs and FKs labeled) — `docs/ERD.jpeg`, hand-drawn
- [~] Request state machine drawn with all four states and each transition's actor — `docs/state-machine.png` / `.jpg`, digital rather than paper
- [~] "Apply for leave" sequence diagram shows validate → balance check → insert → 201, in that order — `docs/sequence-diagram.png`, digital
- [x] docs/api.md committed with the endpoint table, PATCH action rules, and one full request/response example
- [x] The `{ "error": { "code", "message" } }` envelope is documented at the top of the contract
- [x] docs/design.md committed with context, decisions, alternatives, and risks filled in
- [x] Lab: the 409 overlapping-request rule is in the contract with an example body

## Phase 3 — Build v0
- [x] The API starts with npm run dev and /api/health returns {"status":"ok"}
- [x] A fresh boot creates both tables and seeds Ruwan, Ishara, and Dilini exactly once — 3 users after 1st and 2nd boot
- [x] The full curl lifecycle works: create as Ishara → list → approve as Ruwan → status shows APPROVED
- [x] Missing fields and end-before-start both return 400 in the { error: { code, message } } shape
- [x] A second approve on the same request returns 409 INVALID_STATE
- [x] node_modules/ and leaveflow.db are gitignored and absent from git status
- [x] Lab: DELETE cancels a pending request and refuses a decided one — later replaced by PATCH `cancel` (Phase 5 B)

## Phase 4 — Git & Collaboration
- [x] .gitignore excludes node_modules/, *.db, and .env, and none of them appear in the repo on GitHub
- [x] The full LeaveFlow repo is on GitHub and a fresh clone runs with npm install && npm run dev — needed `--ignore-scripts` while better-sqlite3 was installed; plain `npm ci` works since PR #15
- [~] feat/cancel-leave was merged through a reviewed PR with a What/Why/How-to-test description — PR #11 merged **without** mentor review (review skipped by decision)
- [~] You responded to every review comment and hardened the cancel guard against non-PENDING requests — guard hardened (atomic `WHERE status = 'PENDING'`); no review comments existed to answer
- [x] You created, resolved, and committed a real merge conflict with no markers left behind — PR #13
- [x] The Phase 1 backlog exists as GitHub issues with US-IDs, and at least one PR closed one via Closes #N — issues #1–#10; #5 closed by PR #11
- [x] You commit to it: from now on, every change to LeaveFlow goes through a branch and a PR — every change since has gone through a PR

## Phase 5 — The 3-Tier Build
- [~] Postgres 16 runs in Docker with a named volume, and npm run migrate is a no-op on the second run — **no Docker**: PostgreSQL 16.14 via `embedded-postgres` with a persistent data dir; second `npm run migrate` prints nothing
- [x] The full canonical schema (users, leave_types, leave_requests, leave_balances) exists via numbered migrations, seeds included — 001–004
- [x] All routes run on the pool with parameterized queries only — no string-built SQL anywhere — also re-checked in `docs/security-audit.md`
- [x] Approve updates status and balance in one transaction; over-budget requests get 409 INSUFFICIENT_BALANCE — rollback proven (PR #15, #17)
- [x] Login returns an 8-hour JWT; missing/bad tokens get 401, and GET /api/me works with a valid one — 37/37 (PR #16)
- [x] The whole 403 matrix passes: owner-only cancel, manager approvals limited to their reports, HR sees all — 37/37 + Jest
- [x] In the browser: Ishara logs in and applies, Ruwan approves from the Approvals page, and Ishara's balance card updates — automated in Chromium by the Playwright spec, 3/3 on `main`
- [~] Five feature-branch PRs (Parts A–E) were reviewed and merged, and docs/api.md matches the running API — merged as #14, #15, #16, #17, #21, #23 **without review**; api.md rewritten from real responses (#23)

## Phase 6 — Testing & Quality
- [x] leaveDays is extracted to server/src/lib/leaveDays.js and the routes call it — PR #19
- [x] The Jest unit suite passes, including the (fixed) Vesak poya holiday case — 29/29 on `main` and in CI
- [x] Supertest covers the leave-request happy path plus 400, 401, and 403, against a separate leaveflow_test database
- [x] The ApplyLeaveForm Vitest test passes with vitest run — 8/8
- [x] The Playwright apply-approve spec passes with webServer booting both apps — 3/3, run on `main`
- [~] Five written test cases exist, and at least one bug report uses the full template — both exist; the five cases are written but **not yet executed by hand**
- [ ] You found, reported, and fixed all three seeded bugs via separate PRs — needs mentor to seed bugs

## Phase 7 — Local Deployment (Docker)
- [~] server/Dockerfile builds, with a .dockerignore keeping node_modules and .env out — built by the Release workflow on GitHub's runner (not on this PC)
- [ ] You ran the API image manually with -p and -e DATABASE_URL and understand both flags — needs Docker
- [~] client/Dockerfile is multi-stage and nginx.conf proxies /api to the api service — written (PR #22), never built
- [ ] docker compose up --build starts db, api, and web; compose ps shows db healthy — needs Docker
- [ ] Migrations and seeds run via docker compose exec api … — needs Docker
- [ ] The new-machine test passes: fresh clone to working login at localhost:8080 in 5 minutes — needs Docker
- [ ] You verified data survives down/up and understand why down -v erases it — needs Docker (the embedded-postgres equivalent was verified in Part A)

## Phase 8 — CI/CD
- [x] .github/workflows/ci.yml runs lint, test-api (with a Postgres service container), and test-client on every PR — green on #22 and #23
- [ ] You can explain why CI uses npm ci and why runners being disposable makes green trustworthy — yours to answer
- [x] release.yml pushes ghcr.io/…/leaveflow-api tagged with the SHA and :main on every merge — Release runs 35573813742 and 35574206230
- [ ] Branch protection on main requires all three checks plus one review — needs admin; steps in `docs/branch-protection.md`
- [ ] You ran the fire drill: red X blocked the merge, you read the log, fixed it, and green unlocked it — needs branch protection first
- [~] The image with your latest merge SHA is visible under the repo's Packages — pushed per the Release log; the listing check needs a `read:packages` token scope

## Phase 9 — Cloud Deployment
- [ ] LeaveFlow (API + client) is live on Render over HTTPS, migrations run via the shell — plan in `docs/deploy-render.md`, not deployed
- [ ] AWS root user has MFA and is retired; you work as an IAM user
- [ ] A $10 monthly budget alarm emails you — created before any resource
- [ ] The API image is pushed to ECR in ap-south-1
- [ ] RDS is not publicly accessible and its security group admits only App Runner
- [ ] App Runner deploys green with health check /api/health and boot-time migrations
- [ ] https://leave.ceylonroots.lk serves the app through CloudFront with an ACM certificate
- [ ] A written teardown checklist exists and was executed on the staging copy — written (`docs/teardown-checklist.md`), not executed

## Phase 10 — Production Operations
- [~] Prod logs are structured JSON via pino, with request ids and auth headers redacted — implemented and verified **locally** (PR #20); no prod
- [ ] The 5xx CloudWatch alarm notifies your email via SNS, and you've tripped it on purpose once
- [ ] You survived the staged incident using the runbook and wrote a blameless post-mortem — runbook and template written; needs mentor
- [ ] A snapshot restore was performed, verified against real data, deleted, and logged with its RTO — drill written; needs RDS
- [~] The security self-audit table is verified: params, 403s, secrets, npm audit, rate limit — verified **locally** (`docs/security-audit.md`)
- [~] The login endpoint returns 429 after 10 attempts/minute in prod — verified **locally**, incl. behind a simulated proxy
- [ ] Nadeesha's overlap feature shipped to prod through story → PR → CI → staging → release — not built

## Capstone
- [ ] Not reached
