# Backup and restore drill

> **Status: PLAN — not executed.** There is no RDS instance (no AWS account), so no snapshot exists to restore.
> A local stand-in was checked and is **not possible as-is**: the `embedded-postgres` package ships only
> `initdb`, `pg_ctl` and `postgres` (no `pg_dump` / `pg_restore` / `psql` in
> `server/node_modules/@embedded-postgres/windows-x64/native/bin/`), and this worktree may only use the
> `leaveflow_ops` database, so a restore into a second database was not attempted. See "Local drill" below.

**A backup you have never restored does not exist.** Run this drill monthly, on a quiet afternoon, so first-time
problems (wrong security group, wrong parameter group, an older snapshot than you assumed) happen then, not
during a SEV1.

## Targets

| Term | Meaning | LeaveFlow target (proposal — confirm with Nadeesha) |
|---|---|---|
| **RPO** — Recovery Point Objective | how much recent data we can afford to lose | **≤ 5 minutes** using RDS point-in-time recovery; ≤ 24 h if only nightly snapshots |
| **RTO** — Recovery Time Objective | how long we can be down while restoring | **< 60 minutes** (the guide's pass mark) |

RPO is a business decision: with only a 02:00 snapshot, a disk lost at 13:00 loses 11 hours of leave requests
and approvals. RDS automated backups (retention 7 days, set in `deploy-aws.md` §4) also enable point-in-time
restore to any second within the window, which is what gets RPO down to minutes.

## The RDS drill (plan)

Start a timer when you begin — the elapsed time to a **verified** restore is your measured RTO.

1. **Restore to a new instance** (restores never touch the original):
   RDS → Snapshots → latest automated snapshot of `leaveflow-db` → *Restore snapshot*
   - Identifier `leaveflow-restore-test`, `db.t4g.micro`, same VPC, **Public access: No** if you can test via
     App Runner/a bastion; if you must test from the laptop, *for this drill only* allow inbound 5432 from
     your laptop's **/32** IP — never `0.0.0.0/0` — and remove it in step 4.
   - Or point-in-time: `aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier leaveflow-db --target-db-instance-identifier leaveflow-restore-test --restore-time <UTC time>`
2. **Point a local API at it** (port 4100 so it can't be confused with dev):
   ```bash
   cd server
   DATABASE_URL="postgres://postgres:<PASS>@leaveflow-restore-test.xxxx.ap-south-1.rds.amazonaws.com:5432/leaveflow" \
     PORT=4100 node src/server.js
   TOKEN=$(curl -s -X POST http://localhost:4100/api/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"dilini@ceylonroots.lk","password":"<prod password>"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
   curl -s http://localhost:4100/api/leave-requests -H "Authorization: Bearer $TOKEN" | head -c 600
   ```
3. **Verify real data survived** — as HR_ADMIN the list is company-wide. Check against known facts, e.g. from
   the seed data (`003_seed_demo.sql`): request for Ishara (user 2) 2026-03-02→03 *Family wedding in Galle*
   **APPROVED** by user 1, and Ruwan's (user 1) 2026-02-09 Sick day **APPROVED** by user 3. For prod, pick 2–3
   recent real requests (id + status) *before* starting and confirm them. Also compare row counts:
   `SELECT count(*) FROM leave_requests;` on both instances (should differ only by writes after the snapshot).
4. **Clean up:** delete `leaveflow-restore-test` (**skip final snapshot** — it was a copy); remove any /32 rule
   you added. Confirm in `aws rds describe-db-instances`.
5. **Log it** in the table below. If RTO > 60 min, write down what took longest and fix that before next month.

## Local drill (what can be done without AWS)

Would work on a machine with the PostgreSQL 16 client tools installed (not present here):

```bash
pg_dump   "postgres://postgres:leaveflow_dev@localhost:5432/leaveflow_ops" -Fc -f leaveflow_ops.dump
createdb  -h localhost -U postgres leaveflow_restore_test
pg_restore -h localhost -U postgres -d leaveflow_restore_test leaveflow_ops.dump
DATABASE_URL=postgres://postgres:leaveflow_dev@localhost:5432/leaveflow_restore_test PORT=4100 node src/server.js
# log in, list requests, compare counts; then: dropdb leaveflow_restore_test
```

Not run in this worktree: no `pg_dump`/`pg_restore` binaries, and creating `leaveflow_restore_test` is outside
this task's database scope.

## Drill log

| Date | Snapshot / restore time used | Started | Verified | RTO (min) | Data checks | Deleted? | Notes |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | not executed: no RDS instance, no local pg_dump |
