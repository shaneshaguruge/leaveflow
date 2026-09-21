# LeaveFlow — Status

**Last updated:** 2026-09-21 · **Stopped at:** Docker, Phase 7, Phase 8 admin items and a full read-only audit done; `main` = `7ae5945`, branch-protected; CI and Release green on it.
Checklist view: [`PROGRESS.md`](PROGRESS.md) — **95** checkboxes in the guide: **51 done · 6 done differently · 38 not done**. No PR has been reviewed by a human.

| Phase | Done | Done differently | Not done | Total |
|---|---:|---:|---:|---:|
| 0 Foundations & Setup | 4 | 2 | 1 | 7 |
| 1 Requirements | 6 | 0 | 1 | 7 |
| 2 Design & Modeling | 5 | 2 | 0 | 7 |
| 3 Build v0 | 7 | 0 | 0 | 7 |
| 4 Git & Collaboration | 5 | 0 | 2 | 7 |
| 5 The 3-Tier Build | 7 | 0 | 1 | 8 |
| 6 Testing & Quality | 6 | 0 | 1 | 7 |
| 7 Local Deployment (Docker) | 6 | 1 | 0 | 7 |
| 8 CI/CD | 4 | 1 | 1 | 6 |
| 9 Cloud Deployment | 0 | 0 | 8 | 8 |
| 10 Production Operations | 1 | 0 | 6 | 7 |
| Capstone (rubric 9 + checklist 8) | 0 | 0 | 17 | 17 |
| **Total** | **51** | **6** | **38** | **95** |

