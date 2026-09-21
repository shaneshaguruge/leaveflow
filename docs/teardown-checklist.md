# Teardown checklist

> **Status: PLAN — nothing to tear down yet.** No Render or AWS resource exists for LeaveFlow
> (`deploy-render.md`, `deploy-aws.md` are plans). This checklist was **not executed**. The guide asks for it to
> be run on a staging copy; that is blocked on having an account.

Cloud resources bill **while they exist**, not while you use them. Keep this list in step with what is actually
created: when you create something, add its real ID in the "ID" column the same day.

## AWS (ap-south-1 unless noted) — delete in this order

Order matters: things that depend on others go first, or the delete fails (e.g. a security group still used by
an RDS instance cannot be deleted).

| # | Resource | Name / ID | How | Check it is gone |
|---|---|---|---|---|
| 1 | CloudFront alternate domain + DNS CNAME `leave.ceylonroots.lk` | — | remove the CNAME at the registrar; remove the alt name from the distribution | `nslookup leave.ceylonroots.lk` no longer returns CloudFront |
| 2 | CloudFront distribution | — | **Disable**, wait for *Deployed*, then **Delete** | `aws cloudfront list-distributions` |
| 3 | CloudFront Origin Access Control | — | delete after the distribution | `aws cloudfront list-origin-access-controls` |
| 4 | ACM certificate (**us-east-1**) | — | delete after it is detached | `aws acm list-certificates --region us-east-1` |
| 5 | S3 bucket `leaveflow-client` | — | `aws s3 rb s3://leaveflow-client --force` (empties then deletes) | `aws s3 ls` |
| 6 | App Runner service `leaveflow-api` (and `leaveflow-api-staging`) | — | delete service | `aws apprunner list-services` |
| 7 | App Runner **VPC connector** | — | delete after the service | `aws apprunner list-vpc-connectors` |
| 8 | App Runner auto-scaling configuration (if custom) | — | delete | `aws apprunner list-auto-scaling-configurations` |
| 9 | RDS restore-test instance `leaveflow-restore-test` (if any) | — | delete, **skip final snapshot** (it was a copy) | `aws rds describe-db-instances` |
| 10 | RDS instance `leaveflow-db` | — | decide: final snapshot **yes** if the data matters, else no; disable deletion protection first | `aws rds describe-db-instances` |
| 11 | RDS manual snapshots | — | delete those you don't need (they bill for storage) | `aws rds describe-db-snapshots --snapshot-type manual` |
| 12 | Security groups `leaveflow-db-sg`, `leaveflow-apprunner-sg` | — | delete after 7 and 10 | `aws ec2 describe-security-groups --filters Name=group-name,Values=leaveflow-*` |
| 13 | RDS DB subnet group (if created) | — | delete | `aws rds describe-db-subnet-groups` |
| 14 | ECR repository `leaveflow-api` **and its images** | — | `aws ecr delete-repository --repository-name leaveflow-api --force` | `aws ecr describe-repositories` |
| 15 | CloudWatch alarm(s) (5xx) | — | delete | `aws cloudwatch describe-alarms` |
| 16 | CloudWatch log groups `/aws/apprunner/leaveflow-api/*` | — | delete (or set retention) | `aws logs describe-log-groups --log-group-name-prefix /aws/apprunner` |
| 17 | SNS topic `leaveflow-alerts` + subscriptions | — | delete | `aws sns list-topics` |
| 18 | Secrets Manager secrets (if used) | — | delete (7–30 day recovery window) | `aws secretsmanager list-secrets` |
| 19 | Any **NAT gateway / Elastic IP** created by accident | — | delete; release the EIP | `aws ec2 describe-nat-gateways`, `describe-addresses` |
| 20 | Route 53 hosted zone (only if one was created) | — | delete records, then zone | `aws route53 list-hosted-zones` |
| 21 | **Keep** the US$10 budget alarm and the IAM user until the bill shows $0 | — | last | Billing → Bills |

## Render — delete in this order

| # | Resource | How |
|---|---|---|
| 1 | Static Site `leaveflow` | Settings → Delete |
| 2 | Web Service `leaveflow-api` | Settings → Delete |
| 3 | PostgreSQL `leaveflow-db` | Settings → Delete (data is gone; export first if needed) |

## Done when

- [ ] Every row above has an ID or "never created", and a check that shows it gone.
- [ ] AWS Billing → Bills for the current month lists no running LeaveFlow line items; Cost Explorer forecast drops.
- [ ] Tag Editor / Resource Groups search in ap-south-1 **and** us-east-1 finds nothing tagged or named `leaveflow`.
- [ ] Render dashboard shows no LeaveFlow services.
- [ ] Date, who ran it and the final bill recorded below.

| Date | Environment | Who | Result |
|---|---|---|---|
| — | — | — | not executed (no resources exist) |
