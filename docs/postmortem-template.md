# Post-mortem template (blameless)

> Copy this file to `docs/postmortems/YYYY-MM-DD-short-name.md` and fill it in within **48 hours** of the incident.
> **Status:** template only. No LeaveFlow incident has happened yet and the guide's staged incident drill
> (mentor rotates `JWT_SECRET` on staging) has **not** been run — there is no staging environment.

**Blameless means:** name causes, never culprits. Write "the deploy process allowed an unmigrated schema",
not "Kasun broke it". People who fear blame hide mistakes, and hidden mistakes repeat.

---

## INCIDENT YYYY-MM-DD: <one-line summary> (SEVn, <prod | staging>)

| | |
|---|---|
| **Severity** | SEV1 / SEV2 / SEV3 (see `docs/runbook.md`) |
| **Environment** | prod / staging |
| **Detected by** | alarm / user report / someone noticed |
| **Duration** | start → resolved (minutes) |
| **Impact** | who could not do what, how many requests/users affected, any data lost or wrong |
| **Author(s)** | |
| **Status** | draft / reviewed / action items done |

### Timeline (local time, Asia/Colombo)

| Time | Event |
|---|---|
| hh:mm | first bad event (from logs, not memory) |
| hh:mm | detected (alarm / report) |
| hh:mm | runbook started; what each step showed |
| hh:mm | mitigation applied (rollback / config restored) |
| hh:mm | verified recovered |

Include the request id(s) or log filter that proved each step, e.g.
`aws logs tail … --filter-pattern '{ $.res.statusCode = 401 }'`.

### Root cause

What in the **system** made this possible. Ask "why?" until you reach something you can change
(process, check, alarm, code), not a person.

### Mitigation and resolution

What was done to restore service, and what was done afterwards to fix it properly. If a console change was
used to mitigate, link the commit that made it permanent.

### What went well

### What went badly / where we got lucky

### Action items

| # | Action | Type (prevent / detect / mitigate) | Owner | Due | Issue |
|---|---|---|---|---|---|
| 1 | | | | | #… |

---

## Worked example (from the guide's staged drill — illustrative, not a real LeaveFlow incident)

**INCIDENT 2026-09-14: all logins failing on staging (SEV1, staging only)**

| Time | Event |
|---|---|
| 09:00 | `JWT_SECRET` rotated on the staging service and redeployed |
| 09:02 | alarm: 401 spike |
| 09:15 | logs: ~100% 401 on authenticated routes, `BAD_TOKEN`, starting at one exact minute; health 200; DB healthy |
| 09:24 | previous secret restored |
| 09:26 | 401 rate back to normal; alarm clears |

- **Root cause:** rotating `JWT_SECRET` invalidated every issued token at once; nothing in the deploy process
  flagged a secret change as user-impacting, and the API's `BAD_TOKEN` response is the same for expired and
  wrongly-signed tokens, so it looked like a login bug rather than a config change.
- **Went well:** the alarm fired before users reported; runbook step 3 (logs) found the exact start minute.
- **Action items:** log a distinct reason for signature failures vs expiry (without logging the token);
  document secret rotation as planned maintenance with a "everyone must log in again" notice.
