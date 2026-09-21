# LeaveFlow API contract (v1)

**Base URL:** `http://localhost:4000/api` (in Docker: `http://localhost:8080/api`, proxied by nginx)
**Format:** JSON requests and responses (`Content-Type: application/json`).
**Auth:** `Authorization: Bearer <jwt>` on every endpoint except `POST /auth/login` and `GET /health`.
**Every response** carries an `X-Request-Id` header. Send your own (letters, digits, `._:-`, max 128) to trace a request
through the logs; otherwise the server generates one.

> This document describes the API **as it runs** (updated in Phase 5 Part E, after Phases 5–6 and 10).
> Examples are real responses captured from the running API on 2026-09-21 (tokens shortened).

## Error format — one shape, everywhere

```json
{ "error": { "code": "SOME_CODE", "message": "Human-readable explanation" } }
```

| Status | Meaning | Codes |
|---|---|---|
| 400 | Your request is malformed | `VALIDATION_ERROR` (message names the field: `"end_date: must be on or after start_date"`), `BAD_TYPE` |
| 401 | I don't know who you are | `NO_TOKEN`, `BAD_TOKEN` (invalid, forged or expired), `BAD_CREDENTIALS` |
| 403 | I know who you are, and the answer is no | `FORBIDDEN` |
| 404 | No such thing | `NOT_FOUND` (unknown request id, or unknown endpoint) |
| 409 | Conflicts with the current state | `OVERLAPPING_REQUEST`, `INSUFFICIENT_BALANCE`, `INVALID_STATE` |
| 413 | Request body over 100 kB (any endpoint that takes a body) | `PAYLOAD_TOO_LARGE` |
| 429 | Too many login attempts | `RATE_LIMITED` |
| 500 | Server bug — not your fault | `INTERNAL`, message always `"Something went wrong"` (details are logged, never returned) |

A body that isn't valid JSON gets `400 VALIDATION_ERROR` ("Request body is not valid JSON").
A body over 100 kB gets `413 {"error":{"code":"PAYLOAD_TOO_LARGE","message":"Request body is too large (limit 100 kB)"}}`.
Any other 4xx without an app-specific code uses its HTTP status name in the same style (e.g. `415 UNSUPPORTED_MEDIA_TYPE`).

---

## 1. Endpoints

| Method | Path | Who | Success | Errors | Story |
|---|---|---|---|---|---|
| GET | `/health` | anyone, no token | 200 | — | ops |
| POST | `/auth/login` | anyone | 200 | 400, 401, 429 | US-1 |
| GET | `/me` | any logged-in user | 200 | 401 | US-1 |
| GET | `/leave-requests` | own requests; HR_ADMIN: everyone's | 200 | 401 | US-10, US-9 |
| POST | `/leave-requests` | any logged-in user, for themselves | 201 | 400, 401, 409 | US-2 |
| PATCH | `/leave-requests/:id` | see §3 | 200 | 400, 401, 403, 404, 409 | US-4, US-5 |
| GET | `/balances` | own balances | 200 | 401 | US-3 |
| GET | `/team/requests` | MANAGER, HR_ADMIN | 200 | 401, 403 | US-4 |
| GET | `/team/requests?from=&to=` | MANAGER, HR_ADMIN | 200 | 400, 401, 403 | US-16 |

Any other path under `/api` → `404 {"error":{"code":"NOT_FOUND","message":"No such endpoint"}}`.

**Not in v1:** US-6 (configure leave types), US-7 (team calendar), US-8 (email — no endpoint), US-11–13 (finance
reports), US-14–15. There is **no DELETE** endpoint: cancelling is `PATCH {"action":"cancel"}`.

---

## 2. Endpoint details

### GET /health
```json
200  {"status":"ok","version":"0.4.0","uptime":0.4164547}
```

### POST /auth/login
```json
// request
{ "email": "ishara@ceylonroots.lk", "password": "password123" }
// 200 — the token is valid for 8 hours; its payload is only { id, role, iat, exp }
{"token":"eyJhbGciOi…","user":{"id":2,"name":"Ishara Fernando","role":"EMPLOYEE"}}
```
- Missing field → `400 VALIDATION_ERROR` (`"email: is required"`).
- Wrong email **or** wrong password → the **same** `401 BAD_CREDENTIALS` "Wrong email or password".
- **Rate limit:** 10 attempts per minute per client IP. The 11th → `429 {"error":{"code":"RATE_LIMITED","message":"Too many login attempts. Try again in a minute."}}`
  with `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` and `RateLimit-Policy` headers.
  Behind a reverse proxy set `TRUST_PROXY` to the number of hops, or every user shares one limit.

### GET /me
```json
200  {"id":2,"name":"Ishara Fernando","email":"ishara@ceylonroots.lk","role":"EMPLOYEE"}
```

