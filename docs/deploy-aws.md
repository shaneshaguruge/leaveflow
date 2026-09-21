# Deploy to AWS (Phase 9, part 2): production-shaped LeaveFlow

> **Status: PLAN — nothing here has been created.** There is no AWS account for this project yet, and no
> resource has been created, no sign-in done. Every command below is a plan to run later.
> When you do run it, record real IDs and times in the "Build log" at the bottom and keep
> `docs/teardown-checklist.md` in step with what you create.

## Target topology

```
Browser ──HTTPS──► CloudFront (ACM cert for leave.ceylonroots.lk, us-east-1)
                     ├── default behaviour ──► S3 bucket leaveflow-client (private, via OAC)
                     └── /api/*  (no cache) ──► App Runner leaveflow-api (ap-south-1)
                                                   │ VPC connector
                                                   ▼  :5432, SG-to-SG only
                                                RDS PostgreSQL 16 leaveflow-db (Public access: No)
```

Region for everything except the certificate: **ap-south-1 (Mumbai)**, ~30–40 ms from Colombo versus 200+ ms
to us-east-1. The CloudFront certificate **must** be in **us-east-1**.

## Hard rules (do not skip, do not reorder)

1. **Root user is retired** after step 1: MFA on, no access keys, never used for daily work.
2. **Budget alarm before the first resource** (step 2). No alarm, no resources.
3. **RDS is never public.** `Public access: No`; its security group has **no** CIDR rule on 5432 — only the
   App Runner VPC connector's security group. `0.0.0.0/0` on 5432 is a stop-the-line defect.
4. **Secrets live in App Runner's environment configuration** (or Secrets Manager), never in the image,
   never in git. Prod gets its own `JWT_SECRET`; it never shares dev's.
5. **Teardown checklist is kept current** as each resource is created (`docs/teardown-checklist.md`).

## 1. Account hygiene

