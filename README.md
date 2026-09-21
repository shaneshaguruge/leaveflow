# LeaveFlow

Leave management for Ceylon Roots (Pvt) Ltd, a demo internship project built by following the *LeaveFlow Field Guide*.
Employees apply for leave (full days or a morning/afternoon half day) and see their balances; managers approve or reject their team's requests and see who else
is off that week; HR sees and exports every request and maintains the public-holiday calendar, which is never charged against anyone's balance.

**Stack:** React 18 + Vite (client) · Node 24 + Express 5 (API) · PostgreSQL 16 · Docker Compose · GitHub Actions.
Everything in this repo is demo data.

## Run it with Docker (recommended)

```bash
docker compose up -d --build
docker compose exec api npm run migrate     # schema + demo data; safe to re-run
```

Open **http://localhost:8080**. Stop with `docker compose down` (keeps the data volume; `down -v` deletes it).

## Run it without Docker

Needs Node 24. Two terminals for the API, one for the client.

```bash
cd server
cp .env.example .env       # set DATABASE_URL=postgres://postgres:leaveflow_dev@localhost:5432/leaveflow and any JWT_SECRET
npm install
npm run db                 # terminal 1: PostgreSQL 16 from node_modules (creates leaveflow, leaveflow_test, leaveflow_e2e)
npm run migrate            # terminal 2: schema + demo data
npm run dev                # API on http://localhost:4000
```

```bash
cd client
npm install
npm run dev                # http://localhost:5173 (proxies /api to :4000)
```

`npm run db:stop` stops the database.

## Demo logins

Password for all: `password123`

| Email | Role | Notes |
|---|---|---|
| ishara@ceylonroots.lk | EMPLOYEE | reports to Ruwan |
| kasun@ceylonroots.lk | EMPLOYEE | reports to Ruwan |
| ruwan@ceylonroots.lk | MANAGER | approves Ishara and Kasun |
| dilini@ceylonroots.lk | HR_ADMIN | sees and approves everyone, exports CSV, manages public holidays |

## Run the tests

| Suite | Command | Needs |
|---|---|---|
| API (Jest + Supertest) | `cd server && DATABASE_URL=postgres://postgres:leaveflow_dev@localhost:5432/leaveflow_test npm test` | `npm run db` running; refuses any database not ending in `_test` |
| Client (Vitest) | `cd client && npm test` | nothing |
| End to end (Playwright) | `npm install && npx playwright install chromium && npm run test:e2e` (repo root) | `npm run db` running; resets `leaveflow_e2e` and starts both apps itself |
| Lint | `npm run lint` in `server/` and in `client/` | nothing |

CI runs lint, the API tests (against a Postgres 16 service) and the client tests on every pull request; `main` is
protected and needs all three green. Merges to `main` publish `ghcr.io/shaneshaguruge/leaveflow-api:<sha>` and `:main`.

## Where things are

- `server/` API: `src/routes`, `src/db/migrations` (numbered SQL, seed data included), `tests/`
- `client/` React app
- `e2e/` Playwright specs
- `docs/` every project document, indexed in [`docs/README.md`](docs/README.md); progress in
  [`docs/STATUS.md`](docs/STATUS.md)
- [`CHANGELOG.md`](CHANGELOG.md) what changed, by phase and PR
