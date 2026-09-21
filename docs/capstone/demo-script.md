# Capstone demo script — half-day leave and public holidays

15 minutes, 2 / 8 / 5. Runs locally (embedded PostgreSQL, API on :4000, web on :5173) on freshly seeded data.
Keep the API terminal visible the whole time: it prints the pino JSON logs (request id, status, `authorization:
[Redacted]`).

## Prep (the day before and 10 minutes before)

- Reset the demo data: `cd server && npm run db`, then in a second terminal reset the database to the seed
  (`node -e "require('../e2e/global-setup')()"` for `leaveflow_e2e`, or drop and re-migrate the dev database). The
  seed is migrations 001–006: users, balances, requests, Kasun's approved 16–18 Nov, and the 2026 holidays. Nothing is
  inserted by hand.
- Start `npm run dev` in `server/` (logs) and `client/`; log in once as each user.
- **Rehearsed twice** on 2026-09-22 against freshly reset data with the API (script in the capstone PR); both runs gave
  exactly the numbers below.

## 0:00–2:00 — the problem (2 min)

1. Nadeesha's two asks, one breath each: people burn a whole day for a two-hour errand → **half days, 0.5**;
   Vesak poya was deducted from someone's annual leave → **a holiday calendar that is never charged**.
2. The one design decision to notice: **`day_part` (FULL/AM/PM) on the request's last day, not a `half_day`
   boolean.** A boolean can't say *which* half, so managers couldn't see AM/PM and a morning and an afternoon on the
   same date would clash (`docs/capstone/design.md` §2, ADR-10).

## 2:00–10:00 — live flow (8 min)

| # | Do | Say / show | Acceptance line |
|---|---|---|---|
| 1 | Log in as **Ishara**, point at Annual | "Watch this **13** become **12.5**." (used 1, reserved 0) | — |
| 2 | Apply: Annual, **Fri 9 Oct**, **Afternoon**, reason "School meeting" | Line reads "= 0.5 working days · 12.5 remaining". After submit: My requests "2026-10-09 PM · 0.5 days", Annual **12.5**, reserved **0.5** | "I can book a morning or afternoon half day…" |
| 3 | Log in as **Ruwan** → Approvals | Card shows the **PM** badge, "2026-10-09 PM", "Annual · 0.5 days", "Annual balance 13 → 12.5 after", Team that week "No one else is off" | "Managers see 'AM' or 'PM'…" |
| 4 | Approve; back to Ishara | APPROVED; used **1.5**, **12.5** left: exactly 0.5 gone, from Annual only (Casual and Sick unchanged) | "…deducts 0.5 from the right balance" |
| 5 | Ishara applies Annual **Wed 29 Apr – Mon 4 May** | Counts **3 days**, not 6 or 4: Vesak (Fri 1 May) and the weekend are skipped | "Vesak poya… never reduces anyone's balance, even inside a longer request" |
| 6 | Try a **Morning on 1 May** | Refused: "2026-05-01 is Vesak Full Moon Poya Day + International Labour Day — no leave needed" | same |
| 7 | Log in as **Kasun**, apply **Fri 27 Feb – Tue 3 Mar** | Counts **2 days**: Friday and Tuesday; Monday 2 Mar is Medin poya | "…Friday to Tuesday over a long weekend deducts only the working days" |
| 8 | Ishara: **Casual morning** Fri 16 Oct, then **Cancel** it | Casual 6 → **5.5** reserved → cancel → back to **6** | "Cancelling a pending half-day request gives the 0.5 back" |
| 9 | Log in as **Dilini** → **Holidays**, year 2026 | 25 holidays, each "to confirm against the official gazette" | "As HR, I can see and manage the holiday list…" |
| 10 | Add **2026-10-09 "Special bank holiday"** | Message: "1 approved request got days back: Ishara Fernando (0.5 → 0)"; Ishara's used goes 1.5 → **1** | same (and Nadeesha's re-credit rule) |
| 11 | Delete it again | "…covers this date and was not re-charged: Ishara Fernando"; used stays **1** | same |
| 12 | As Ruwan, show there's **no Holidays tab** (API 403) | Only HR maintains the list | same |
| 13 | Ishara: a normal **full-day** Mon 19–Wed 21 Oct, Ruwan approves | Used +3; balances page, approvals and history as before. Suites green: Jest 109, Vitest 35, Playwright 3 | "Everything that already worked still works" |

If anything breaks: open the API terminal and read the log line (status, request id, error code) before saying
anything.

## 10:00–15:00 — questions (5 min, left open on purpose)

Ready answers:
- **What next?** The parked backlog: the shutdown week in the same Holidays screen before April 2027 (#61), a half day
  at the start of a trip (#60), employee holiday view (#62), holiday-aware preview (#63), audit log (#64), team
  calendar (#7), email (#8).
- **Rollback?** The down path works until the first half day exists; after that, restore or fix forward
  (`design.md` §5, tested on a fresh database).
- **Why the date as the primary key?** A date is a holiday or not; one row per date means nothing is deducted twice.

## Unrehearsed question (asked by a reviewer subagent that had not seen this script)

**Question:** "If an approved Annual leave request ends with a PM half day and HR then adds a public holiday on that
last date, does your refund code give back 0.5 or 1.0 days, and what does the database show for that request
afterwards (days, used, and whether day_part still says PM)?"

**Live answer (run on freshly seeded data, 2026-09-22):** **0.5.** Only half of that day was ever charged.
`POST /holidays` recomputes the request with the old and the new holiday list (`routes/holidays.js`, `daysBefore` /
`daysAfter`). A PM half day on a date that becomes a holiday counts 0, because `leaveDays` only subtracts the half if
the last day is a working day.

```
approved Mon 12 – Wed 14 Oct, last day PM: used 1 → 3.5 (+2.5)
adjusted: [{"id":6,"day_part":"PM","days_before":2.5,"days_after":2}]
used after adding 14 Oct as a holiday: 3.5 → 3 (refund 0.5)
row now: {"start_date":"2026-10-12","end_date":"2026-10-14","day_part":"PM","status":"APPROVED","days":2}
after deleting the holiday again: used 3 (not re-charged), row days 2.5
```

- The row is untouched: `day_part` still `PM`, still APPROVED. The refund goes to `leave_balances.used_days`.
- **What the question uncovered:** after HR deletes that holiday again, charged days stay right (3, never re-charged),
  but the list recomputes the row's `days` as 2.5 from the current list. Displayed and charged days can differ.
  Parked as issue #65 (store the charged days on the request).
- Pinned by a new regression test in `holidaysApi.test.js`: "demo question: a PM half day ending on a newly added
  holiday refunds 0.5, not 1.0, and keeps day_part PM".