### GET /leave-requests
EMPLOYEE / MANAGER → only their own requests; HR_ADMIN → every request. Newest first. Each item is a full row:
`id, user_id, leave_type_id, start_date, end_date, reason, status, decided_by, decided_at, created_at`
(dates `YYYY-MM-DD`; timestamps ISO 8601 UTC).

### POST /leave-requests
Creates a request for **the logged-in user**. `user_id` comes from the token; any `user_id` in the body is ignored.

| Field | Required | Rule |
|---|---|---|
| `leave_type_id` | yes | must exist → else `400 BAD_TYPE` |
| `start_date` | yes | `YYYY-MM-DD` |
| `end_date` | yes | `YYYY-MM-DD`, on or after `start_date` |
| `reason` | no | text |

**Checks, in this order:**
1. Fields → `400 VALIDATION_ERROR` naming the field
2. At least one working day in the range → else `400 VALIDATION_ERROR` "the dates contain no working days"
3. Leave type exists → else `400 BAD_TYPE`
4. No overlap with the user's own PENDING or APPROVED request → else `409 OVERLAPPING_REQUEST` (see §5)
5. Enough balance: `annual_allocation − used_days − pending_days` for that type and the start date's year → else `409 INSUFFICIENT_BALANCE` "Only N day(s) of this type left this year"
6. Insert with status `PENDING` → `201` with the new row

**Day counting:** inclusive of both dates; **weekends and 2026 Sri Lankan public holidays (including every poya day) are
not counted** (`server/src/lib/holidays.js`). Example: a request for 2026-05-01 (Vesak poya) alone → `400 "the dates contain no working days"`.
Years other than 2026 exclude weekends only until their holiday list is added.

### PATCH /leave-requests/:id
Body `{ "action": "approve" | "reject" | "cancel" }` — rules in §3. Returns the updated row.

### GET /balances
The logged-in user, current calendar year; one entry per leave type, even if nothing is used yet.
```json
200 [{"id":1,"name":"Annual","annual_allocation":14,"used_days":1,"pending_days":0,"remaining_days":13},
     {"id":2,"name":"Casual","annual_allocation":7,"used_days":0,"pending_days":1,"remaining_days":6},
     {"id":3,"name":"Sick","annual_allocation":7,"used_days":0,"pending_days":0,"remaining_days":7}]
```
- `id` is the leave type id.
- `used_days` — from APPROVED requests (stored in `leave_balances`).
- `pending_days` — working days in PENDING requests, shown to users as **"reserved"** (US-3). Computed, not stored.
- `remaining_days` = `annual_allocation − used_days − pending_days`. Computed, not stored.

### GET /team/requests
PENDING requests only, with the employee's name. MANAGER → people whose `manager_id` is them; HR_ADMIN → everyone's.
EMPLOYEE → `403 FORBIDDEN` "Your role cannot do this".
```json
200 [{"id":5,"user_id":2,"leave_type_id":1,"start_date":"2026-10-05","end_date":"2026-10-07","reason":"Family visit to Kandy",
      "status":"PENDING","decided_by":null,"decided_at":null,"created_at":"2026-09-21T07:39:42.535Z","employee_name":"Ishara Fernando"}]
```

### GET /team/requests?from=YYYY-MM-DD&to=YYYY-MM-DD — who else is off (US-16)
With both query parameters the same route answers a different question: which **APPROVED** requests overlap
`from`–`to` (inclusive: `start_date <= to AND end_date >= from`). Same scope as the approvals list: MANAGER →
their own reports (`users.manager_id`); HR_ADMIN → everyone. PENDING, REJECTED and CANCELLED requests are never
listed. Ordered by `start_date`, then name. The Approvals screen calls it with each pending request's dates and
shows the result in a "Team that week" panel; an empty array is shown as "No one else is off".
```json
// GET /api/team/requests?from=2026-11-16&to=2026-11-16  (Ruwan; seed 005: Kasun is off 16–18 Nov)
200 [{"id":5,"user_id":4,"employee_name":"Kasun Perera","leave_type_id":1,"start_date":"2026-11-16","end_date":"2026-11-18","status":"APPROVED"}]
// nobody off in the range
200 []
// EMPLOYEE
403 {"error":{"code":"FORBIDDEN","message":"Your role cannot do this"}}
// to before from / to missing or not a date (same for from)
400 {"error":{"code":"VALIDATION_ERROR","message":"to: must be on or after from"}}
400 {"error":{"code":"VALIDATION_ERROR","message":"to: must be YYYY-MM-DD"}}
```
Both values are bind parameters (`$1`, `$2`), never pasted into the SQL.

---

## 3. PATCH action rules

All three actions only work on a **PENDING** request (state machine, `design.md` §4).

| Action | New status | Who may do it | Also does |
|---|---|---|---|
| `approve` | `APPROVED` | the requester's **manager** (`users.manager_id`), or **HR_ADMIN** for anyone | adds the working days to `leave_balances.used_days` in the **same transaction** |
| `reject` | `REJECTED` | the requester's **manager**, or **HR_ADMIN** for anyone | — |
| `cancel` | `CANCELLED` | the **owner** only (not even HR) | — |

