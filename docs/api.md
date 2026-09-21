# LeaveFlow API contract (v1)

**Base URL:** `http://localhost:4000/api`
**Format:** all requests and responses are JSON (`Content-Type: application/json`).
**Auth:** `Authorization: Bearer <jwt>` on every endpoint except `POST /auth/login` and `GET /health`.

## Error format — one shape, everywhere

Every error response uses exactly this shape:

```json
{ "error": { "code": "SOME_CODE", "message": "Human-readable explanation" } }
```

- `code` — fixed, UPPER_SNAKE_CASE, for the frontend to check in code.
- `message` — plain English, safe to show to the user.

| Status | Meaning | Codes used |
|---|---|---|
| 400 | Your request is malformed | `VALIDATION_ERROR`, `BAD_TYPE` |
| 401 | I don't know who you are (no token, bad token, or wrong login) | `NO_TOKEN`, `BAD_TOKEN`, `BAD_CREDENTIALS` |
| 403 | I know who you are, and the answer is no | `FORBIDDEN` |
| 404 | No such thing | `NOT_FOUND` |
| 409 | The request conflicts with the current state | `INSUFFICIENT_BALANCE`, `OVERLAPPING_REQUEST`, `INVALID_STATE` |
| 500 | Server bug — not your fault | `INTERNAL` |

> Sources: `docs/requirements.md` (SRS v0.1) and `docs/design.md` (Design Doc v1).
> ⚠️ **Q1 (approval flow) is UNCONFIRMED — risk R3 in `design.md`.** The approve/reject rules below
> are an assumption until Nadeesha answers.

---

## 1. Endpoints

