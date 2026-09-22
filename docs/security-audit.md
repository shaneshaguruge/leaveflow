# Security self-audit (Phase 10)

**Date:** 2026-09-21 · **Code audited:** branch `feat/ops` at `f3f8cce` (pino logging + login rate limit) ·
**Where:** local only — API on `http://localhost:4100`, database `leaveflow_ops` on local PostgreSQL 16.14.
Production does not exist yet, so every "prod" check in the guide is re-run here against the local API.

We audit the OWASP Top 10 risks that LeaveFlow actually faces. Every row below was **run**, and the result is the
real output. Where something could not be verified, the row says so.

## Summary

| # | Threat (OWASP) | Where we defend | Verified how | Result |
|---|---|---|---|---|
| 1 | SQL injection (A03) | `$1`-style parameters in every `pool.query` / `client.query` | grep + parser script over `server/src` | **PASS** |
| 2 | Broken access control (A01) | `requireAuth`, `requireRole`, ownership and manager checks in `routes/` | 10 curl checks as the wrong user | **PASS** |
| 3 | Secrets exposure (A02/A05) | `.env` git-ignored, platform env vars (planned), pino `redact` | `git ls-files`, `git log --all -p`, log-file grep | **PASS**, one note |
| 4 | Vulnerable dependencies (A06) | `npm audit`; Dependabot (not verified) | `npm audit --omit=dev`, `npm audit` | **PASS** (0 found) |
| 5 | Login brute force (A07) | `express-rate-limit`, 10/min per IP on `POST /api/auth/login` | 11 bad logins, reset timing, test-mode check | **PASS locally**; prod sets the `TRUST_PROXY` env var (code reads it) |

## 1. SQL injection

| Check | Command | Result |
|---|---|---|
| Count query calls in routes | `grep -rn "query(" server/src/routes/ \| wc -l` | `32` (re-run 2026-09-22 after the Capstone: `holidays.js` routes and the half-day checks added calls) |
| Count query calls in all server code | `grep -rn "query(" server/src/ \| wc -l` | `37` (32 in routes + 4 in `db/migrate.js` + 1 in `lib/holidays.js`; re-run 2026-09-22) |
| Any `${…}` inside a SQL string passed to `query(` (multi-line aware) | Node script: regex over every `query(<literal>` in `server/src/{routes,db,middleware,lib}/*.js`, flag `${` inside the literal | `query() calls with literal SQL: 36 with ${} interpolation: 0` (re-run 2026-09-22) — 36 of the 37 calls; the 37th is the non-literal one in `db/migrate.js` (next rows) |
| Any `${…}` in routes at all | `grep -rnE '\$\{[^}]*\}' server/src/routes/` | 7 hits, none in SQL: error messages in `holidays.js:44`, `:75`, `leaveRequests.js:44`, `:63`, `:77`, `reports.js:19`, and the download file name in `reports.js:42` (`year` is validated as 4 digits first) |
| String concatenation into `query(` | `grep -rnE "query\([^)]*\+ " server/src/` | no output |
| Non-literal SQL | `grep -rnE "query\(\s*[^\`'\" ]" server/src/ server/scripts/` | 1 hit: `db/migrate.js:13` runs the `.sql` migration files from the repo — no user input |

Conclusion: all user input reaches SQL as bind parameters (`$1`, `$2`, …). Role in `team.js` is also a parameter (`$2 = 'HR_ADMIN'`).

## 2. Broken access control (403 rules)

Tokens from real logins (`password123` seed users). Request #4 is Ruwan's (user 1) PENDING request; #3 is Ishara's (user 2) PENDING request.
The guide's curl sends `{"status":"CANCELLED"}`; this API's contract is `{"action":"cancel"}` (`docs/api.md` §3), so the checks use `action`.