## Completed
- Phase 0: Git 2.53.0 configured (`shaneshaguruge` / `shanesha@arozentech.com`, `main`, `autocrlf=input`); Node v24.14.0; npm 11.19.1; VS Code + 4 extensions; `gh` logged in.
- Phase 0: `docker run --rm hello-world` as `Shanesha` → "Hello from Docker!", exit 0 (2026-09-21, after joining `docker-users` and signing in again).
- Phase 0: dry run (`node hello.js` → `ready`), pipe lab (`ls lab0/*.txt | wc -l` → `3`), stack-trace lab (`break.js:2:31`), tried/expected/happened question.
- Phase 1: `docs/requirements.md` SRS v0.1 — 5 stakeholders, US-1…US-15, Given/When/Then, MoSCoW + Won't list, Q1–Q5, NFR-1…NFR-5 (commit c8f06ba).
- Phase 2: `docs/design.md`, `docs/api.md`, hand-drawn `docs/ERD.jpeg`, state machine + sequence diagrams (commit c8f06ba).
- Phase 3: v0 walking skeleton; curl lifecycle, 400s, 409 INVALID_STATE, DELETE cancel lab, all run live (commit d2ad4b0).
- Phase 4: PR #11 cancel guard closed issue #5; PR #12 root `.gitignore`; PR #13 real merge conflict resolved.
- Phase 4: issues #1, #2, #3, #4, #9, #10 closed 2026-09-21, each with the delivering PRs and the proving tests in the closing comment; #6, #7, #8 left open (not built).
- Phase 5 A–E: Postgres migrations (#14), pg pool + transactions (#15), JWT + roles (#16), hardening (#17), React client (#21), api.md from real responses (#23).
- Phase 5: Postgres 16 in Docker Compose with named volume `leaveflow_dbdata`; second `docker compose exec api npm run migrate` applied nothing.
- Phase 6: `lib/leaveDays.js` + 2026 holidays; Jest + Supertest **32/32**; Vitest **8/8**; Playwright **3/3** — CI run https://github.com/shaneshaguruge/leaveflow/actions/runs/35587300869.
- Phase 6: `docs/test-cases.md` (TC-01…05, written) and `docs/bug-report-001.md` (real bug) — PR #19.
- Phase 7: `docker build` server → `leaveflow-api:local` **262 MB** (no `.env`/`.pgdata`, user `node`, 0 dev deps); client → `leaveflow-web:local` **93.8 MB** (multi-stage).
- Phase 7: API image run by hand with `-p 4000:4000 -e DATABASE_URL=…@host.docker.internal…` → health 200, login token.
- Phase 7: `docker compose up --build` → `db Up (healthy)`, `api Up`, `web Up 0.0.0.0:8080->80/tcp`; migrate applied 001–004 via `docker compose exec api`.
- Phase 7: `docker compose exec api npm run seed` failed (`npm error Missing script: "seed"`), fixed in PR #26, then exit 0.
- Phase 7: new-machine test — fresh clone, compose up, migrate + seed, login as Ishara through nginx at localhost:8080 in **48 s** (curl; in-browser login not done by me).
- Phase 7: volume proof — row "VOLUME-PROOF" survived `docker compose down`/`up`; `down -v` demonstrated only on throwaway project `lf-voldemo` (volume removed, table gone).
- Phase 8: CI green on every PR since #22, incl. #26, #27, #28, and on `main` (run 35587300869); Release pushed `:7ae5945…` and `:main` (run 35587300686).
- Phase 8: GHCR image visible at https://github.com/shaneshaguruge/leaveflow/pkgs/container/leaveflow-api (HTTP 200); `:1bed206…` and `:main` pulled as the same image id.
- Phase 8: branch protection on `main` applied and read back: checks `lint`, `test-api`, `test-client`; PR required; approvals 0; `enforce_admins=false`; no force pushes or deletions.
- Phase 8: fire drill PR #27 — red `test-api` (run 35586869264) → `BLOCKED`, `gh pr merge` refused → log `Expected: 5, Received: 3` → fix → green (run 35587000556) → `CLEAN` → merged without `--admin`.
- Phase 8 follow-up: 413 now returns `PAYLOAD_TOO_LARGE` (was generic `ERROR`), documented in api.md, 2 new Supertest tests — PR #28; verified live through nginx.
- Phase 9: `docs/deploy-render.md`, `docs/deploy-aws.md`, `docs/teardown-checklist.md` written (plans, nothing deployed) — PR #20.
- Phase 10 (local only, no prod): pino JSON logs with request ids and redaction; login 429 after 10/min; security audit re-run 2026-09-21 — PR #20.
- Audit 2026-09-21: server lint ✓, Jest 32/32, client lint ✓, Vitest 8/8, Playwright 3/3, npm audit 0/0/0, compose `/api/health` 200, no `.env`/`node_modules`/`.db` tracked, 8/8 routes match api.md.

## Skipped or blocked, and why
- Phase 0 `ssh -T git@github.com`: not reached — key generated, not added to GitHub; HTTPS via `gh` used instead.
- Phase 1 paper wireframe photo: in progress by the user (not yet committed).
- Mentor review of PRs #11–#28: needs mentor — no PR has been reviewed by a human; leaves Phase 4 items 3–4 and Phase 5 item 8 unticked.
- Phase 6 three seeded bugs: needs mentor.
- Phase 6 manual execution of TC-01…TC-05: not reached — written, marked "not run yet".
- Phase 7 in-browser login during the new-machine test: not done by me (entering passwords in web forms is left to the user); proven through the same endpoint with curl.
- Phase 8 "one review" rule: approvals set to 0 by decision (solo developer; one approval would lock the owner out) — for the mentor to decide.
- Phase 9 Render and AWS deployment: needs AWS or Render account and a paid resource.
- Phase 10 CloudWatch alarm, SNS, snapshot restore drill: needs AWS account and a paid resource.
- Phase 10 staged incident: needs mentor.
- Phase 10 overlap feature (manager sees who else is off): not reached.
- Capstone: not reached.

## Still to do, and who
- Phase 0 — [me] add the SSH key to GitHub (optional); [me] self-assess terminal fluency.
- Phase 1 — [me] commit `docs/wireframes/apply-for-leave.jpg` via a PR, then tick the box.
- Phase 2 — [me] decide on the uncommitted paper diagrams in `docs/` (the paper sequence diagram still needs its final 201 arrow).
- Phase 4–5 — [mentor] review merged PRs #11–#28; [me] ask Nadeesha to confirm Q1 and R5 (HR approving own leave).
- Phase 6 — [mentor] seed three bugs; [me] find, report and fix them via PRs; [me] run TC-01…TC-05 by hand; [me] add an automated reject test.
- Phase 7 — [me] log in once in the browser at http://localhost:8080 to complete the new-machine item.
- Phase 8 — [me] answer "why npm ci"; [mentor] decide whether to require 1 approval.
- Phase 9 — [me] Render/AWS accounts with a $10 budget alarm first, then `deploy-render.md` / `deploy-aws.md`; execute the teardown checklist.
- Phase 10 — [me] CloudWatch 5xx alarm, restore drill, overlap feature; [mentor] staged incident.
- Docs — [me] refresh the stale docs listed under Known issues.
- Capstone — [me] half-day leave + holiday calendar; [mentor] customer and reviewer.

## Known issues
- Docker Desktop crashed on start: `starting services: initializing Inference manager: listening on unix://<HOME>\AppData\Local\Docker\run\dockerInference: remove …: The file cannot be accessed by the system.` Fixed by the user on 2026-09-21; a leftover folder `%LOCALAPPDATA%\Docker\run.stale-20260921` with two stale socket files remains.
- Running `npm ci` in `server/` while `npm run db` is running fails (EPERM on the Postgres binaries in `node_modules/@embedded-postgres`); stop the DB first or use `npm install`.
- `docs/branch-protection.md` still describes 1 approval, `enforce_admins: true` and `strict: true`; the applied rule is 0 approvals, `enforce_admins: false`, `strict: false`.
- `docs/deploy-render.md` says there is no `npm run seed` (true before PR #26, stale now).
- `docs/deploy-render.md`, `docs/deploy-aws.md`, `docs/security-audit.md` and `docs/runbook.md` say to add `app.set('trust proxy', …)`; the code already reads the `TRUST_PROXY` environment variable.
- `docs/security-audit.md` counts 24 `query(` calls; there are 25 now.
- `docs/design.md` risks R4 (holiday list "added in Phase 6") and R7 ("Phase 5 code must be extended") describe work that is already done.
- `docs/requirements.md` lists Q1 as "Unconfirmed — BLOCKING"; `design.md`/`api.md` record the project decision (manager → own reports, HR_ADMIN → anyone), still unconfirmed by Nadeesha.
- `docs/requirements.md` §7 says "No paper photo exists yet" — true until the wireframe PR lands.
- US-4 "reject" has no automated test; verified live only (request #5 → REJECTED, 2026-09-21).
- `server/src/lib/holidays.js`: 2026-05-02 marked `TODO verify`; only 2026 is loaded.
- The client's live "= N working days" line counts weekends only; the server also excludes holidays and is the authority.
- HR "All requests" page shows `Employee #id` — the list endpoint returns no employee names.
- HR_ADMIN can approve their own leave (design risk R5) — policy question for Nadeesha.
- CI annotation: `The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026.`
