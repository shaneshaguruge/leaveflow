# Hosting: Vercel + Neon (what is actually live)

> **Status: LIVE.** <https://leaveflow-lake.vercel.app> — website, API and database, all on free plans.
> Render and AWS were dropped: both want a credit card, and this project is free-only
> ([`deploy-render.md`](deploy-render.md) and [`deploy-aws.md`](deploy-aws.md) are kept as unused plans).

| Tier | Where it runs | Source |
|---|---|---|
| Website | Vercel static hosting | `client/`, built by Vite to `client/dist` |
| API | Vercel serverless function, same project | `api/index.js` wrapping the Express app in `server/` |
| Database | Neon PostgreSQL 16 (free), created from Vercel → Storage, region `iad1` | migrations in `server/src/db/migrations/` |

## How a request travels

1. The browser asks for a page → Vercel serves the built website.
2. The page calls `/api/...` on the **same domain** → `vercel.json` rewrites `/api/(.*)` to the function, which hands the
   request to Express. Same origin, so there is no CORS setup at all.
3. Express talks to Neon over TLS using `DATABASE_URL` (the pooled connection string Vercel injects).
4. Any other path falls back to `/index.html`, so refreshing `/holidays` works.

## Deploys

Only through GitHub: branch → PR → checks (lint, test-api, test-client) → merge to `main`. Vercel builds `main` by
itself. No CLI, no uploads, no manual database step.

## Settings that matter (Vercel dashboard)

| Setting | Value |
|---|---|
| Root Directory | **empty** (the repo root, so `vercel.json`, `api/` and `client/` are all in scope) |
| Install / Build / Output | from `vercel.json`: installs `server` (prod deps) and `client`, builds the client, publishes `client/dist` |
| `DATABASE_URL` | added automatically by the Neon integration |
| `JWT_SECRET` | added by hand in Settings → Environment Variables (Production + Preview) |

## Migrations and seed data

`api/index.js` calls `ensureMigrated()` on the first request of each function instance. `migrate()` runs everything in
**one transaction holding `pg_advisory_xact_lock`**, so:

- it is safe to run on every cold start (already-applied files are skipped);
- two cold starts at once cannot apply the same file twice (proven by a test: with the lock line removed, three
  parallel runners fail with `duplicate key value violates unique constraint`);
- a transaction-level lock also works through Neon's transaction-mode pooler.

The seed data (demo users, requests, balances, the 2026 holidays) is part of migrations 002–006, so a fresh database
becomes demo-ready by itself.

## Verified live on 2026-09-23

- `GET /api/health` → `200 {"status":"ok","version":"0.4.0",…}` (JSON, not the web page).
- All three demo logins → `200` with the right roles: Ishara EMPLOYEE, Ruwan MANAGER, Dilini HR_ADMIN; a wrong
  password → `401`.
- Neon really holds the schema and seed: 25 holidays for 2026, 5 leave requests across 3 people, Ishara's balances
  (Annual 1/14, Casual 0/7, Sick 0/7), Ruwan's approvals queue, CSV export `200 text/csv`, employee blocked from
  `/api/holidays` with `403`.
- Half day end to end: booking Fri 27 Nov morning reserved **0.5** (13 → 12.5), Ruwan's card showed `AM · 0.5 days ·
  13 → 12.5 after`, a half day on Ill poya was refused by name, and cancelling gave the 0.5 back (13 again).
- Login rate limit in production: repeated wrong passwords → `401` then **`429`** within the minute.

## Limits of the free plans

- Neon free: one project, storage and compute limits, and the compute sleeps when idle — the first request after a
  quiet spell is slow (the function also cold-starts and runs the migration check).
- Vercel free (Hobby): fine for a demo; it is for non-commercial use.
- Preview deployments are protected by Vercel login, so only the production URL is publicly testable.
- Not done here: a spend alarm (nothing can be billed on free plans), a private database network (Neon is reachable
  from the internet with credentials over TLS), and a custom domain — the app uses Vercel's `*.vercel.app` HTTPS.
