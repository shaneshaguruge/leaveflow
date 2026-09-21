# Capstone retro — half-day leave and public holidays

2026-09-22. The mentor's rubric, line by line, with the evidence, then one thing to do differently. Stages ran on the
embedded PostgreSQL, locally; there is no staging or production environment.

| # | Rubric line | Result | Evidence |
|---|---|---|---|
| 1 | Every code change traces back to an approved story | **Met** | Stories US-17…US-21 approved by Nadeesha (subagent, 2 rounds) in #52 before any design or code. Every PR names its stories: #55 (US-17/18/20), #56 (US-19/20), #57 (US-17/18/20/21), #58 (US-17/18/21), #59 (acceptance lines 1 and 6) |
| 2 | Design doc argues real alternatives (day_part vs boolean) and commits | **Met** | `design.md` §2: comparison table (which half, multi-day, balance math, overlap, API shape) plus a rejected `start_part`/`end_part`; ADR-10 (#53) |
| 3 | Migration is reversible-aware | **Met** | Written down path `db/down/006_…down.sql`. On a fresh database: up → down → up works; with a half day present the down path refuses ("restore from backup or fix forward"). Design §5 explains why rollback means restore after that (#56) |
| 4 | Day-math tests cover the edges | **Met** | Tests first: `a7baeb4` (red: `Cannot find module '../src/lib/balance'`; 7 failing against the old `leaveDays`), then the implementation (#55). Covers a holiday inside a range, weekend + holiday, a half day on a poya, a PM half day on the last day of a range, and a cancel refunding 0.5 |
| 5 | PRs a reviewable size with What/Why/How to test | **Met** | 8 PRs, each with What/Why/How to test. Sizes: #52 +136 · #53 +191 · #54 +160 · #55 +174 · #56 +146/−77 · #57 +428 · #58 +351 · #59 +16. Largest are the API (#57, mostly tests) and the UI (#58); split migration → day math → API → UI → E2E as the guide advises |
| 6 | CI green on the first push, or red fixed fast without commenting tests out | **Met** | Every Capstone PR's only CI run was green. Two tests that imported the removed `holidays.js` were moved onto the table, not commented out (#56). Contract changes updated two expectations openly (CSV header, POST body) |
| 7 | Deployed through the pipeline, no hand-edits on the server or database | **Not met** | Nothing deployed: no staging or production exists. Merges publish the image to GHCR (`release.yml`), and the demo data comes only from migrations (no hand inserts), but "deployed" is not claimed |
| 8 | Scope held; stretch ideas parked | **Met** | Parked as issues: #60 half day at the start of a trip, #61 shutdown week in Holidays (before April 2027), #62 employee holiday view, #63 holiday-aware preview, #64 audit log, #65 displayed vs charged days. Team calendar (#7) and email (#8) untouched |
| 9 | The demo survives an unrehearsed question | **Met** | A reviewer subagent that hadn't seen the script asked about a PM half day on a newly added holiday. Answered live with a run: refund 0.5, `day_part` stays PM. The run also uncovered #65; a regression test now pins the answer (`demo-script.md`) |

Nadeesha's acceptance list: every line maps to AC (`stories.md`) and to at least one test (Jest `dayMath`,
`halfDay`, `holidaysApi`, `holidaysTable`; Vitest `ApplyLeaveForm`, `Approvals`, `MyLeave`, `Holidays`; Playwright
half-day flow).

## One thing I'd do differently

**Decide in the design doc what "days" means for an approved request before building the re-credit rule.** I
designed "adding a holiday re-credits approved leave" carefully, but kept `days` as a value recomputed from the current
holiday list. The unrehearsed question showed that after a holiday is deleted, the displayed days (2.5) and the charged
days (2) disagree (#65). Storing the charged days on the request at approval (and updating them on re-credit) would
have been a one-line column in migration 006. Adding it now is a second migration and a backfill.

## Also noted

- Test-first paid off: the half-day-on-a-poya rule ("subtract 0.5 only if the last day is a working day") came from
  writing that test before the code.
- Nadeesha's review changed the design twice (re-credit on add, Sick has no half days). Doing Gate 1 before Gate 2
  kept those changes cheap.
