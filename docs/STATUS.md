# LeaveFlow — Status

**Last updated:** 2026-09-21 · **Stopped at:** paper wireframes committed (PR #33) and the five wireframe gaps closed (PRs #39–#43); `main` = `11ee499`, CI and Release green. Not deployed anywhere (no staging, no prod).
Checklist view: [`PROGRESS.md`](PROGRESS.md) — **95** checkboxes in the guide: **52 done · 5 done differently · 38 not done**. No PR has been reviewed by a human.

| Phase | Done | Done differently | Not done | Total |
|---|---:|---:|---:|---:|
| 0 Foundations & Setup | 4 | 2 | 1 | 7 |
| 1 Requirements | 7 | 0 | 0 | 7 |
| 2 Design & Modeling | 6 | 1 | 0 | 7 |
| 3 Build v0 | 7 | 0 | 0 | 7 |
| 4 Git & Collaboration | 4 | 1 | 2 | 7 |
| 5 The 3-Tier Build | 7 | 0 | 1 | 8 |
| 6 Testing & Quality | 6 | 0 | 1 | 7 |
| 7 Local Deployment (Docker) | 6 | 1 | 0 | 7 |
| 8 CI/CD | 4 | 0 | 2 | 6 |
| 9 Cloud Deployment | 0 | 0 | 8 | 8 |
| 10 Production Operations | 1 | 0 | 6 | 7 |
| Capstone (rubric 9 + checklist 8) | 0 | 0 | 17 | 17 |
| **Total** | **52** | **5** | **38** | **95** |

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

- Docs refresh (PR 1 of 2 after the audit): branch-protection.md now matches the applied rule (0 approvals, admins not enforced, strict false); deploy-render/deploy-aws/security-audit/runbook say `TRUST_PROXY` is already read by the code; `npm run seed` documented; security-audit shows 25 `query(` calls (24 literal + 1 migration runner); design.md R4 and R7 marked done; requirements.md Q1 records the decision, still to confirm with Nadeesha.
- Phase 10 overlap feature (US-16, issue #31, PR #32): `GET /api/team/requests?from=&to=` returns APPROVED leave of the manager's own reports (HR_ADMIN: everyone) overlapping the range; EMPLOYEE 403; parameterized SQL. "Team that week" panel on each Approvals card, empty state "No one else is off". Seed 005 adds Kasun Perera (Ruwan's 2nd report). Jest 43/43, Vitest 12/12, Playwright 3/3 locally; CI https://github.com/shaneshaguruge/leaveflow/actions/runs/35591444394. Live curl: 200 `[{"employee_name":"Kasun Perera",…}]`, 200 `[]`, 403, 400, 401. **Not in staging or prod** — the Phase 10 checkbox stays unticked.
- US-4 reject now has automated tests: "US-4 reject: the manager rejects a PENDING request, nothing is deducted, and the decision is final" and "forbids an EMPLOYEE rejecting a request with 403" — Jest 34/34 locally.

- Phase 1–2: five paper wireframes committed to `docs/wireframes/` (login, apply-for-leave, manager-approvals, my-requests, hr-all-requests); paper state machine and sequence diagram in `docs/diagrams/`; the old digital `sequence-diagram.png`, `state-machine.jpg` and `state-machine.png` removed. Phase 1 is 7/7.

- Wireframe gaps closed, one PR each, each with tests and merged on green: HR names (#39, issue #34); HR Type filter + Decided by (#40, #35); Export CSV US-12 (#41, #36: `GET /api/reports/leave-requests.csv`, HR only, CSV-injection guarded); Approvals balance after / newest first / history (#42, #37); Apply "Submit request" + Cancel (#43, #38). Jest 54/54, Vitest 23/23, Playwright 3/3; CI https://github.com/shaneshaguruge/leaveflow/actions/runs/35630556232.
- Records correction 2026-09-21: Phase 4 "fresh clone runs with npm install && npm run dev" is now `[~]` (works in `server/` and `client/`, not from the root); Phase 8 branch protection is now `[ ]` (the "one review" part needs a human reviewer).

## Skipped or blocked, and why
- Phase 0 `ssh -T git@github.com`: not reached — key generated, not added to GitHub; HTTPS via `gh` used instead.
- Mentor review of PRs #11–#43: needs mentor — no PR has been reviewed by a human; leaves Phase 4 items 3–4 and Phase 5 item 8 unticked.
- Phase 6 three seeded bugs: needs mentor.
- Phase 6 manual execution of TC-01…TC-05: not reached — written, marked "not run yet".
- Phase 7 in-browser login during the new-machine test: not done by me (entering passwords in web forms is left to the user); proven through the same endpoint with curl.
- Phase 8 "one review" rule: approvals set to 0 by decision (solo developer; one approval would lock the owner out) — for the mentor to decide; the checkbox stays unticked until a review is required.
- Phase 9 Render and AWS deployment: needs AWS or Render account and a paid resource.
- Phase 10 CloudWatch alarm, SNS, snapshot restore drill: needs AWS account and a paid resource.
- Phase 10 staged incident: needs mentor.
- Phase 10 overlap feature: staging demo and prod release not done — no deployment exists (Phase 9); mentor review of PR #32 not done.
- Capstone: not reached.

## Still to do, and who
- Phase 0 — [me] add the SSH key to GitHub (optional); [me] self-assess terminal fluency.
- Phase 2 — [me] add the final `201 Created` arrow (API → Browser) to the paper sequence diagram, re-photograph it and replace `docs/diagrams/sequence-diagram.jpeg` via a PR.
- Phase 4 — [me] optional: a README and a root `dev` script so `npm install && npm run dev` works from the repo root.
- Phase 4–5 — [mentor] review merged PRs #11–#43; [me] ask Nadeesha to confirm Q1 and R5 (HR approving own leave).
- Phase 6 — [mentor] seed three bugs; [me] find, report and fix them via PRs; [me] run TC-01…TC-05 by hand.
- Phase 7 — [me] log in once in the browser at http://localhost:8080 to complete the new-machine item.
- Phase 8 — [me] answer "why npm ci"; [mentor] decide whether to require 1 approval.
- Phase 9 — [me] Render/AWS accounts with a $10 budget alarm first, then `deploy-render.md` / `deploy-aws.md`; execute the teardown checklist.
- Phase 10 — [me] CloudWatch 5xx alarm, restore drill, ship US-16 to staging then prod (after Phase 9) and reply to Nadeesha with the live link; [me] ask Nadeesha whether overlapping leave should also *warn* or *block*; [mentor] staged incident, review PR #32.
- Capstone — [me] half-day leave + holiday calendar; [mentor] customer and reviewer.

## Known issues
- Docker Desktop crashed on start: `starting services: initializing Inference manager: listening on unix://<HOME>\AppData\Local\Docker\run\dockerInference: remove …: The file cannot be accessed by the system.` Fixed by the user on 2026-09-21; a leftover folder `%LOCALAPPDATA%\Docker\run.stale-20260921` with two stale socket files remains.
- Running `npm ci` in `server/` while `npm run db` is running fails (EPERM on the Postgres binaries in `node_modules/@embedded-postgres`); stop the DB first or use `npm install`.
- `server/src/lib/holidays.js`: 2026-05-02 marked `TODO verify`; only 2026 is loaded.
- The apply form's live "= N working days" line and the My requests list count weekends only; the server also excludes holidays and is the authority (the HR and Approvals pages now show the server count).
- HR_ADMIN can approve their own leave (design risk R5) — policy question for Nadeesha.
- CI annotation: `The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026.`