| Method | Path | Who | Success | Errors | Story |
|---|---|---|---|---|---|
| GET | `/health` | anyone (no token) | 200 | — | ops |
| POST | `/auth/login` | anyone | 200 | 400, 401 | US-1 |
| GET | `/me` | any logged-in user | 200 | 401 | US-1 |
| GET | `/leave-requests` | owner (HR_ADMIN: everyone's) | 200 | 401 | US-10, US-9 |
| POST | `/leave-requests` | any logged-in user, for themselves | 201 | 400, 401, **409** | US-2 |
| PATCH | `/leave-requests/:id` | see §3 | 200 | 400, 401, 403, 404, **409** | US-4, US-5 |
| GET | `/balances` | owner | 200 | 401 | US-3 |
| GET | `/team/requests` | MANAGER, HR_ADMIN | 200 | 401, 403 | US-4 |

**Not in v1:** US-6 (configure leave types), US-7 (team calendar), US-8 (email — no endpoint; sent by the server),
US-11–13 (finance reports), US-14–15. These are Should/Could items and get endpoints when they're built.

---

## 2. Endpoint details

### GET /health
No auth. Used by deployments to check the API is alive.
```json
200  { "status": "ok" }
```

### POST /auth/login
```json
// request
{ "email": "ishara@ceylonroots.lk", "password": "password123" }

// 200 — token valid for 8 hours
{ "token": "<jwt>", "user": { "id": 2, "name": "Ishara Fernando", "role": "EMPLOYEE" } }
```
- Wrong email **or** wrong password → the **same** `401 BAD_CREDENTIALS`, so nobody can probe which emails exist.
- Missing email/password → `400 VALIDATION_ERROR`.

### GET /me
```json
200  { "id": 2, "name": "Ishara Fernando", "email": "ishara@ceylonroots.lk", "role": "EMPLOYEE" }
```

### GET /leave-requests
- EMPLOYEE / MANAGER → **only their own** requests, newest first.
- HR_ADMIN → **every** request in the company (US-9).
```json
200  [ { "id": 42, "user_id": 2, "leave_type_id": 1, "start_date": "2026-06-15", "end_date": "2026-06-17",
         "reason": "Family visit to Kandy", "status": "PENDING",
         "decided_by": null, "decided_at": null, "created_at": "2026-06-01T09:14:00Z" } ]
```

### POST /leave-requests
Creates a request for **the logged-in user** (`user_id` comes from the token, never from the body).

| Field | Required | Rule |
|---|---|---|
| `leave_type_id` | yes | must exist → else `400 BAD_TYPE` |
| `start_date` | yes | `YYYY-MM-DD` |
| `end_date` | yes | `YYYY-MM-DD`, on or after `start_date` → else `400 VALIDATION_ERROR` |
| `reason` | no | text |

**Checks run in this order** (matches the sequence in `design.md` §4):
1. Validate fields → `400 VALIDATION_ERROR` / `400 BAD_TYPE`
2. Overlap with the user's own PENDING or APPROVED request → `409 OVERLAPPING_REQUEST` (see §5)
3. Enough balance? → `409 INSUFFICIENT_BALANCE`
4. Insert with status `PENDING` → `201` with the new row

**Day counting:** days are counted inclusive of start and end date. Whether weekends and poya days are skipped
is **Q3 — unconfirmed** (assumption: skipped; risk R4).

### PATCH /leave-requests/:id
Body: `{ "action": "approve" | "reject" | "cancel" }` — rules in §3. Returns the updated row.

### GET /balances
Current year, one entry per leave type — all three types even if nothing is used yet.
```json
200  [ { "leave_type_id": 1, "name": "Annual", "annual_allocation": 14, "used_days": 4, "pending_days": 3, "remaining_days": 7 },
       { "leave_type_id": 2, "name": "Casual", "annual_allocation": 7,  "used_days": 0, "pending_days": 0, "remaining_days": 7 },
       { "leave_type_id": 3, "name": "Sick",   "annual_allocation": 7,  "used_days": 0, "pending_days": 0, "remaining_days": 7 } ]
```
- `used_days` — from APPROVED requests (stored in `leave_balances`).
- `pending_days` — days in PENDING requests, shown as **"reserved"** (US-3 acceptance criterion). Computed, not stored.
- `remaining_days` = `annual_allocation − used_days − pending_days`. Computed, not stored.

### GET /team/requests
The manager's inbox: **PENDING** requests only, with the employee's name.
- MANAGER → requests from people whose `manager_id` is them.
- HR_ADMIN → all PENDING requests.
- EMPLOYEE → `403 FORBIDDEN` (not 401 — we know who they are).
```json
200  [ { "id": 42, "user_id": 2, "employee_name": "Ishara Fernando", "leave_type_id": 1,
         "start_date": "2026-06-15", "end_date": "2026-06-17", "reason": "Family visit to Kandy",
         "status": "PENDING", "decided_by": null, "decided_at": null, "created_at": "2026-06-01T09:14:00Z" } ]
```

---

## 3. PATCH action rules

`PATCH /leave-requests/:id` with body `{ "action": "..." }`.
All three actions only work on a **PENDING** request (state machine, `design.md` §4).

| Action | New status | Who may do it | Also does |
|---|---|---|---|
| `approve` | `APPROVED` | the requester's **manager** (`users.manager_id`), or **HR_ADMIN** ⚠️ Q1 | adds the days to `leave_balances.used_days` **in the same transaction** |
| `reject` | `REJECTED` | the requester's **manager**, or **HR_ADMIN** ⚠️ Q1 | — |
| `cancel` | `CANCELLED` | the **owner** only | — |

Every action records `decided_by` (who) and `decided_at` (when) — NFR-3.

**Checks run in this order:**
1. `action` missing or not one of the three → `400 VALIDATION_ERROR`
2. Request doesn't exist → `404 NOT_FOUND`
3. Permission:
   - `cancel` by anyone other than the owner → `403 FORBIDDEN` ("Only the owner can cancel")
   - `approve`/`reject` by an EMPLOYEE → `403 FORBIDDEN` ("Managers only")
   - `approve`/`reject` by a MANAGER who isn't the requester's manager → `403 FORBIDDEN` ("Not your report").
     This also stops a manager approving **their own** request.
4. Request is not PENDING → `409 INVALID_STATE` ("Request is not pending"). Decisions are final.

> ⚠️ **Q1 — UNCONFIRMED (risk R3).** Nadeesha said both "team leads approve" and "every approval must come to me".
> This contract assumes **either the manager or HR_ADMIN can decide, in one step**. If the answer is
> "manager, then HR", `approve` needs a second step and a new state — this table and `design.md` §4 would change.

---

## 4. Worked example — Ishara applies for leave

Ishara Fernando (id 2, EMPLOYEE, manager Ruwan Jayasuriya) applies for 3 days of Annual leave, Monday to Wednesday.

```http
POST /api/leave-requests HTTP/1.1
Host: localhost:4000
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "leave_type_id": 1,
  "start_date": "2026-06-15",
  "end_date": "2026-06-17",
  "reason": "Family visit to Kandy"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": 42,
  "user_id": 2,
  "leave_type_id": 1,
  "start_date": "2026-06-15",
  "end_date": "2026-06-17",
  "reason": "Family visit to Kandy",
  "status": "PENDING",
  "decided_by": null,
  "decided_at": null,
  "created_at": "2026-06-01T09:14:00Z"
}
```

Then Ruwan Jayasuriya (id 1, her manager) approves it:

```http
PATCH /api/leave-requests/42 HTTP/1.1
Host: localhost:4000
Authorization: Bearer <ruwan's jwt>
Content-Type: application/json

{ "action": "approve" }
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 42,
  "user_id": 2,
  "leave_type_id": 1,
  "start_date": "2026-06-15",
  "end_date": "2026-06-17",
  "reason": "Family visit to Kandy",
  "status": "APPROVED",
  "decided_by": 1,
  "decided_at": "2026-06-02T08:30:00Z",
  "created_at": "2026-06-01T09:14:00Z"
}
```

If anyone tries to approve or reject request 42 again:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{ "error": { "code": "INVALID_STATE", "message": "Request is not pending" } }
```

A validation failure looks like this:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{ "error": { "code": "VALIDATION_ERROR", "message": "end_date must be on or after start_date" } }
```

---

## 5. Rule: no overlapping requests (409 OVERLAPPING_REQUEST)

**Rule:** a user's new request must not overlap, by even one date, any of **their own** requests that are
**PENDING** or **APPROVED**. REJECTED and CANCELLED requests don't count — those dates are free again.

Two ranges overlap when `new.start_date <= existing.end_date` **and** `new.end_date >= existing.start_date`.

**Example:** Ishara already has request 42 for **15–17 June** (PENDING or APPROVED). She now asks for **17–19 June**.
17 June is in both ranges, so it's refused:

```http
POST /api/leave-requests HTTP/1.1
Host: localhost:4000
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "leave_type_id": 2,
  "start_date": "2026-06-17",
  "end_date": "2026-06-19",
  "reason": "Extend the trip"
}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "OVERLAPPING_REQUEST",
    "message": "These dates overlap your request #42 (2026-06-15 to 2026-06-17)"
  }
}
```

| Existing request | New request | Result |
|---|---|---|
| 15–17 June, PENDING | 17–19 June | ❌ 409 (shares 17 June) |
| 15–17 June, APPROVED | 10–15 June | ❌ 409 (shares 15 June) |
| 15–17 June, APPROVED | 18–19 June | ✅ 201 (no shared date) |
| 15–17 June, CANCELLED | 15–17 June | ✅ 201 (cancelled dates are free) |
| someone **else's** request, 15–17 June | 15–17 June | ✅ 201 (the rule is per user) |

The overlap check runs **before** the balance check, and applies to all leave types (you can't be on Annual and Casual
leave on the same day).