| Check (who → what) | Expected | Actual response |
|---|---|---|
| Ishara (EMPLOYEE) cancels Ruwan's #4 | 403 | `403 {"error":{"code":"FORBIDDEN","message":"Only the owner can cancel"}}` |
| Ishara approves Ruwan's #4 | 403 | `403 … "Managers only"` |
| Ishara approves her own #3 | 403 | `403 … "Managers only"` |
| Ruwan (MANAGER) approves his own #4 | 403 | `403 … "Not your report"` |
| Ruwan cancels Ishara's #3 | 403 | `403 … "Only the owner can cancel"` |
| Ishara `GET /api/team/requests` | 403 | `403 … "Your role cannot do this"` |
| Ishara `GET /api/leave-requests` — whose rows? | only user 2 | distinct `user_id`s returned: `2` |
| Ishara `POST /api/leave-requests` with `"user_id":1` in the body | row owned by 2 | created `id 7 user_id 2` (body `user_id` ignored; #7 then cancelled by Ishara to tidy up) |
| Forged `alg:none` token claiming `{"id":3,"role":"HR_ADMIN"}` | 401 | `401 {"error":{"code":"BAD_TOKEN","message":"Invalid or expired token"}}` |
| Guide's literal body `{"status":"CANCELLED"}` as Ishara on #4 | rejected | `400 VALIDATION_ERROR` "action: must be …" (rejected before any permission logic) |

Not verified here: the Phase 6 Jest 403 tests (they live on branch `feat/tests`, not in this worktree).

## 3. Secrets

| Check | Command | Result |
|---|---|---|
| `.env` ignored | `git check-ignore -v server/.env` | `server/.gitignore:3:.env  server/.env` |
| Env-like files tracked | `git ls-files \| grep -iE '(^\|/)\.env'` | only `server/.env.example`, which contains `DATABASE_URL=` and `JWT_SECRET=` with **empty** values |
| Env-like files ever committed (all branches) | `git log --all --pretty=format: --name-only \| sort -u \| grep -iE 'env\|secret\|pgdata'` | only `server/.env.example` |
| Local `JWT_SECRET` value anywhere in history | `git log --all -p \| grep -cF "<value from server/.env>"` | `0` |
| AWS access keys in history | `git log --all -p \| grep -cE 'AKIA[0-9A-Z]{16}'` | `0` |
| Private key blocks in history | `git log --all -p \| grep -c 'BEGIN .*PRIVATE KEY'` | `0` |
| Hard-coded secret-looking assignments | `git grep -nIiE '(jwt_secret\|password\|api[_-]?key\|secret)\s*[:=]\s*["'][^"']{8,}' -- . ':!*.md'` | no output |
| Tokens/cookies in logs | request with `Authorization: Bearer <real JWT>` and `Cookie: session=supersecretcookie`; then `grep -c -F "$TOKEN" api.log` and `grep -c supersecretcookie api.log` | `0` and `0`; the log line shows `"authorization":"[Redacted]"` and `"cookie":"[Redacted]"` |
| Passwords in logs | pino-http does not log bodies; checked every JSON line for a `req.body` field | `body logged anywhere: false` (43 lines) |

**Note:** the local dev DB password `leaveflow_dev` appears in `server/scripts/dev-db.js:13` as a default
`DATABASE_URL` for the **local** embedded Postgres (committed in `8bb2b70`). It is a dev-only credential for a
server bound to localhost; prod must use a different, generated password. Seed users' password `password123` is
in `docs/` and seeds — must not reach prod (see `deploy-aws.md` §6).

Not verified: secrets in the Docker image (no Docker on this laptop — `docker history`/image grep not run), and
CloudWatch logs (no AWS).

## 4. Vulnerable dependencies

| Check | Command (in `server/`) | Result |
|---|---|---|
| Runtime deps | `npm audit --omit=dev` | `found 0 vulnerabilities` |
| All deps incl. dev (`embedded-postgres`, `nodemon`) | `npm audit` | `found 0 vulnerabilities` |

Not verified: `client/` audit (the client is on branch `feat/client`, not in this worktree); Dependabot
(repository setting on GitHub, not checked — this task does not touch the remote).

## 5. Login brute force (rate limit)

Limiter in `server/src/routes/auth.js`: `windowMs 60000`, `limit 10`, draft-6 `RateLimit-*` headers, JSON
handler, `skip` when `NODE_ENV=test`. Server freshly started so the in-memory counter was empty.

| Check | Command | Result |
|---|---|---|
| 10 wrong passwords in a row | `for i in $(seq 1 10); do curl -s -D - -o /dev/null -X POST localhost:4100/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ishara@ceylonroots.lk","password":"wrong"}'; done` | 10 × `401`, `RateLimit-Remaining` 9, 8, …, 0 |
| 11th attempt | same, once more, with `-i` | `HTTP/1.1 429 Too Many Requests`, `RateLimit-Policy: 10;w=60`, `RateLimit-Limit: 10`, `RateLimit-Remaining: 0`, `RateLimit-Reset: 58`, `Content-Type: application/json`, body `{"error":{"code":"RATE_LIMITED","message":"Too many login attempts. Try again in a minute."}}` |
| Correct password while limited | 12th request with `password123` | `429` (the limiter runs before the password check) |
| Other routes unaffected | `curl localhost:4100/api/health` | `200` |
| Window resets | after restart: 11 good logins, then poll until 200 | `200 ×10, 429`, then `login allowed again after 62s` (poll every 5 s) |
| Disabled in tests | server with `NODE_ENV=test`, 15 wrong logins | 15 × `401`, no 429; no `RateLimit-*` headers; no request log lines |

**Before production:** the limiter keys on `req.ip`. Behind nginx, Render's proxy or CloudFront + App Runner,
`req.ip` is the proxy's address unless `trust proxy` is configured, so all users would share one 10-per-minute
bucket (and a single attacker would lock everyone out). **Fixed in code:** `server/src/app.js` reads the
`TRUST_PROXY` env var (hop count) and calls `app.set('trust proxy', …)`; Docker Compose sets `TRUST_PROXY: "1"`
for nginx. At deploy time set it to the platform's hop count and re-run the 11-login check against the deployed URL.
The in-memory store is also per-instance: with more than one App Runner instance the effective limit is
10 × instances per minute — acceptable at 60 users.

## Not in scope / not verified

- XSS, CSRF: the React client is on another branch; the API uses bearer tokens in headers (no cookies), which
  removes classic CSRF. Not tested here.
- Security headers (`helmet`), CORS policy, TLS: deployment-time items, not tested locally.
- Account lockout per email (as opposed to per IP): not implemented.
