# LeaveFlow — Design Doc v1 (draft)

| | |
|---|---|
| **Author** | shaneshaguruge |
| **Date** | 2026-09-18 |
| **Status** | Draft — pending Nadeesha's answer to **Q1** (see Risk R3) |
| **Inputs** | `docs/requirements.md` (SRS v0.1): US-1…US-13, NFR-1…NFR-5 |
| **Scope** | US-1 to US-13. US-14, US-15 and RULE-1…3 (medical certificates, shutdown week) are **not designed here** — see §9. |

---

## 1. Context

Ceylon Roots (~60 staff) tracks leave through email, WhatsApp and a spreadsheet.
Requests get lost, nobody knows their balance, and two QC officers were off in the
same week. The SRS Must-haves are: log in, apply, see balances, approve/reject,
cancel while pending, and see request status (US-1, 2, 3, 4, 5, 10).

---

## 2. Decisions

| ID | Decision |
|---|---|
| **D1** | **3-tier architecture:** React SPA (browser) → Express API → PostgreSQL. Built first as **v0**: a single Express server with SQLite (Phase 3), then split into three tiers (Phase 5). |
| **D2** | **4 tables:** `users`, `leave_types`, `leave_requests`, `leave_balances` (per year). Store `used_days`; remaining days are **computed**, never stored. |
| **D3** | **Request status is a state machine** (enum, not booleans): PENDING → APPROVED / REJECTED (manager), PENDING → CANCELLED (owner). |
| **D4** | **JSON REST API** under `/api`. One error shape everywhere: `{ "error": { "code", "message" } }`. Full contract: `docs/api.md`. |
| **D5** | **All business rules and permission checks live in the API**, never in the browser. The browser never talks to the database. |
| **D6** | **Reports (US-11, US-12, US-13) are queries** over the 4 tables. No extra report tables. |

---

## 3. Database tables

### 3.1 Entity–relationship overview

```
 users 1 ──< * leave_requests >── 1 leave_types
   │ 1                                   │ 1
   │                                     │
   └──< * leave_balances >───────────────┘
   │
   └── manager_id → users.id  (a user's manager is another user)

 leave_requests.decided_by → users.id  (who approved/rejected)
```

Every arrow is a foreign key (FK). "1 ──< *" means "one to many".

### 3.2 Tables

**`users`** — everyone who logs in

| Column | Type (planned) | Notes |
|---|---|---|
| `id` | integer, **PK** | auto-generated |
| `name` | text | |
| `email` | text, unique | login name (US-1), email notifications (US-8) |
| `password_hash` | text | bcrypt hash — **never the plain password** (NFR-1) |
| `role` | text: `EMPLOYEE` / `MANAGER` / `HR_ADMIN` | drives permissions (NFR-2) |
| `manager_id` | integer, **FK → users.id**, nullable | who approves this user's leave (US-4) |
| `created_at` | timestamp | |

**`leave_types`** — Annual, Casual, Sick

| Column | Type (planned) | Notes |
|---|---|---|
| `id` | integer, **PK** | |
| `name` | text | `Annual`, `Casual`, `Sick` |
| `annual_allocation` | number | 14, 7, 7 days per year |

**`leave_requests`** — one row per request

| Column | Type (planned) | Notes |
|---|---|---|
| `id` | integer, **PK** | |
| `user_id` | integer, **FK → users.id** | who asked (the owner) |
| `leave_type_id` | integer, **FK → leave_types.id** | |
| `start_date` | date | |
| `end_date` | date | must be on or after `start_date` |
| `reason` | text | optional |
| `status` | text: `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` | see §4 |
| `decided_by` | integer, **FK → users.id**, nullable | who approved, rejected or cancelled (NFR-3) |
| `decided_at` | timestamp, nullable | when that happened (NFR-3) |
| `created_at` | timestamp | |

**`leave_balances`** — days used, per user, per type, per year

| Column | Type (planned) | Notes |
|---|---|---|
| `user_id` | integer, **FK → users.id** | |
| `leave_type_id` | integer, **FK → leave_types.id** | |
| `year` | integer | allocations reset every January; old years kept for audits |
| `used_days` | number | days already taken |

Primary key: the combination (`user_id`, `leave_type_id`, `year`) — one row per user, type and year.

**Remaining days** = `leave_types.annual_allocation − leave_balances.used_days` (computed when read).

### 3.3 Which story uses which table