`decided_by` and `decided_at` are recorded for every action (for `cancel`, `decided_by` is the owner) — NFR-3.

**Checks, in this order:**
1. `action` missing or unknown → `400 VALIDATION_ERROR` (`"action: must be \"approve\", \"reject\" or \"cancel\""`)
2. Unknown or non-numeric id → `404 NOT_FOUND` "No such request"
3. Permission:
   - `cancel` by anyone other than the owner → `403` "Only the owner can cancel"
   - `approve`/`reject` by an EMPLOYEE → `403` "Managers only"
   - `approve`/`reject` by a MANAGER who isn't the requester's manager → `403` "Not your report" (so a manager can't approve their own request; a manager's own leave is decided by HR_ADMIN)
4. Not PENDING → `409 INVALID_STATE` "Request is not pending" — decisions are final
5. `approve` only: if the approval would take `used_days` past the allocation → `409 INSUFFICIENT_BALANCE`, and **both** writes are rolled back

> **Q1 (approval flow) — decided 2026-09-21 by the project:** a manager approves their own reports, and HR_ADMIN can approve
> anyone, in one step. Nadeesha has not yet confirmed it (her email asked for both "team leads approve" and "everything
> comes to me"); see `design.md` risks R3 and R5.

---

## 4. Worked example — Ishara applies, Ruwan approves

Ishara Fernando (id 2, EMPLOYEE, manager Ruwan Jayasuriya) applies for 3 days of Annual leave, Monday–Wednesday.

```http
POST /api/leave-requests HTTP/1.1
Host: localhost:4000
Authorization: Bearer <ishara's jwt>
Content-Type: application/json

{"leave_type_id":1,"start_date":"2026-10-05","end_date":"2026-10-07","reason":"Family visit to Kandy"}
```
```http
HTTP/1.1 201 Created
X-Request-Id: 57dff9e3-9dab-4b2f-9a3a-6713b1c8a832
Content-Type: application/json

{"id":5,"user_id":2,"leave_type_id":1,"start_date":"2026-10-05","end_date":"2026-10-07","reason":"Family visit to Kandy",
 "status":"PENDING","decided_by":null,"decided_at":null,"created_at":"2026-09-21T07:39:42.535Z"}
```

Ruwan (id 1, her manager) approves it:
```http
PATCH /api/leave-requests/5 HTTP/1.1
Authorization: Bearer <ruwan's jwt>
Content-Type: application/json

{"action":"approve"}
```
```http
HTTP/1.1 200 OK

{"id":5,"user_id":2,"leave_type_id":1,"start_date":"2026-10-05","end_date":"2026-10-07","reason":"Family visit to Kandy",
 "status":"APPROVED","decided_by":1,"decided_at":"2026-09-21T07:39:42.833Z","created_at":"2026-09-21T07:39:42.535Z"}
```
Ishara's Annual balance goes from `used_days 1 / remaining_days 13` to `used_days 4 / remaining_days 10`.

Approving again:
```http
HTTP/1.1 409 Conflict

{"error":{"code":"INVALID_STATE","message":"Request is not pending"}}
```

A validation failure:
```http
HTTP/1.1 400 Bad Request

{"error":{"code":"VALIDATION_ERROR","message":"end_date: must be on or after start_date"}}
```

---

## 5. Rule: no overlapping requests (409 OVERLAPPING_REQUEST)

A user's new request must not share even one date with any of **their own** requests that are **PENDING** or
**APPROVED**, across all leave types. REJECTED and CANCELLED requests don't count. Two ranges overlap when
`new.start_date <= existing.end_date` **and** `new.end_date >= existing.start_date`.

**Example:** Ishara already has request #5 for 5–7 October. She asks for 7–9 October (Casual):
```http
POST /api/leave-requests HTTP/1.1
Authorization: Bearer <ishara's jwt>
Content-Type: application/json

{"leave_type_id":2,"start_date":"2026-10-07","end_date":"2026-10-09"}
```
```http
HTTP/1.1 409 Conflict

{"error":{"code":"OVERLAPPING_REQUEST","message":"These dates overlap your request #5 (2026-10-05 to 2026-10-07)"}}
```

| Existing request | New request | Result |
|---|---|---|
| 5–7 Oct, PENDING | 7–9 Oct | 409 (shares 7 Oct) |
| 5–7 Oct, APPROVED | 1–5 Oct | 409 (shares 5 Oct) |
| 5–7 Oct, APPROVED | 8–9 Oct | 201 |
| 5–7 Oct, CANCELLED | 5–7 Oct | 201 (cancelled dates are free) |
| someone else's, 5–7 Oct | 5–7 Oct | 201 (the rule is per user) |
