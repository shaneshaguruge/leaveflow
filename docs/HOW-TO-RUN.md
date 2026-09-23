# How to run LeaveFlow (and demo it)

> **Hosted version:** <https://leaveflow-lake.vercel.app> is live (same logins). You only need the local setup below to develop,
> or to demo without depending on the internet.

A printable version is [`LeaveFlow-How-to-Run.pdf`](LeaveFlow-How-to-Run.pdf) (4 pages, A4).

Two ways: **Docker** (normal) or **without Docker** (backup, if Docker Desktop won't start). Commands are for
**Git Bash**.

## Start with Docker

1. Open **Docker Desktop** and wait until the bottom-left says **Engine running**.
2. In Git Bash:

```bash
cd /e/leaveflow
git pull
docker compose up -d --build
docker compose exec api npm run migrate
docker compose exec api npm run seed
```

3. Open **http://localhost:8080**

## Start without Docker (backup)

One command from the repo root (the first time, `npm install` also installs `server/` and `client/`):

```bash
cd /e/leaveflow && npm install && npm run dev
```

Open **http://localhost:5173**. Ctrl+C stops everything. Or, in three Git Bash windows:

```bash
# window 1: the database (leave it open)
cd /e/leaveflow/server && npm run db
```

```bash
# window 2: migrations, then the API (leave it open; its log is useful during the demo)
cd /e/leaveflow/server && npm run migrate && npm run dev
```

```bash
# window 3: the web app (leave it open)
cd /e/leaveflow/client && npm run dev
```

Open **http://localhost:5173**

## Logins

Password for all: **`password123`**

| Email | Role |
|---|---|
| ishara@ceylonroots.lk | Employee (reports to Ruwan) |
| ruwan@ceylonroots.lk | Manager |
| dilini@ceylonroots.lk | HR |

## Stop, and start again later

**Docker:** data is kept in the `leaveflow_dbdata` volume.

```bash
cd /e/leaveflow
docker compose down
```

To start again, run `docker compose up -d` from the same folder. **Never** run `docker compose down -v`: it deletes
the data.

**Without Docker:** press **Ctrl+C** in windows 3 and 2, then in window 1 (or run `cd /e/leaveflow/server && npm run
db:stop`). Data is kept in `server/.pgdata`. To start again, repeat the three windows.

## Quick fixes

| Problem | Fix |
|---|---|
| `failed to connect to the docker API` / Docker Desktop won't start | Open Docker Desktop and wait for **Engine running**. If it shows an error about `dockerInference … cannot be accessed by the system`: in Docker Desktop **Settings → AI**, untick **Enable Docker Model Runner** and **Docker AI (Ask Gordon)**, then **Apply & restart** (or run `docker desktop disable model-runner`). That fixed it on 2026-09-22. For the demo, use **Start without Docker** above |
| Port 8080 is busy | An old stack is still running: `docker compose down`, then start again. To see what holds the port: `netstat -ano \| grep :8080` |
| Login says "Wrong email or password" | The database has no seed data yet: `docker compose exec api npm run migrate` and `docker compose exec api npm run seed` (without Docker: `cd /e/leaveflow/server && npm run migrate`) |
| The page shows old screens (no Morning/Afternoon, no Holidays tab) | Rebuild: `git pull && docker compose up -d --build`, then press **Ctrl+Shift+R** in the browser |

## 5-minute demo

| Min | Do | Point out |
|---|---|---|
| 0:00 | Say the two asks: **half days** that cost 0.5, and **public holidays** that are never charged | We store `day_part` (Full / AM / PM), not a yes/no half-day flag, so managers can see which half |
| 0:30 | Log in as **Ishara**. Note the **Annual** number (e.g. 13) | "Watch this drop by exactly 0.5" |
| 1:00 | Apply: **Annual**, start and end **2026-10-09** (a Friday), choose **Afternoon**, reason "School meeting", **Submit request** | The form says "= 0.5 working days"; My requests shows "2026-10-09 PM · 0.5 days"; 0.5 is **reserved** |
| 2:00 | Log out. Log in as **Ruwan** → **Approvals** | The card shows a **PM** badge, "2026-10-09 PM", "0.5 days" and "Annual balance 13 → 12.5 after". Click **Approve** |
| 2:45 | Log in as **Ishara** again | Status **APPROVED**; Annual **used +0.5**, remaining **12.5** |
| 3:15 | Log in as **Dilini** → **Holidays** (2026) | 25 holidays, each "to confirm against the official gazette". Add **2026-12-31**, "Special bank holiday" → it appears in the list |
| 4:00 | **All requests** → **Export CSV** | The CSV has a Day part column (PM) and working days that skip holidays; it opens in Excel |
| 4:30 | Questions | Next on the list: the New Year shutdown week in the Holidays screen, and a half day at the start of a trip |

If "overlap" appears on 2026-10-09, that date is already booked in this database: pick another weekday.
If anything goes wrong, look at the API log (Docker: `docker compose logs -f api`; without Docker: window 2) before
saying anything.

After the demo, as Dilini, **Delete** the 2026-12-31 holiday so the list is back to the 25.