| Story | Priority | Tables / columns | Notes |
|---|---|---|---|
| US-1 Log in | Must | `users.email`, `users.password_hash` | |
| US-2 Apply | Must | insert into `leave_requests` (status `PENDING`) | balance checked first |
| US-3 See balances | Must | `leave_balances` + `leave_types` | remaining is computed |
| US-4 Approve / reject | Must | `leave_requests.status`, `decided_by`, `decided_at`; `users.manager_id` | approve also updates `leave_balances.used_days` |
| US-5 Cancel while pending | Must | `leave_requests.status` → `CANCELLED` | |
| US-6 Configure leave types | Could | `leave_types` | seeded at launch; editing screen later |
| US-7 Team calendar | Could | query `leave_requests` (APPROVED) joined on `users.manager_id` | no new table |
| US-8 Email when decided | Should | `users.email` | sending email is app logic, not schema |
| US-9 HR sees all requests | Should | query all `leave_requests` | HR_ADMIN only |
| US-10 Request status | Must | `leave_requests.status` | |
| US-11 Year-end report | Should | query `leave_balances` for one `year` | one row per employee |
| US-12 Export CSV | Could | same query as US-11 | export format only |
| US-13 Unused leave | Could | `annual_allocation − used_days` for one `year` | carry-over **not** calculated (Q2 unconfirmed) |

---

## 4. Leave request state machine

```
                  approve (manager)
               ┌───────────────────► APPROVED   (final)
               │
  new request  │  reject (manager)
  ──────► PENDING ─────────────────► REJECTED   (final)
               │
               │  cancel (owner, only while PENDING)
               └───────────────────► CANCELLED  (final)
```

| From | To | Action | Who may do it |
|---|---|---|---|
| — | `PENDING` | apply | the employee (owner) |
| `PENDING` | `APPROVED` | approve | the owner's manager (`users.manager_id`) **or HR_ADMIN** — **see R3** |
| `PENDING` | `REJECTED` | reject | the owner's manager **or HR_ADMIN** — **see R3** |
| `PENDING` | `CANCELLED` | cancel | the owner only |

**Rules that come straight from the diagram:**
- APPROVED, REJECTED and CANCELLED are **final**. No arrow leaves them, so any action on them is refused (the API returns `409 INVALID_STATE`, planned for Phase 3). "Decisions are final" is also in the US-4 acceptance criteria.
- An approved request **cannot be cancelled** (no arrow from APPROVED to CANCELLED).
- A manager can't approve their own request (they aren't their own manager). A manager with no manager (e.g. Ruwan, `manager_id` empty) can only be approved by HR_ADMIN.
- **HR_ADMIN can approve/reject any request**, as the guide builds it in Phase 5 — see R3 and R5.

**"Apply for leave" sequence** (order matters):

```
Browser                    API (Express)                    DB
   │  POST /api/leave-requests  │                             │
   │──────────────────────────► │ 1. validate input (no DB)   │
   │                            │ 1b. overlap check ────────► │  (own PENDING/APPROVED dates)
   │                            │ 2. SELECT balance ────────► │
   │                            │ ◄──────── used_days ─────── │
   │                            │ 3. enough days left?        │
   │                            │ 4. INSERT request ────────► │
   │                            │ ◄──────── new row ───────── │
   │ ◄──── 201 Created + JSON ──│                             │
```

Validate first (cheap), check balance second (one read), insert last (the write). If the dates overlap the user's own request, it stops at step 1b (`409 OVERLAPPING_REQUEST`); if the balance is too low, it stops at step 3 (`409 INSUFFICIENT_BALANCE`). Either way nothing is written.

---

## 5. System architecture

```
 ┌──────────────────┐   HTTP + JSON   ┌──────────────────┐   SQL   ┌──────────────────┐
 │  React SPA       │ ──────────────► │  Express API     │ ──────► │  PostgreSQL      │
 │  (browser/phone) │ ◄────────────── │  rules + auth    │ ◄────── │  the only copy   │
 │  screens only    │                 │  live here       │         │  of the truth    │
 └──────────────────┘                 └──────────────────┘         └──────────────────┘
```

| NFR | How the architecture meets it |
|---|---|
| **NFR-1 Auth** | Passwords stored as **bcrypt hashes**. After login the API issues a **JWT** (signed token); every other request must carry it. |
| **NFR-2 Roles** | The API checks the user's role and relationship (owner / manager / HR) on every request. The browser only hides buttons; the API is what enforces. |
| **NFR-3 Audit** | `decided_by` and `decided_at` are written in the same step as the status change. See §7. |
| **NFR-4 Mobile** | **Responsive web app** (works in a phone browser at 360px width). No native app — it's on the Won't-have list. |
| **NFR-5 Scale** | One API server + one database. See §8. |

**Build order (from the guide):** v0 = one Express server + SQLite file (Phase 3) → 3-tier React + Express + PostgreSQL (Phase 5).

---

## 6. Roles and permissions

| Action | EMPLOYEE | MANAGER | HR_ADMIN |
|---|---|---|---|
| Log in, see own profile | ✅ | ✅ | ✅ |
| Apply for own leave | ✅ | ✅ | ✅ |
| See own requests and balances | ✅ | ✅ | ✅ |
| Cancel own request (PENDING only) | ✅ | ✅ | ✅ |
| See team's pending requests (`/team/requests`) | ❌ 403 | ✅ direct reports only | ✅ all pending |
| Approve / reject a request | ❌ 403 | ✅ **direct reports only**, never own | ✅ any request — **unconfirmed, see R3** |
| See all requests in the company (US-9) | ❌ 403 | ❌ 403 | ✅ |
| Configure leave types (US-6, Could) | ❌ | ❌ | ✅ (later) |
| Finance reports (US-11–13) | ❌ | ❌ | ✅ — who else? see R6 |

