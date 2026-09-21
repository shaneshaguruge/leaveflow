# Observability (Phase 10)

> **Status:** structured logging is **built and verified locally** (2026-09-21, `feat/ops`).
> CloudWatch Logs, the 5xx alarm and the SNS topic are **plans** — there is no AWS account yet.

Three signals: **logs** (discrete events), **metrics** (numbers over time), **traces** (one request across
services — skipped; LeaveFlow is one API). We implement logs in code and plan one metric alarm.

## 1. Structured logs (done)

`server/src/middleware/logging.js` replaces `morgan` with `pino` + `pino-http`, mounted first in
`server/src/app.js` (`app.use(httpLogger)`).

| Behaviour | Detail |
|---|---|
| Format | one JSON object per line on **stdout** (`level`, `time`, `pid`, `hostname`, `req`, `res`, `responseTime`, `msg`) |
| Request id | `req.id` on every request line. An incoming `X-Request-Id` is reused if it matches `^[A-Za-z0-9._:-]{1,128}$`; otherwise a `crypto.randomUUID()` is generated. The id is always returned in the **`X-Request-Id` response header** |
| Redaction | `req.headers.authorization` and `req.headers.cookie` become `"[Redacted]"` |
| Bodies | request/response bodies are **not** logged (so login passwords never reach logs) |
| Level | `silent` when `NODE_ENV=test` (Jest/Supertest); otherwise `LOG_LEVEL`, default `info` |
| Status → level | pino-http default: 2xx–4xx at `info` (30), 5xx at `error` (50) |
| 500 details | `server/src/middleware/errors.js` still prints the stack with `console.error` for 500s (unchanged, plain text on stderr). The 5xx request line itself is JSON at `error` level |

Not JSON (known, harmless): the dotenv banner and `LeaveFlow API on http://localhost:…` from `server.js` at
start-up, and the pool's idle-client error line in `pool.js`. Converting those to `logger` calls is a small
follow-up.

### A real line (local run, 11th login in a minute)

```json
{"level":30,"time":1789975260797,"pid":27172,"hostname":"Shanesha-Arozen",
 "req":{"id":"996f1e70-23cf-4826-a775-f696f912659b","method":"POST","url":"/api/auth/login",
        "headers":{"host":"localhost:4100","content-type":"application/json", "...":"..."}},
 "res":{"statusCode":429,"headers":{"x-request-id":"996f1e70-23cf-4826-a775-f696f912659b",
        "ratelimit-limit":"10","ratelimit-remaining":"0","ratelimit-reset":"59","retry-after":"59"}},
 "responseTime":1,"msg":"request completed"}
```

(line shortened with `"...":"..."`; headers otherwise as logged.)

### Reading logs locally

The API prints to stdout; redirect it to a file and filter on fields, not text:

```bash
cd server && PORT=4100 node src/server.js > api.log 2>&1 &
# all 401s
grep '^{' api.log | node -e "require('fs').readFileSync(0,'utf8').trim().split('\n').map(JSON.parse)
  .filter(o => o.res.statusCode === 401).forEach(o => console.log(o.time, o.req.id, o.req.url))"
# everything one request did
grep '"id":"<request-id>"' api.log
```

Verified locally: a 43-line run parsed with `JSON.parse` had status counts
`{200:21, 201:1, 400:1, 401:1, 403:6, 429:13}`, every request line had `req.id`, and no line contained a body.

### Using the request id in support

When a user reports a problem, ask for the time and, if possible, the `X-Request-Id` from the browser's
Network tab (response headers). That id finds the exact log line.

## 2. CloudWatch Logs (plan)

App Runner sends container stdout to CloudWatch Logs:
`/aws/apprunner/leaveflow-api/<service-id>/application`.

```bash
aws logs tail /aws/apprunner/leaveflow-api/<service-id>/application \
  --region ap-south-1 --follow --since 15m \
  --filter-pattern '{ $.res.statusCode = 401 }'

# 429s (rate-limited logins)
aws logs tail ... --since 1h --filter-pattern '{ $.res.statusCode = 429 }'

# one request
aws logs tail ... --since 1h --filter-pattern '{ $.req.id = "996f1e70-23cf-4826-a775-f696f912659b" }'
```

Set log-group **retention** (e.g. 30 days) — the default is "never expire", which bills forever.

## 3. Metric alarm → email (plan)

1. SNS → Create topic `leaveflow-alerts` → subscribe the on-call email → **confirm** the subscription email.
2. CloudWatch → Alarms → Create alarm: namespace **AWS/AppRunner**, metric **5xxStatusResponses**, dimension
   = the `leaveflow-api` service; statistic Sum, period 5 min, threshold **≥ 5**, treat missing data as *not
   breaching*; action → `leaveflow-alerts`.
3. **Trip it on purpose** on staging (e.g. point staging's `DATABASE_URL` at a wrong host so requests 500)
   and confirm the email arrives within the 5-minute window. An alarm never tripped is an imaginary alarm.

Optional, from the guide's "Your turn": an external uptime check (UptimeRobot free tier or CloudWatch
Synthetics) on `https://leave.ceylonroots.lk/api/health`, alerting the same email.

### Alert hygiene

Every alert must be actionable. If an alarm fires and the right response is "ignore it", raise its threshold or
delete it. One alarm we read beats ten we filter to trash.

## Status

| Item | State |
|---|---|
| pino JSON logs, request id, redaction, silent in tests | **done, verified locally** (see `security-audit.md`) |
| CloudWatch log tailing with JSON filters | plan (no AWS account) |
| 5xx alarm + SNS email, tripped once | plan (no AWS account) |
| External uptime check | plan |
