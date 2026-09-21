# Capstone — stories: half-day leave and public holidays

Source: Nadeesha Perera's email after Monday's management meeting (Field Guide, Capstone):

> "…we want HALF-DAY leave, morning or afternoon, deducting 0.5 from the balance. Second: last month someone's
> annual leave was deducted for Vesak poya, which is a public holiday! We need a public-holiday calendar so poya days
> and other holidays are never counted against anyone's balance."

New stories continue the numbering in [`../requirements.md`](../requirements.md) (US-1…US-16). Status: **approved by Nadeesha**
(role-played by a subagent given only her email and the requirements) on 2026-09-22 after two rounds; see the review
log at the end.

## Open questions, answered

| # | Question the email leaves open | Answer |
|---|---|---|
| OQ-1 | Can a half day be part of a multi-day request? | **Yes, on the last day only.** A request has one "day part" that applies to its last day: *Full day*, *Morning* (off in the morning, at work after lunch) or *Afternoon*. Example: Mon–Wed + Morning = off Monday, Tuesday and Wednesday morning = 2.5 days. To start a trip with a half day (leave Friday after lunch), book the Friday afternoon as its own request. |
| OQ-2 | Who maintains the holiday list? | **HR, in the app.** HR sees the list for a year and adds or deletes a holiday without a developer. The 2026 Sri Lankan public holidays are loaded once as the starting list, marked *to confirm against the official gazette*; HR corrects it in the app. Next year's list is entered by HR. |
| OQ-3 | What counts as "a day" for a half day that falls on a holiday or weekend? | Nothing: a half day on a poya day or a weekend is 0 days and is refused like any request with no working days; the message names the holiday ("2026-05-01 is Vesak Full Moon Poya Day — no leave needed"). |
| OQ-4 | Do changes to the holiday list change requests already approved? | **Adding** a holiday gives the day back automatically to every approved request that covers it. **Deleting** a holiday never charges anyone after the fact for leave already approved. Either way HR sees the approved requests the change affected. Pending requests are always counted with the current list. |
| OQ-5 | Which leave types allow half days? | **Annual and Casual.** Sick leave is booked in full days. |
| OQ-6 | How do half days and holidays affect the medical-certificate rule (RULE-1, sick leave of more than 3 consecutive days)? | RULE-1 is not built yet and this capstone does not change it. When it is built, it counts **working days** of the sick request (weekends and holidays excluded): Mon–Thu with a poya on Tuesday is 3 days, so no certificate. Sick half days do not exist (OQ-5). |

## US-17 Half-day booking

As an employee, I want to book a morning or an afternoon off, so that I don't lose a whole day for a two-hour errand.

- **AC-17.1** Given I am applying for leave, when I choose one date and *Morning*, then the request is saved as a
  morning half day and the form shows "0.5 working days" before I submit.
- **AC-17.2** Given I choose *Afternoon* for a single date, then it is saved as an afternoon half day.
- **AC-17.3** Given a range Mon–Wed with *Morning*, then it is saved as full Monday and Tuesday plus Wednesday
  morning (2.5 days).
- **AC-17.4** Given I already have a morning half day on a date, when I book the afternoon of the same date, then it
  is accepted; a second morning, or a full day on that date, is refused as overlapping.
- **AC-17.5** Given nothing is chosen, then the request is a full-day request, exactly as today.
- **AC-17.6** Given I choose *Sick* leave, then *Morning* and *Afternoon* are not offered, and the API refuses a sick
  half day ("Half days are for Annual or Casual leave").

## US-18 Half-day balance math

As an employee, I want a half day to cost exactly 0.5, so that my balance is right.

- **AC-18.1** Given 14 Annual days left, when my Annual half day is approved, then Annual shows 13.5 left and no
  other leave type changes.
- **AC-18.1b** Given 7 Casual days left, when my Casual half day is approved, then Casual shows 6.5 left and Annual
  and Sick do not change.
- **AC-18.2** Given a pending half day, then my balance shows 0.5 *reserved* until it is decided.
- **AC-18.3** Given I cancel a pending half day, then the 0.5 reserved comes back (remaining goes up by 0.5).
- **AC-18.4** Given a rejected half day, then nothing is deducted.
- **AC-18.5** Given 0.5 days left, then a half day is accepted and a full day is refused as insufficient.
- **AC-18.6** Given I am a manager approving a request with a half day, then the card names the half-day date and part,
  e.g. "2026-05-06 AM" for a single morning, or "2026-05-04 → 2026-05-06 · 2026-05-06 AM · 2.5 days" for a range, and
  the balance line shows the change (e.g. "Annual balance 10 → 9.5 after").
- **AC-18.7** Given a half day in *My requests*, then it shows the same: the half-day date with "AM" or "PM", and the
  days ("0.5 days", "2.5 days").

## US-19 Holiday calendar data

As HR, I want one list of public holidays that the whole system uses, so that the rules are the same everywhere.

