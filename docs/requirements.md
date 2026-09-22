# LeaveFlow — SRS v0.1 (draft, pending answers Q1–Q5)

| | |
|---|---|
| **Customer** | Ceylon Roots (Pvt) Ltd — Nadeesha Perera, HR Manager |
| **Purpose** | Replace email/WhatsApp/spreadsheet leave tracking for ~60 staff |
| **In scope** | Apply, approve/reject, cancel, balances, notifications, HR oversight, finance reports |
| **Out of scope (v1)** | Payroll, WhatsApp integration, native mobile apps |
| **Roles** | EMPLOYEE, MANAGER, HR_ADMIN |
| **Leave types** | Annual 14 / Casual 7 / Sick 7 days per year |
| **Request lifecycle** | PENDING → APPROVED \| REJECTED (the requester's manager, or HR_ADMIN for anyone — Q1 project decision, to confirm with Nadeesha); PENDING → CANCELLED (owner) |
| **Open questions** | Q1–Q5 below. Q1 is no longer blocking: the project decided it (see the table), still to confirm with Nadeesha |

---

## 1. Stakeholders

| Stakeholder | What they want |
|---|---|
| Employees (~60) | Apply for leave, cancel, see balance — from a phone |
| Managers / team leads | Approve or reject their own team's requests |
| Nadeesha (HR admin) | Oversight of all leave, configure leave types, end the chaos |
| Finance | Year-end leave reports without two days of manual work |
| Directors | Low cost, policy compliance (indirect stakeholder) |

---

## 2. User stories

US-1  As an employee, I want to log in with my email and password,
      so that only I can act on my leave.

US-2  As an employee, I want to apply for leave (type, dates, reason),
      so that requests stop living in WhatsApp.

US-3  As an employee, I want to see my remaining balance per leave type,
      so that I stop asking Nadeesha ten times a day.

US-4  As a manager, I want to approve or reject my team's pending requests,
      so that decisions are fast and recorded.

US-5  As an employee, I want to cancel a request while it is still pending,
      so that changed plans don't need HR intervention.

US-6  As an HR admin, I want to configure leave types and allocations,
      so that policy changes don't need a developer.

US-7  As a manager, I want a calendar view of my team's approved leave,
      so that I never double-book the QC team again.

US-8  As an employee, I want an email when my request is decided,
      so that I don't have to keep checking the app.

US-9  As an HR admin, I want to see all requests across the company,
      so that I keep the oversight I have today.

US-10 As an employee, I want to see the status of my requests
      (pending/approved/rejected/cancelled), so that I always know where I stand.

### Finance stories (Lab 1)

US-11 As a finance officer, I want a year-end report of leave taken per employee
      per leave type, so that I don't wait two days for a manual spreadsheet.

US-12 As a finance officer, I want to export that report as CSV/Excel,
      so that I can use it directly in our existing finance files.

US-13 As a finance officer, I want to see unused leave per employee at year end,
      so that I can calculate carry-over or encashment.

### Stories from Nadeesha's follow-up call (Lab 2)

> "When someone is sick more than three days running, we need the medical
> certificate on file before I approve — and the factory shuts for a week at
> Sinhala & Tamil New Year, so nobody should be able to book annual leave then."

US-14 As an employee, I want to upload a medical certificate with a sick leave
      request longer than 3 consecutive days, so that HR can approve it.

RULE-1 A sick leave request of more than 3 consecutive days cannot be APPROVED
       until a medical certificate is attached.

RULE-2 Annual leave cannot be requested for dates inside the New Year
       shutdown week (company holiday).

RULE-3 Shutdown-week days are company holiday and must not be deducted
       from any employee's leave balance.

US-15 As an HR admin, I want to set company shutdown dates each year,
      so that the New Year block updates without a developer.

### Change request from Nadeesha (Phase 10, issue #31)

> "Small request: when a manager opens an approval, can they see WHO ELSE on the team is already off that
> week? Dilini approved two overlapping leaves last month and packing was short-staffed for three days."

US-16 As a manager, when reviewing a request, I want to see approved leaves from my reports that
      overlap its dates, so that I don't leave the team short-staffed.

### Capstone: half-day leave and public holidays

US-17…US-21 (half-day booking, half-day balance math, holiday calendar data, holiday-aware counting, HR manages
holidays), with acceptance criteria and Nadeesha's approval, are in [`capstone/stories.md`](capstone/stories.md).
All built (PRs #55–#59).

---

## 3. Acceptance criteria (Given / When / Then)

### US-2 Apply for leave
- **Given** I am logged in as an employee with 10 annual days remaining
  **When** I submit an annual leave request for 3 working days with a reason
  **Then** the request is saved with status PENDING
  **And** my available annual balance shows 7 days
- **Given** my remaining annual balance is 2 days
  **When** I request 5 annual days
  **Then** the request is rejected with a clear "insufficient balance" message

### US-3 Balance check
- **Given** the year's allocations are Annual 14, Casual 7, Sick 7
  **And** I have 4 approved annual days taken
  **When** I open my balances page
  **Then** I see Annual 10, Casual 7, Sick 7 remaining
  **And** PENDING requests are shown as "reserved", not yet deducted

### US-4 Approve or reject
- **Given** I am logged in as a manager and my report Ishara has a PENDING request
  **When** I approve it
  **Then** its status becomes APPROVED, with my id and timestamp recorded
  **And** Ishara is notified
- **Given** a request is already APPROVED
  **When** anyone tries to approve or reject it again
  **Then** the action is refused — decisions are final

### US-16 Who else is off (reviewing a request)
- **Given** I am logged in as a manager and my report Ishara has a PENDING request for 16 Nov 2026
  **And** my other report Kasun has APPROVED leave for 16–18 Nov 2026
  **When** I open that request on the Approvals screen
  **Then** a "Team that week" panel lists Kasun Perera, 2026-11-16 → 2026-11-18
- **Given** someone who is **not** my report has APPROVED leave on those dates
  **When** I open the request
  **Then** they are not listed (only my reports; HR_ADMIN, who approves anyone, sees everyone)
- **Given** a report's overlapping request is PENDING, REJECTED or CANCELLED
  **When** I open the request
  **Then** it is not listed (only APPROVED leave counts)
- **Given** nobody on my team has APPROVED leave overlapping the request
  **When** I open it
  **Then** the panel says "No one else is off"
- **Given** I am logged in as an EMPLOYEE
  **When** I ask for the team's absences
  **Then** the API refuses with 403

### US-11 Finance report
- **Given** it is the end of 2026 and 60 employees have leave records
  **When** finance opens the year-end report for 2026
  **Then** they see one row per employee with days taken per leave type
  **And** the totals match the approved requests in the system

### US-12 Export report
- **Given** finance is viewing the 2026 year-end report on screen
  **When** they click "Export CSV"
  **Then** a CSV file downloads with the same rows and columns shown on screen
  **And** it opens in Excel with the same totals as the on-screen report

### US-13 Unused leave at year end
- **Given** Ishara Fernando's 2026 allocation is Annual 14
  **And** she has 10 approved annual days taken in 2026
  **When** finance opens the 2026 unused-leave report
  **Then** Ishara Fernando's row shows 4 unused annual days
  **And** no carry-over or encashment amount is calculated (depends on unconfirmed Q2)

### RULE-1 Medical certificate
- **Given** an employee submits a 5-day sick leave request with no certificate
  **When** HR tries to approve it
  **Then** approval is blocked with "medical certificate required"

### RULE-2 Shutdown week
- **Given** 13–19 April is set as the shutdown week
  **When** an employee requests annual leave for 15 April
  **Then** the request is refused with "company holiday — no leave needed"

---

## 4. Priorities (MoSCoW)

| Priority | Stories |
|---|---|
| **Must** | US-1 login, US-2 apply, US-3 balances, US-4 approve/reject, US-5 cancel pending, US-10 request status |
| **Should** | US-8 email notifications, US-9 HR oversight view, US-11 finance report, RULE-1 medical certificate, US-16 who else is off (built, PR for issue #31) |
| **Could** | US-6 configure leave types, US-7 team calendar, US-12 export (built as Export CSV, PR #41), US-13 unused leave, US-14 upload, US-15 shutdown dates, RULE-2/3 |
| **Won't (this time)** | Payroll, WhatsApp integration, native mobile app (responsive web instead) |

The Must list alone is a usable product.

---

## 5. Clarifying questions for Nadeesha

1. **(BLOCKING)** You said team leads should approve their own people's leave,
   and also that every approval must come to you first. Which should the system
   do — manager approves, HR approves, or manager then HR? Can you walk me
   through the last real approval, step by step?
2. Do unused leave days carry over to next year, or expire on Dec 31?
3. Are weekends and public holidays (e.g. poya days) counted inside a leave
   period, or skipped when computing days taken?
4. Can sick leave be applied for retroactively (after the person was out)?
5. For the finance report: can you send last year's hand-made report so we
   build exactly what finance already uses?

### Assumed answers (demo project — to confirm with Nadeesha)

| Q | Assumption | Status |
|---|---|---|
| Q1 | **Decided by the project 2026-09-21:** a manager approves or rejects their own reports (`users.manager_id`); HR_ADMIN approves or rejects anyone; one step, no second approval. Built in Phase 5 (PR #16), see `api.md` §3 | Decision recorded — **still to be confirmed with Nadeesha** (if she wants "manager then HR", add a state; `design.md` R3) |
| Q2 | Unused days expire on Dec 31 | **Unconfirmed** |
| Q3 | Weekends and poya days are skipped (not counted) | **Confirmed** by Nadeesha in the Capstone story review (2026-09-22): weekends and public holidays, including poya days, are not counted |
| Q4 | Yes, sick leave can be applied up to 7 days after | **Unconfirmed** |
| Q5 | Report = one row per employee, columns per leave type | Unconfirmed |

---

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Auth:** all features require login; passwords stored hashed, never plain text |
| NFR-2 | **Roles:** EMPLOYEE / MANAGER / HR_ADMIN see only what their role allows |
| NFR-3 | **Audit:** every approval/rejection records who decided and when |
| NFR-4 | **Mobile:** all employee screens usable on a 360px-wide phone |
| NFR-5 | **Scale:** ~60 users, a few hundred requests/year. A single small server is correct — no clusters, no caching layers |

---

## 7. Wireframes (low-fi)

> **Evidence:** the guide asks for a **paper sketch, photographed** (checklist: "A paper wireframe of the
> Apply-for-leave screen exists (photo saved)"). **Done 2026-09-21** — five paper wireframes, photographed:

| Screen | Photo | Stories |
|---|---|---|
| Log in | [`wireframes/login.jpeg`](wireframes/login.jpeg) | US-1 (same message for wrong email or password) |
| Apply for leave | [`wireframes/apply-for-leave.jpeg`](wireframes/apply-for-leave.jpeg) | US-2, US-3 |
| Pending approvals (manager) — Lab 3 | [`wireframes/manager-approvals.jpeg`](wireframes/manager-approvals.jpeg) | US-4, US-16 ("Team that week") |
| My requests | [`wireframes/my-requests.jpeg`](wireframes/my-requests.jpeg) | US-3, US-5, US-10 |
| All requests (HR) | [`wireframes/hr-all-requests.jpeg`](wireframes/hr-all-requests.jpeg) | US-9, US-12 (Export CSV) |
| Apply for leave with a half day (Capstone) | [`wireframes/apply-half-day.jpeg`](wireframes/apply-half-day.jpeg) | US-17, US-18 |
| HR holiday list (Capstone) | [`wireframes/hr-holidays.jpeg`](wireframes/hr-holidays.jpeg) | US-21 |

> The text versions below were the first drafts; the photos are the reference.

### Apply for leave (employee)
```
+----------------------------------+
|  Apply for leave                 |
|                                  |
|  Leave type  [ Annual       v ]  |
|  Start date  [ 2026-06-15     ]  |
|  End date    [ 2026-06-17     ]  |
|  = 3 working days · 10 remaining |
|  Reason      [ optional...    ]  |
|                                  |
|  [      Submit request      ]    |
+----------------------------------+
```

### Pending approvals (manager) — Lab 3
```
+------------------------------------------+
|  Pending approvals (2)                   |
|  Manager: Ruwan Jayasuriya               |
|------------------------------------------|
|  Ishara Fernando · Annual · 3 days       |
|  1–3 May · "Vesak trip to Kandy"         |
|  Balance after: 7 of 14                  |
|  Team off same dates: Kasun (QC) ⚠       |
|  [ Approve ]   [ Reject ]                |
|------------------------------------------|
|  Kasun · Casual · 1 day                  |
|  6 May · "Family function"               |
|  Balance after: 5 of 7                   |
|  Team off same dates: none               |
|  [ Approve ]   [ Reject ]                |
+------------------------------------------+
```
The "Team off same dates" warning is what stops two QC officers being off in the same week.
