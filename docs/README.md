# LeaveFlow docs

Every project document, by Field Guide phase. **Plan** = written but not carried out (no cloud account yet).

## Start here

| Doc | What it is |
|---|---|
| [`HOW-TO-RUN.md`](HOW-TO-RUN.md) · [PDF](LeaveFlow-How-to-Run.pdf) | Start and stop (Docker or not), logins, quick fixes, a 5-minute demo |
| [`../README.md`](../README.md) | What LeaveFlow is, how to run it (Docker or not), demo logins, how to run the tests |
| [`STATUS.md`](STATUS.md) | Where the project stands: done, skipped and why, next steps, known issues |
| [`PROGRESS.md`](PROGRESS.md) | All 95 guide checkboxes with the proof for each |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Every change by phase, with PR numbers and merge times |
| [`decisions.md`](decisions.md) | Decision log (ADR-1…10) |

## Phase 1 — Requirements

| Doc | What it is |
|---|---|
| [`requirements.md`](requirements.md) | SRS: stakeholders, US-1…US-16, acceptance criteria, MoSCoW, open questions Q1–Q5, NFRs, wireframe index |
| [`wireframes/`](wireframes/) | Paper wireframes (photos): [login](wireframes/login.jpeg), [apply for leave](wireframes/apply-for-leave.jpeg), [manager approvals](wireframes/manager-approvals.jpeg), [my requests](wireframes/my-requests.jpeg), [HR all requests](wireframes/hr-all-requests.jpeg); Capstone: [apply with a half day](wireframes/apply-half-day.jpeg), [HR holidays](wireframes/hr-holidays.jpeg) |

## Phase 2 — Design

| Doc | What it is |
|---|---|
| [`design.md`](design.md) | Design doc: context, decisions D1–D6, tables, state machine, architecture, roles, alternatives, risks |
| [`api.md`](api.md) | API contract: every endpoint, the error shape, PATCH rules, worked examples (matches the running API) |
| [`ERD.jpeg`](ERD.jpeg) | Paper ERD, four tables |
| [`diagrams/state-machine.jpeg`](diagrams/state-machine.jpeg) | Paper request state machine |
| [`diagrams/sequence-diagram.jpeg`](diagrams/sequence-diagram.jpeg) | Paper "apply for leave" sequence (final 201 arrow still to add; text version in `design.md` §4) |

## Phase 4 — Git

| Doc | What it is |
|---|---|
| [`phase4-notes.md`](phase4-notes.md) | Check-your-understanding answers |

## Phase 6 — Testing

| Doc | What it is |
|---|---|
| [`test-cases.md`](test-cases.md) | Manual test cases TC-01…TC-05 (written, not yet run by hand) |
| [`bug-reports.md`](bug-reports.md) | Bug report index: [BUG-001](bug-report-001.md), [BUG-002](bug-report-002.md), [BUG-003](bug-report-003.md), [BUG-004](bug-report-004.md) |

## Phase 8 — CI/CD

| Doc | What it is |
|---|---|
| [`branch-protection.md`](branch-protection.md) | The rule applied to `main` and how to re-apply or check it |

## Phase 9 — Hosting

| Doc | What it is |
|---|---|
| [`deploy-vercel.md`](deploy-vercel.md) | **Live:** the Vercel + Neon hosting that actually runs, and its verification |
| [`deployment-and-cli.md`](deployment-and-cli.md) | How GitHub, Vercel and Neon are connected; how git and `gh` authenticate here; the Vercel CLI as reference only |
| [`deploy-render.md`](deploy-render.md) | Not used (Render needs a card) |
| [`deploy-aws.md`](deploy-aws.md) | Not used (AWS needs a card) |
| [`teardown-checklist.md`](teardown-checklist.md) | **Plan:** delete every cloud resource afterwards |

## Phase 10 — Operations

| Doc | What it is |
|---|---|
| [`security-audit.md`](security-audit.md) | Security self-audit (SQL params, 403s, secrets, npm audit, rate limit), run locally |
| [`observability.md`](observability.md) | Structured logs (built); CloudWatch alarm and SNS (**plan**) |
| [`runbook.md`](runbook.md) | Incident runbook: severities, symptoms, first checks |
| [`backup-restore-drill.md`](backup-restore-drill.md) | **Plan:** RDS snapshot restore drill |
| [`postmortem-template.md`](postmortem-template.md) | Blameless post-mortem template (no incident yet) |

## Capstone — half-day leave and public holidays

| Doc | What it is |
|---|---|
| [`capstone/stories.md`](capstone/stories.md) | US-17…US-21 with acceptance criteria, approved by Nadeesha |
| [`capstone/design.md`](capstone/design.md) | Mini design doc: `day_part` vs boolean, `public_holidays`, migration down path, API diff, ERD |
| [`capstone/demo-script.md`](capstone/demo-script.md) | 15-minute demo (2/8/5) covering every acceptance line, rehearsed twice; the unrehearsed question and its live answer |
| [`capstone/retro.md`](capstone/retro.md) | Rubric walked line by line with evidence; one thing to do differently |
| [`../server/src/db/down/006_half_day_and_holidays.down.sql`](../server/src/db/down/006_half_day_and_holidays.down.sql) | Written down path for migration 006 |
