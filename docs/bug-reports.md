# Bug reports

Every bug found in LeaveFlow, each written in the full template (title, severity, priority, steps, expected, actual,
environment, root cause and fix, follow-up). Copy [`bug-report-001.md`](bug-report-001.md) for a new one and take the
next number.

| ID | Title | Severity | Found | Fixed in | Regression test |
|---|---|---|---|---|---|
| [BUG-001](bug-report-001.md) | API process exits when PostgreSQL restarts | High | Phase 5 E hardening | PR #17 | manual (needs the DB stopped mid-run) |
| [BUG-002](bug-report-002.md) | A request that ends on the first day of another request is accepted | Medium | Phase 6 seeded bug hunt | PR #46 | Jest "BUG-002 regression…" |
| [BUG-003](bug-report-003.md) | A manager can reject leave for people who are not their reports | High | Phase 6 seeded bug hunt | PR #47 | Jest "BUG-003 regression…" |
| [BUG-004](bug-report-004.md) | Pending leave for next year reduces this year's balance | Medium | Phase 6 seeded bug hunt | PR #48 | Jest "BUG-004 regression…" |

BUG-002…004 were planted by a subagent mentor on a throwaway `bughunt` branch (never merged to `main`, deleted
afterwards); their reports and regression tests reached `main` in PR #49. All dated 2026-09-21.