**401 vs 403:**
- **401** = "I don't know who you are" (no token, or a bad one).
- **403** = "I know who you are, and the answer is no" (wrong role, or not your team).

---

## 7. Audit requirements (NFR-3)

- Every **approve** and **reject** records **who** (`decided_by`) and **when** (`decided_at`).
- They are written **together with the status change**, in one step, so a decision can never exist without its audit data. (In Phase 5 this becomes a single database transaction that also updates `leave_balances`.)
- Every request records when it was created (`created_at`).
- Balance history is kept by **year** — old years are never overwritten, so past balances can be audited.
- **Cancellations** are recorded the same way: `decided_by` = the owner, `decided_at` = when they cancelled.

---

## 8. Scalability (60 users)

- **Load:** ~60 users, a few hundred requests per year. Even the busiest day (before Vesak) is a few requests per minute.
- **Design:** one API server and one PostgreSQL database are enough, with large headroom.
- **Deliberately not used:** load balancers, caches, message queues, microservices, database replicas. Each extra part is something that can break and must be explained, for a load that doesn't exist.
- **When to revisit:** only if Ceylon Roots' group companies join and users grow into the thousands.

---

## 9. Out of scope for this design

These are in the SRS but not designed here. They need extra tables later:

| Item | Priority | Would need |
|---|---|---|
| US-14 medical certificate upload + RULE-1 | Should / Could | somewhere to store files, and a link from the request |
| US-15 shutdown dates + RULE-2, RULE-3 | Could | a table of company holiday dates per year |
| Half-day leave | not in SRS yet | Week 3 lab and capstone (`day_part` vs 0.5 days) |

---

## 10. Alternatives considered

| ID | Alternative | Decision |
|---|---|---|
| A1 | Keep the spreadsheet and add scripts | **Rejected:** no access control, no audit trail |
| A2 | Store `remaining_days` | **Rejected:** it's derived from allocation − used, and two copies of the truth drift apart after a bug |
| A3 | `is_approved` boolean | **Rejected:** two values can't represent four states (PENDING, APPROVED, REJECTED, CANCELLED) |
| A4 | Separate report tables for finance | **Rejected:** US-11–13 can be answered by queries on the existing tables |

---

## 11. Risks and unconfirmed requirements

| ID | Risk | Impact | Action |
|---|---|---|---|
| **R3** | ⚠️ **UNCONFIRMED REQUIREMENT — Q1 approval flow (BLOCKING).** Nadeesha's email says both "team leads approve their own people's leave" **and** "every approval must come to me first". **This design assumes a one-step decision by either the manager or HR_ADMIN** (as the guide builds it in Phase 5), and HR sees all requests. | If the real answer is "only HR approves" or "manager then HR", the state machine needs an extra state (e.g. `MANAGER_APPROVED`), the permissions table changes, and the approve endpoint changes. | Keep Q1 open. Confirm with Nadeesha/mentor **before Phase 3 code** for approvals. Update §4 and §6 when answered. |
| R1 | Designing for scale we don't have | Wasted time and more parts to break | Keep the one-server design; revisit only on the trigger in §8 |
| R2 | Overlapping requests from the same person | Two overlapping requests could both be approved | **Resolved in the contract:** `409 OVERLAPPING_REQUEST`, `docs/api.md` §5. Overlap between *different* team members (the QC problem) is a separate, later feature |
| R4 | **Q3 unconfirmed:** do weekends and poya days count as leave days? | The balance check (§4 step 3) could deduct the wrong number of days | Assumption: skipped. Confirm; the holiday list is added in Phase 6 |
| R5 | HR_ADMIN can approve/reject **any** request — including their own (Dilini has no manager, so nobody else can) | One person can approve their own leave | Part of the Q1 answer — confirm with Nadeesha whether HR's own leave needs a second approver |
| R6 | Finance is a stakeholder, but there is no FINANCE role | Unclear who opens reports (US-11–13) | For v1, reports go to HR_ADMIN; ask whether finance needs its own login |
| R7 | `/balances` returns `pending_days` and `remaining_days` (US-3 "reserved" criterion), and POST checks balance against `allocation − used − pending`. The guide's Phase 5 code returns only `used_days` and ignores pending days | Phase 5 code must be extended to match this contract | Implement per `docs/api.md` in Phase 5 |
| R8 | **Q2 unconfirmed:** carry-over vs expiry | US-13 can't calculate carry-over | US-13 reports unused days only until Q2 is answered |
