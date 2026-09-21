# LeaveFlow — Status

**Last updated:** 2026-09-21 · **Stopped at:** all three waves finished; checklist recounted. `main` = `e0f3abf` before this fix; CI and Release green on it; whole suite re-run locally on `main`.
Checklist view: [`PROGRESS.md`](PROGRESS.md) — **95** checkboxes in the guide: **42 done · 6 done differently · 47 not done**. No PR has been reviewed by a human.

| Phase | Done | Done differently | Not done | Total |
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

## Completed
- Phase 0: Git 2.53.0 configured (`shaneshaguruge` / `shanesha@arozentech.com`, `main`, `autocrlf=input`); Node v24.14.0; npm 11.19.1; VS Code + 4 extensions; `gh` logged in; `docker run --rm hello-world` passed 2026-09-17 (admin account).
- Phase 0: dry run (`node hello.js` → `ready`), pipe lab (`ls lab0/*.txt | wc -l` → `3`), stack-trace lab (`break.js:2:31`), tried/expected/happened question.
- Phase 1: `docs/requirements.md` SRS v0.1 — 5 stakeholders, US-1…US-15, Given/When/Then, MoSCoW + Won't list, Q1–Q5, NFR-1…NFR-5 (commit c8f06ba).
- Phase 2: `docs/design.md`, `docs/api.md`, hand-drawn `docs/ERD.jpeg`, state machine + sequence diagrams (commit c8f06ba).
- Phase 3: v0 walking skeleton; curl lifecycle, 400s, 409 INVALID_STATE, DELETE cancel lab, all run live (commit d2ad4b0).
- Phase 4: issues #1–#10; PR #11 cancel guard closed issue #5 (CLOSED, COMPLETED); PR #12 root `.gitignore` + `phase4-notes.md`; PR #13 real merge conflict resolved; all merged in order.
- Phase 5 A: PostgreSQL 16.14 via embedded-postgres; migrations 001–003; second `npm run migrate` silent; status CHECK enforced (SQLSTATE 23514) — PR #14.
- Phase 5 B: pg pool, parameterized SQL only, approve in one transaction with rollback proven, `pending_days`/`remaining_days`, better-sqlite3 removed, plain `npm ci` exit 0 — 23/23 live checks — PR #15.
- Phase 5 C: bcryptjs login, 8-hour JWT, 401/403 matrix, team inbox, Q1 decision (manager → own reports, HR_ADMIN → anyone) — 37/37 live checks — PR #16.
- Phase 5 E (code): asyncHandler/errorHandler/validate; fixed API crash on DB restart (57P01) and 500 code leak — 37/37 + 13/13 — PR #17.
- Phase 5 D: React 18 + Vite client (login, apply with live balance line, my requests + cancel, approvals, HR view), 360px — build ✓, oxlint ✓ — PR #21.
- Phase 5 E (docs): `api.md` rewritten from real responses; `design.md` §4/D3 say manager or HR_ADMIN — PR #23.
- Phase 6: `lib/leaveDays.js` + 2026 holidays incl. Vesak; Jest + Supertest 29/29 on `leaveflow_test`; Vitest 8/8; Playwright 3/3 (apply → approve → balance) — PRs #19, #21.
- Phase 6: `docs/test-cases.md` (TC-01…05) and `docs/bug-report-001.md` (real bug: API crash on PostgreSQL restart) — PR #19.
- Phase 6: migration 004 corrects the demo balance for the Medin poya holiday; convergence proven on a DB that had 001–003 — PR #19.
- Phase 7: `server/Dockerfile` + `.dockerignore`, multi-stage `client/Dockerfile`, `nginx.conf`, `docker-compose.yml` (with `TRUST_PROXY: "1"`) written — PR #22.
- Phase 7: `server/Dockerfile` built successfully by the Release workflow on GitHub's runner (not this PC) — runs 35573813742, 35574206230, 35574470431; `.dockerignore` excludes `node_modules/`, `.env`, `.pgdata/`, `*.db` (checked with `@balena/dockerignore`).
- Phase 8: `ci.yml` (lint, test-api with postgres:16 service container, test-client, `npm ci`) green on every PR since it existed (#22 run 35573736031, #23 run 35574142412, #24 run 35574409911) and on `main` (run 35574470437).
- Phase 8: `release.yml` pushed `ghcr.io/shaneshaguruge/leaveflow-api:<sha>` and `:main` — on every merge since #22: runs 35573813742, 35574206230, 35574470431 (tags `:73705cd…`, `:19ee038…`, `:e0f3abf…` + `:main`).
- Phase 8: `docs/branch-protection.md` with exact steps (settings not changed) — PR #22.
- Phase 9: `docs/deploy-render.md`, `docs/deploy-aws.md`, `docs/teardown-checklist.md` written (plans, nothing deployed) — PR #20.
- Phase 10 (local only, no prod): pino JSON logs with request ids, `authorization`/`cookie` redacted (raw token 0 times in log) — PR #20.
- Phase 10 (local only, no prod): login rate limit — 11th attempt → 429 `RATE_LIMITED`, can't be bypassed by spoofed `X-Forwarded-For`; `TRUST_PROXY` verified both ways — PR #20.
- Phase 10: `observability.md`, `runbook.md`, `postmortem-template.md`, `backup-restore-drill.md`, `security-audit.md` (audit rows verified locally) — PR #20.
- Wave 3 + recount: full suite on `main` @ `e0f3abf` — server lint ✓, Jest 29/29, client lint ✓, Vitest 8/8, build ✓, Playwright 3/3; security audit re-run (0 SQL built from variables, 4× 403, 0 secrets in history, npm audit 0/0, 429 on 11th login).

## Skipped or blocked, and why
- Phase 0 `ssh -T git@github.com`: not reached — key generated, not added to GitHub; HTTPS via `gh` used instead.
- Phase 1 paper wireframe photo: not reached — needs a hand-drawn sketch.
- Mentor review of PRs #11–#24: needs mentor — no PR has been reviewed by a human; this leaves Phase 4 items 3–4 and Phase 5 item 8 unticked.
- Phase 5 "Postgres 16 runs in Docker": needs admin for Docker — replaced by embedded-postgres (same PostgreSQL 16, same `DATABASE_URL`).
- Phase 6 three seeded bugs: needs mentor.
- Phase 6 manual execution of TC-01…TC-05: not reached — written, marked "not run yet".
- Phase 7 running the API image locally, `docker compose up`, `compose exec` migrations, new-machine test, volume survival: needs admin for Docker.
- Phase 7 client image build: needs admin for Docker (not built in CI either).
- Phase 8 branch protection and the red-X fire drill: needs admin (repo settings); instructions only.
- Phase 8 package listing check: needs a `read:packages` token scope; the push itself is proven by the Release log.
- Phase 9 Render and AWS deployment: needs AWS or Render account and a paid resource.
- Phase 10 CloudWatch alarm, SNS, snapshot restore drill: needs AWS account and a paid resource.
- Phase 10 staged incident: needs mentor.
- Phase 10 overlap feature (manager sees who else is off): not reached.
- Capstone: not reached.

## Still to do, and who
- Phase 0 — [me] add the SSH key to GitHub (optional); [me] self-assess terminal fluency.
- Phase 1 — [me] draw the Apply-for-leave wireframe on paper, save the photo in `docs/`.
- Phase 2 — [me] decide on the uncommitted `docs/` changes (deleted `state-machine.jpg`, `state-machine.png`, `sequence-diagram.png`; new paper photos `state machine.jpeg`, `Sequence digram.jpeg`) and commit them via a PR; the paper sequence diagram still needs its final 201 arrow.
- Phase 4–5 — [mentor] review merged PRs #11–#24; [me] ask Nadeesha to confirm the Q1 approval flow and R5 (HR approving own leave).
- Phase 6 — [mentor] seed three bugs; [me] find, report and fix them via PRs; [me] execute TC-01…TC-05 by hand.
- Phase 7 — [admin] give `Shanesha` Docker access (`net localgroup docker-users Shanesha /add`, sign out/in); [me] then run compose, migrations, new-machine and volume tests.
- Phase 8 — [admin] apply `docs/branch-protection.md`; [me] run the fire drill; [me] answer "why npm ci".
- Phase 9 — [me] create the Render/AWS accounts with a $10 budget alarm first, then follow `deploy-render.md` / `deploy-aws.md`; execute the teardown checklist.
- Phase 10 — [me] CloudWatch 5xx alarm, restore drill, overlap feature; [mentor] staged incident.
- Capstone — [me] half-day leave + holiday calendar; [mentor] customer and reviewer.

## Known issues
- Docker as `Shanesha`: `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
- Docker as `Shanesha` (2026-09-17, engine running): `permission denied while trying to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`
- Running `npm ci` in `server/` while `npm run db` is running fails — Windows locks the Postgres binaries in `node_modules/@embedded-postgres` (EPERM); stop the DB first or use `npm install`. It happened once on 2026-09-21 and briefly caused `read ECONNRESET` for new DB connections.
- GHCR package listing: `You need at least read:packages scope to get a package's versions. (HTTP 403)`
- A client-sent `X-Forwarded-For` with `TRUST_PROXY` unset logs one plain-text `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` warning per process (header correctly ignored).
- `server/src/lib/holidays.js`: 2026-05-02 is marked `TODO verify` (sources disagree); only 2026 is loaded, other years count weekends only.
- The client's live "= N working days" line counts weekends only; the server also excludes holidays and is the authority.
- HR "All requests" page shows `Employee #id` — `GET /api/leave-requests` returns no employee names.
- HR_ADMIN can approve their own leave (design risk R5) — policy question for Nadeesha.
- CI annotation: `The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026.`
