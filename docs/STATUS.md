# LeaveFlow — Status

**Last updated:** 2026-09-21 · **Current point:** Wave 1 complete (Phase 5 A, B, C and E-code merged); Wave 2 (Phase 5 D, Phases 6–10 files) starting.
Checklist view: [`PROGRESS.md`](PROGRESS.md).

## Completed
- Phase 0: Git 2.53.0 configured (`shaneshaguruge` / `shanesha@arozentech.com`, `main`, `autocrlf=input`); Node v24.14.0; npm 11.19.1; VS Code + 4 extensions; `gh` logged in; `docker run --rm hello-world` passed 2026-09-17 (admin account).
- Phase 0: dry run (`node hello.js` → `ready`), pipe lab (`ls lab0/*.txt | wc -l` → `3`), stack-trace lab (`break.js:2:31`), tried/expected/happened question.
- Phase 1: `docs/requirements.md` SRS v0.1 — 5 stakeholders, US-1…US-15, Given/When/Then, MoSCoW + Won't list, Q1–Q5, NFR-1…NFR-5 (commit c8f06ba).
- Phase 2: `docs/design.md`, `docs/api.md`, hand-drawn `docs/ERD.jpeg` checked against the schema, state machine + sequence diagrams (commit c8f06ba).
- Phase 3: v0 walking skeleton; curl lifecycle, 400s, 409 INVALID_STATE, DELETE cancel lab all run against a live server (commit d2ad4b0).
- Phase 4: repo on GitHub; issues #1–#10 (US-1…US-10); PR #11 cancel guard merged and closed issue #5; PR #12 root `.gitignore` + `docs/phase4-notes.md`; PR #13 real merge conflict resolved.
- Phase 5 A: PostgreSQL 16.14 (embedded-postgres), migrations 001–003, second `npm run migrate` silent, 3/3/4/2 seed rows, status CHECK enforced (SQLSTATE 23514) — PR #14.
- Phase 5 B: routes on the pg pool, parameterized SQL only, approve in one transaction, rollback proven, `pending_days`/`remaining_days`, better-sqlite3 removed, plain `npm ci` exit 0 — 23/23 checks — PR #15.
- Phase 5 C: bcryptjs login, 8-hour JWT, 401 NO_TOKEN/BAD_TOKEN/BAD_CREDENTIALS, GET /api/me, team inbox, full 403 matrix, Q1 decision (manager → own reports, HR_ADMIN → anyone) — 37/37 checks — PR #16.
- Phase 5 E (code): asyncHandler + errorHandler + validate + morgan + JSON 404; fixed API crash on DB restart and 500 code leak — 37/37 + 13/13 checks — PR #17.

## Skipped or blocked, and why
- Phase 0 `ssh -T git@github.com`: not reached — key generated, not added to GitHub (HTTPS via `gh` used instead).
- Phase 1 paper wireframe photo: not reached — needs a hand-drawn sketch.
- Phase 4 mentor review of PRs #11–#13: needs mentor — review skipped by decision, PRs merged without it.
- Phase 5 "Postgres 16 runs in Docker": needs admin for Docker — replaced by embedded-postgres (same PostgreSQL 16, same `DATABASE_URL`).
- Phase 5 reviews of PRs #14–#17: needs mentor — merged without review by decision.
- Phase 6 three seeded bugs: needs mentor — the mentor seeds them.
- Phase 7 compose run, `docker compose exec` migrations and volume survival proof: needs admin for Docker.
- Phase 8 ghcr image publish: needs admin for Docker (listed as blocked; release.yml still runs on GitHub's runners).
- Phase 8 branch protection: needs admin (repo settings) — instructions only, settings not changed.
- Phase 9 Render and AWS deployment: needs AWS or Render account and a paid resource.
- Phase 10 CloudWatch alarm, staged incident, snapshot restore: needs AWS account and mentor.
- Capstone: not reached.

## Still to do, and who
- Phase 0 — [me] decide on terminal fluency; [me] add SSH key to GitHub (optional).
- Phase 1 — [me] draw the Apply-for-leave wireframe on paper and save the photo in `docs/`.
- Phase 4 — [mentor] review merged PRs #11–#13 retrospectively.
- Phase 5 — [me] Part D React client; [me] Part E docs (`docs/api.md` to match the API, `docs/design.md` §4 text); [mentor] review #14–#17.
- Phase 6 — [me] leaveDays extraction, Jest, Supertest, Vitest, Playwright, test cases, bug report; [mentor] seed three bugs.
- Phase 7 — [me] Dockerfiles, nginx.conf, docker-compose.yml; [admin] Docker access so they can be run.
- Phase 8 — [me] ci.yml and release.yml green on GitHub; [admin] branch protection on `main`.
- Phase 9 — [me] deploy-render.md, deploy-aws.md, teardown-checklist.md; [me] real deploy once an account exists.
- Phase 10 — [me] pino logging, login rate limit, runbook and the other ops docs; [mentor] staged incident.
- Capstone — [me] half-day leave + holiday calendar; [mentor] customer and reviewer.

## Known issues
- Docker as `Shanesha`: `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
- Docker as `Shanesha` (2026-09-17, engine running): `permission denied while trying to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`
- `docs/design.md` §4 text diagram still reads `approve (manager)` / `reject (manager)`; the table below it and `api.md` say manager or HR_ADMIN.
- `docs/api.md` does not yet match the running API (`/balances` returns `id`, the doc says `leave_type_id`; `/health` now also returns `version` and `uptime`; JSON 404 for unknown endpoints is undocumented).
- HR_ADMIN can approve their own leave (design risk R5) — policy question for Nadeesha.
