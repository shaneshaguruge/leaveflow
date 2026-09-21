# LeaveFlow incident runbook

> **Status:** written for the planned AWS setup (`deploy-aws.md`). The AWS commands have **not** been run —
> there is no production yet. The local equivalents in brackets work today.

An **incident** is any unplanned event that degrades LeaveFlow. Follow this list top to bottom, out loud if
someone is with you. **Mitigate first, diagnose second** — the logs will still be there in an hour.

## Severity

| SEV | Meaning | Example | Response |
|---|---|---|---|
| **SEV1** | Down, or data lost/wrong | nobody can log in; approvals change the wrong balance | drop everything; update Nadeesha every 30 min |
| **SEV2** | A feature is broken, a workaround exists | team inbox empty but HR view works | fix today; update when fixed |
| **SEV3** | Annoying | slow page, cosmetic error | fix this week |

## The default runbook

1. **SYMPTOM** — write down who reported what, and when it started. Open an incident note (timestamps from here on).
2. **HEALTH** — is the process up?
   ```bash
   curl -s -w ' %{http_code}\n' https://leave.ceylonroots.lk/api/health
   # [local] curl -s http://localhost:4000/api/health
   ```
   `200 {"status":"ok",...}` = process and routing are fine; look deeper. Timeout / 5xx = the service itself.
3. **LOGS** — what is failing, which route, since when?
   ```bash
   aws logs tail /aws/apprunner/leaveflow-api/<service-id>/application --region ap-south-1 --since 30m
   aws logs tail ... --since 30m --filter-pattern '{ $.res.statusCode >= 500 }'
   aws logs tail ... --since 30m --filter-pattern '{ $.res.statusCode = 401 }'
   ```
   Note the **first** bad timestamp — it usually lines up with a deploy or a config change.
4. **DATABASE** — RDS console → `leaveflow-db`: status *Available*? CPU, `DatabaseConnections`, free storage.
   [local] `curl` any authenticated route; a pg error in the 500 stack trace on stderr points here.
5. **RECENT CHANGES** — App Runner → *Activity* / *Configuration* history: a deploy or env-var edit near the
   first bad timestamp? `git log --oneline -10` on `main`.
6. **MITIGATE**
   - Bad deploy → App Runner: redeploy the **last good image SHA** (rollback). Prefer this over fixing forward.
   - Config change → restore the previous value (then make it permanent in git/documented config — no silent console fixes).
   - DB full / down → see "Connections exhausted" below or RDS events; restore per `backup-restore-drill.md` only for data loss.
7. **COMMUNICATE** — tell Nadeesha: what's broken, what you're doing, when the next update is. Plain words.
   > "LeaveFlow logins are failing since 09:00. I'm rolling back this morning's change now. Next update 09:30."
8. **VERIFY** — health 200, a real login works, error rate back to normal in the logs, alarm cleared.
9. **AFTERWARDS** — blameless post-mortem within 48 h using `docs/postmortem-template.md`.

## Symptom → first suspect

| What you see | Most likely | Check |
|---|---|---|
| Health 200, **every** authenticated call 401 `BAD_TOKEN`, starting at one exact minute | `JWT_SECRET` changed (all tokens invalid) | App Runner configuration history |
| Health 200, logins 401 `BAD_CREDENTIALS` for everyone | wrong/empty DB (e.g. `DATABASE_URL` points at a fresh DB) | log line for a known user; RDS endpoint in config |
| Many `429 RATE_LIMITED` for many users at once | limiter keyed on the proxy IP (no `trust proxy`), so all users share one bucket | `req.remoteAddress` in logs is the same for everyone → set `app.set('trust proxy', …)` |
| 500 `INTERNAL`, stack says `relation "users" does not exist` | migrations not run on that DB | start command includes `npm run migrate` |
| 500s, `ECONNREFUSED` / timeout to `:5432` | DB down, or security group / VPC connector changed | RDS status; `leaveflow-db-sg` inbound rule |
| 500s, `sorry, too many clients already` | connections exhausted | section below |
| Health times out | container crashed or App Runner paused | App Runner events and application logs |

## Runbook: connections exhausted ("sorry, too many clients already")

- **Symptoms:** 500 `INTERNAL` on DB-backed routes; `/api/health` may still be 200 (it doesn't touch the DB);
  stderr stack contains `sorry, too many clients already` (SQLSTATE `53300`).
- **Check:** RDS metric `DatabaseConnections` versus `max_connections` (for `db.t4g.micro` it is small, roughly
  80–110; confirm with `SHOW max_connections;`). App Runner instance count × pg pool size (node-postgres
  default `max` is 10 per process).
- **Likely causes:** App Runner scaled out (instances × 10 > limit); a connection leak (a `pool.connect()` client
  not released — in our code only the approve transaction uses one, and it releases in `finally`); someone left
  sessions open from a laptop/psql.
- **Mitigate:** cap App Runner max instances; restart the service (drops its pool); in RDS terminate idle
  sessions: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND usename = 'postgres' AND pid <> pg_backend_pid();`
- **Prevent:** set the pool `max` explicitly so instances × max < `max_connections` − headroom; alarm on
  `DatabaseConnections` > 70% of the limit; keep the `finally { client.release() }` pattern in code review.

## Contacts

| Role | Who |
|---|---|
| Service owner / on-call | Shanesha (intern) |
| Mentor / escalation | mentor (named at go-live) |
| Business owner | Nadeesha Perera (HR Manager) |