- [ ] Create the AWS account (owner's email, not a personal one if avoidable).
- [ ] Root user: enable MFA; confirm there are **no root access keys**.
- [ ] IAM → create user `shanesha-admin` (or IAM Identity Center user) with only what this project needs
      (App Runner, ECR, RDS, S3, CloudFront, ACM, CloudWatch, SNS, Budgets, EC2 security groups/VPC read),
      MFA enabled. Sign out of root; from now on sign in only as this user.
- [ ] Install AWS CLI v2 locally and `aws configure sso` / `aws configure` for that user. Default region `ap-south-1`.

## 2. Budget alarm FIRST

Billing → Budgets → Create budget → *Cost budget*, monthly, **US$10**, alert at **80% actual** (and optionally
100% forecasted) to the owner's email. Confirm the alert email address is correct.

CLI equivalent (fill in the account id and email):

```bash
aws budgets create-budget --account-id 123456789012 \
  --budget '{"BudgetName":"leaveflow-10usd","BudgetLimit":{"Amount":"10","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"owner@example.com"}]}]'
```

## 3. Push the API image to ECR

CI (`release.yml` on `feat/docker-ci`) publishes `ghcr.io/shaneshaguruge/leaveflow-api:<git-sha>` and `:main`.
There is **no `:latest` tag** (the guide assumes one) — pick a specific SHA for prod.

**This laptop has no Docker** (see `STATUS.md`), so the pull/tag/push cannot run here. Options: run it on a
machine with Docker, or add an ECR push step to `release.yml` using an OIDC role (no long-lived keys in GitHub).

```bash
aws ecr create-repository --repository-name leaveflow-api --region ap-south-1 \
  --image-scanning-configuration scanOnPush=true
aws ecr get-login-password --region ap-south-1 | docker login --username AWS \
  --password-stdin 123456789012.dkr.ecr.ap-south-1.amazonaws.com
docker pull ghcr.io/shaneshaguruge/leaveflow-api:<sha>
docker tag  ghcr.io/shaneshaguruge/leaveflow-api:<sha> \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/leaveflow-api:<sha>
docker push 123456789012.dkr.ecr.ap-south-1.amazonaws.com/leaveflow-api:<sha>
```

Add an ECR lifecycle rule (keep the last 10 images) so old images don't accumulate storage cost.

## 4. RDS PostgreSQL

Console → RDS → Create database:

| Setting | Value |
|---|---|
| Engine | PostgreSQL **16** |
| Template | Free tier |
| Instance | `db.t4g.micro` |
| Identifier | `leaveflow-db` |
| Initial database name | `leaveflow` |
| Master user / password | `postgres` / a long random password, stored in a password manager (not in git) |
| **Public access** | **No** |
| Security group | new: `leaveflow-db-sg` (starts with no inbound rules we need) |
| Automated backups | on, retention 7 days (needed for `docs/backup-restore-drill.md`) |
| Storage encryption | on (default) |

## 5. App Runner service

Console → App Runner → Create service:

| Setting | Value |
|---|---|
| Source | ECR, `leaveflow-api:<sha>`, automatic deployment **off** for prod (deploy deliberately) |
| Port | `4000` |
| Start command | `npm run migrate && node src/server.js` (see step 6) |
| Env: `DATABASE_URL` | `postgres://postgres:<pw>@<rds-endpoint>:5432/leaveflow` (App Runner secret / Secrets Manager reference preferred) |
| Env: `JWT_SECRET` | fresh 64-hex random value (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| Env: `LOG_LEVEL` | `info` |
| **Not** set | `NODE_ENV=test` (would silence logs and disable the login rate limiter) |
| Health check | HTTP, path `/api/health` |
| Networking | outgoing traffic via a **VPC connector** in the RDS VPC's private subnets, with SG `leaveflow-apprunner-sg` |

Then edit `leaveflow-db-sg`: inbound **TCP 5432, source = `leaveflow-apprunner-sg`** (a security group ID,
not a CIDR). No other inbound rules.

**Trust proxy.** Requests reach Express through CloudFront and App Runner's front end, so the login limiter
needs `trust proxy` set to the right hop count, or all users share one 10-per-minute bucket. The code already
handles this: `server/src/app.js` reads the **`TRUST_PROXY`** env var — set it on the App Runner service to the
number of hops (measure it: log `req.ips` once), then re-run the 11-login check (`docs/security-audit.md`).

## 6. Migrations in prod

App Runner has no shell, so migrations run at boot. `server/src/db/migrate.js` is idempotent (applied files are
recorded in `schema_migrations` and skipped). The guide adds this script to `server/package.json`:

```json
{ "scripts": { "start:prod": "npm run migrate && node src/server.js" } }
```

It is **not added yet** in this branch (this branch only changed dependencies in `package.json`); until it is,
use the start command in step 5, which is the same thing. A failed migration exits non-zero, the health
check never passes, and App Runner keeps the previous version serving.

> ⚠️ Seed migrations `002_seed.sql` / `003_seed_demo.sql` insert demo users with password `password123` and
> demo requests. Remove them from the prod path (or change those passwords immediately) before real data.

## 7. Frontend: S3 + CloudFront

```bash
aws s3api create-bucket --bucket leaveflow-client --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
aws s3api put-public-access-block --bucket leaveflow-client \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
cd client && npm ci && npm run build
aws s3 sync dist/ s3://leaveflow-client --delete
```

CloudFront → Create distribution:

- Origin 1: the S3 bucket via **Origin Access Control** (let CloudFront write the bucket policy). Default root object `index.html`.
- Origin 2: the App Runner default domain (HTTPS only).
- Behaviour `/api/*` → origin 2, **CachingDisabled**, origin request policy **AllViewer** (or AllViewerExceptHostHeader), all HTTP methods.
- Default behaviour → S3; `index.html` short/zero TTL, hashed `/assets/*` long TTL.
- Custom error response 403/404 → `/index.html` 200 (SPA deep links).
- After each client deploy: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/index.html"`.

## 8. Domain and TLS

1. ACM in **us-east-1**: request a public certificate for `leave.ceylonroots.lk`, DNS validation. Add the
   validation CNAME at the `.lk` registrar.
2. When *Issued*, add `leave.ceylonroots.lk` as an alternate domain name on the distribution with that certificate.
3. At the registrar: `CNAME leave.ceylonroots.lk → dxxxxxxxx.cloudfront.net`. Allow for propagation (TTL).

## 9. Prove it works

```bash
curl -s https://leave.ceylonroots.lk/api/health          # 200 {"status":"ok",...} from the internet
curl -sI https://leave.ceylonroots.lk/assets/index-*.js  # 2nd time: x-cache: Hit from cloudfront
psql "host=<rds-endpoint> user=postgres dbname=leaveflow connect_timeout=10"  # MUST time out = pass
```

- [ ] Padlock, certificate for `leave.ceylonroots.lk`.
- [ ] Create a leave request, redeploy App Runner, request still there (data is in RDS).
- [ ] CloudWatch log group for the service shows JSON lines with `req.id` and redacted `authorization`.
- [ ] 11 bad logins in a minute → 11th `429 RATE_LIMITED` (after the trust-proxy fix).

## Cost at LeaveFlow's scale (order of magnitude)

| Item | Approx. |
|---|---|
| RDS `db.t4g.micro` | ~US$12–15/month (free tier 750 h/month for 12 months) |
| App Runner | ~US$5–10/month |
| S3 + CloudFront | well under US$1 |
| Registrar / Route 53 | domain fee (+ ~US$0.50 per hosted zone if used); ACM $0 |
| Budget alarm | $0, mandatory |

Watch for: NAT gateways (not needed here — do not create one), a forgotten restore-test RDS instance, old ECR images.

## Build log (fill in when actually done)

| Step | Date | Resource / ID | Result |
|---|---|---|---|
| 1 root MFA + IAM user | — | — | not done |
| 2 budget alarm | — | — | not done |
| 3–8 | — | — | not done |