- **AC-19.1** Given a fresh installation, then the 2026 Sri Lankan public holidays are present (poya days, Sinhala
  and Tamil New Year, Vesak, Christmas and the others), each with a date and a name, marked *to confirm against the
  official gazette*.
- **AC-19.2** A date is either a holiday or not: the same date cannot be listed twice (two holidays on one date are
  one entry with both names, e.g. "Vesak Full Moon Poya Day + International Labour Day").
- **AC-19.3** Every day count in the system (applying, balances, approvals, HR list, CSV export) uses this list.

## US-20 Holiday-aware day counting

As an employee, I want public holidays and weekends never to reduce my balance, so that I'm charged only for days I
would have worked.

- **AC-20.1** Given a request Wed 29 Apr – Mon 4 May 2026 across Vesak poya (Fri 1 May) and a weekend, then it counts
  3 days (Wed, Thu, Mon), not 6 or 4.
- **AC-20.2** Given a request Fri 27 Feb – Tue 3 Mar 2026 across a long weekend where Monday 2 Mar is Medin poya, then only
  Friday and Tuesday count (2 days).
- **AC-20.3** Given a half day on a poya day or a weekend, then it is 0 days and is refused; for a holiday the message
  names it ("2026-05-01 is Vesak Full Moon Poya Day — no leave needed").
- **AC-20.4** Given an approved request spanning a holiday, then the holiday is never added to *used* days.

## US-21 HR manages holidays

As HR, I want to see and manage the holiday list for a year, so that I don't need a developer when the gazette
changes.

- **AC-21.1** Given I am HR, when I open *Holidays* and pick 2026, then I see every holiday for 2026 by date with its
  name.
- **AC-21.2** Given I am HR, when I add a date and a name, then it appears in the list and is excluded from day counts
  from then on; a date that is already a holiday is refused with a clear message.
- **AC-21.3** Given I am HR, when I delete a holiday, then it disappears and that date counts as a working day again
  for pending and new requests.
- **AC-21.5** Given an **approved** request covering a date, when HR adds that date as a holiday, then the day (or
  half day) is given back to that person's *used* days automatically, and HR sees the list of approved requests that
  were adjusted.
- **AC-21.6** Given an **approved** request covering a holiday, when HR deletes that holiday, then nobody is charged
  after the fact (used days stay as approved), and HR sees the list of approved requests that cover the date.
- **AC-21.4** Given I am an employee or a manager, then I cannot see the Holidays screen and the API refuses (403).

## Regression

- **AC-R.1** Everything that already worked still works: full-day requests, overlap rule, approvals (manager → own
  reports, HR → anyone), rejections, cancellations, the balances page, "Team that week", history and CSV export.
- **AC-R.2** Rules from `requirements.md` that are **not built yet** stay as they are and are not changed here: RULE-1
  medical certificate (see OQ-6) and RULE-2/RULE-3 New Year shutdown week. The shutdown week is not in the holiday
  list yet; putting it in the same Holidays screen is parked for later (one place for HR to maintain).

## Nadeesha's acceptance list → stories

| Her words | AC |
|---|---|
| "I can book a morning or afternoon half day, and it deducts 0.5 from the right balance." | 17.1, 17.2, 18.1, 18.1b |
| "Vesak poya — or any public holiday — never reduces anyone's balance, even inside a longer request." | 20.1, 20.3, 20.4 |
| "A request spanning Friday to Tuesday over a long weekend deducts only the working days." | 20.2 |
| "Cancelling a pending half-day request gives the 0.5 back." | 18.3 |
| "As HR, I can see and manage the holiday list for the year without calling a developer." | 21.1–21.3, 21.5, 21.6 |
| "Managers see 'AM' or 'PM' on a half-day request when approving — not just the date." | 18.6 |
| "Everything that already worked still works — full-day requests, approvals, the balances page." | R.1 |

## Not in this capstone (parked as backlog issues)

- A half day at the **start** of a multi-day request in one booking (book it as a separate request for now).
- New Year shutdown week (RULE-2/3) managed in the same Holidays screen.
- A read-only holiday list for employees.
- Loading next year's holidays automatically from an official source.
- Team calendar, email notifications, audit log (Field Guide stretch goals).

## Review log

- **Round 1 — changes requested.** (1) OQ-4: adding a holiday must give days back on approved requests; deleting must
  never charge after the fact; HR sees affected requests → OQ-4 rewritten, AC-21.5/21.6 added. (2) A Casual half-day
  criterion and a Sick policy → AC-18.1b, OQ-5, AC-17.6. (3) Say which date is the half day on multi-day requests →
  AC-18.6/18.7. (4) RULE-1 and the shutdown week → OQ-6, AC-R.2. Notes taken: refusal names the holiday (OQ-3,
  AC-20.3); requirements Q3 marked confirmed; shutdown week and an employee holiday view parked.
- **Round 2 — APPROVED** (no changes). Tidy-up applied: acceptance-list mapping now includes 18.1b, 20.3, 21.5 and
  21.6. Her note: the shutdown week (parked) must come back before next April's New Year.
