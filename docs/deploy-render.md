# Deploy to Render (Phase 9, part 1)

> **Status: NOT USED.** Render asks for a credit card, and this project is free-only. The app is hosted on
> **Vercel + Neon** instead — see [`deploy-vercel.md`](deploy-vercel.md). `render.yaml` in the repo root is kept only
> as a record. Nothing below was ever deployed.
>
> **Original note:** No Render account exists for this project yet
> (see `STATUS.md`, "Phase 9 Render and AWS deployment: needs AWS or Render account").
> Every step below is written to be run later; no step has been executed. When you run it, fill in
> the "Deploy log" table at the bottom with real values.

Render is the quick win: a PaaS where the three LeaveFlow tiers become three Render resources and
HTTPS, DNS and wiring are included. Expect ~30 minutes.

| Tier | Render resource | Source in the repo |
|---|---|---|
| Database | PostgreSQL `leaveflow-db` | schema + seed from `server/src/db/migrations/*.sql` |
| API | Web Service `leaveflow-api` (Docker) | `server/Dockerfile` (branch `feat/docker-ci`) |
| Client | Static Site `leaveflow` | `client/` (branch `feat/client`), built with Vite to `client/dist` |

## 0. Before you start

- [ ] `server/Dockerfile` and `client/` are merged to `main` (today they live on `feat/docker-ci` and `feat/client`).
- [ ] CI on `main` is green (`.github/workflows/ci.yml`).
- [ ] You know the free-tier limits: free web services **spin down after ~15 idle minutes** (first request then
      takes 30–60 s), and free Render Postgres instances **expire** after a fixed period — check Render's current
      terms before relying on it for anything but a demo.
- [ ] No card on file is needed for free instances. If Render asks for one, stop and decide deliberately.

## 1. Create the database

1. Sign in to <https://render.com> with GitHub (`shaneshaguruge`).
2. **New → PostgreSQL**
   - Name: `leaveflow-db`
   - Region: **Singapore** (nearest Render region to Colombo)
   - PostgreSQL version: **16** (matches local 16.14 and the planned RDS)
   - Instance type: Free
3. When it shows *Available*, copy the **Internal Database URL**. Services inside Render reach the DB over
   this private address; the External URL is for your laptop and should rarely be needed.

## 2. Create the API service

1. **New → Web Service** → connect the `leaveflow` repo, branch `main`.
2. Root Directory: `server` · Language/Runtime: **Docker** (Render builds `server/Dockerfile`).
3. Region: **Singapore** (same as the DB — the internal URL only works within a region).
4. Environment variables (Settings → Environment). **Never** commit these, never bake them into the image:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Internal Database URL from step 1 |
   | `JWT_SECRET` | click **Generate** (a fresh random value — never reuse the dev secret in `server/.env`) |
   | `LOG_LEVEL` | `info` (optional; `info` is the default) |

   `PORT` is injected by Render; `server/src/server.js` already reads `process.env.PORT || 4000`.
   `NODE_ENV=production` is set by the Dockerfile. **Do not set `NODE_ENV=test`** — it silences logs and
   switches the login rate limiter off.
5. Health Check Path: `/api/health`.
6. **Trust proxy.** Render puts a proxy in front of the container, so Express would see every request as
   coming from the proxy and the login limiter (10/min per IP) would be shared by *everyone*.
   `server/src/app.js` already reads the **`TRUST_PROXY`** environment variable (number of proxy hops) and
   calls `app.set('trust proxy', …)` with it — no code change needed. Add env var **`TRUST_PROXY=1`** here,
   then re-run the 11-login check against the Render URL (`docs/security-audit.md`, "Login brute force").

## 3. Run migrations (and seed) the first time

An empty database has no tables. Open the service's **Shell** tab and run:

```bash
npm run migrate
```

`npm run seed` also exists (added in PR #26, the guide's step) but runs the **same** idempotent runner: the seed
data is in migrations `002_seed.sql`–`004_fix_demo_balance_for_holidays.sql`, so `migrate` already creates the
schema and the seed users in one go, and a second run of either script prints nothing because applied files are
recorded in `schema_migrations`.

> ⚠️ `002_seed.sql` creates the three demo users with password `password123`. That is fine for a demo on
> Render, **not** for Ceylon Roots' real data. Before real users: change those passwords or remove the demo
> seeds from the production path.

Alternative if the Shell tab is unavailable on the free plan: set the service's start command to
`npm run migrate && node src/server.js` (the guide's `start:prod`, see `deploy-aws.md` §6).

## 4. Create the static site for the client

1. **New → Static Site**, same repo, branch `main`.
2. Root Directory: `client` · Build Command: `npm ci && npm run build` · Publish Directory: `dist`.
3. **Redirects/Rewrites** — add in this order (order matters):

   | Source | Destination | Action |
   |---|---|---|
   | `/api/*` | `https://leaveflow-api.onrender.com/api/*` | Rewrite |
   | `/*` | `/index.html` | Rewrite |

   The client calls relative `/api/...` (`client/src/api.js`), so the first rule keeps browser and API on
   one origin (no CORS); the second makes deep links work in the SPA.

## 5. Verify

Replace the hostnames with the ones Render shows.

```bash
curl -s https://leaveflow.onrender.com/api/health
# expect 200 and a body like {"status":"ok","version":"0.4.0","uptime":12.3}
# (the guide shows {"status":"ok"}; our /health also returns version and uptime)

curl -s -X POST https://leaveflow.onrender.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ishara@ceylonroots.lk","password":"password123"}'
# expect 200 { "token": "...", "user": { "id": 2, "name": "Ishara Fernando", "role": "EMPLOYEE" } }
```

- [ ] Padlock in the browser; certificate issued by Let's Encrypt (Render provisions it automatically).
- [ ] Log in as Ishara in the browser, apply for one day, log in as Ruwan, see it in Approvals.
- [ ] Logs tab shows **one JSON line per request** with a `req.id`, and `"authorization":"[Redacted]"`.
- [ ] 11 bad logins within a minute → the 11th is `429 RATE_LIMITED` (only meaningful after the trust-proxy fix).

## 6. Teardown

Delete in this order: Static Site → Web Service → PostgreSQL. Full list: `docs/teardown-checklist.md`.

## Deploy log (fill in when actually done)

| Date | Who | Commit / image | API URL | Client URL | Health result | Notes |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | not deployed yet |
