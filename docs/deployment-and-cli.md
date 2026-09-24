# Deployment and CLI connections

How LeaveFlow is connected today, and what the command-line tools would do if an assignment asks for them.
Everything below was checked with read-only commands on 2026-09-24; anything that could not be checked from this PC is
marked **not verified**.

## 1. How it is connected today

```
   you (laptop)
        │  git push  (branch)          ← HTTPS, Git Credential Manager
        ▼
   GitHub  shaneshaguruge/leaveflow
        │  pull request → checks: lint · test-api · test-client
        │  merge into main
        ▼
   Vercel project "leaveflow"          ← watches main, builds it by itself
        ├── website   client/ built by Vite → client/dist
        └── API       api/index.js → the Express app in server/
                            │  DATABASE_URL (set by the Neon integration)
                            ▼
                      Neon PostgreSQL 16 (free plan)
```

- **Repository:** `origin` is `https://github.com/shaneshaguruge/leaveflow.git` (verified: `git remote -v`), working
  branch `main` (verified: `git rev-parse --abbrev-ref HEAD`).
- **Vercel** builds `main` automatically after each merge and serves <https://leaveflow-lake.vercel.app>. The routing
  lives in `vercel.json`: `/api/*` goes to the function, everything else falls back to `index.html`. (Observed on
  every merge in this project; the dashboard settings themselves are **not verified** from this PC.)
- **Neon** was created from Vercel's **Storage** tab and connected to the project, so Vercel injects `DATABASE_URL`
  (and `DATABASE_URL_UNPOOLED`, `PG*`). Nothing connects to Neon from a laptop. The database URL is never in the repo:
  only `server/.env.example` is tracked, and `.env` is in `.gitignore` (verified).
- **Migrations and demo seed** run themselves on the API's first request after a deploy, under a Postgres advisory
  lock — see [`deploy-vercel.md`](deploy-vercel.md).

### How git authenticates on this PC

| Thing | What is configured | How it was checked |
|---|---|---|
| Protocol | **HTTPS**, not SSH — the remote URL starts with `https://` | `git remote -v` |
| Credential store | **Git Credential Manager** (`credential.helper = manager`): it stores the GitHub login in Windows Credential Manager and opens a browser window the first time | `git config --get-all credential.helper` |
| SSH | A key exists at `~/.ssh/id_ed25519.pub` but is **not used** for this repo, because the remote is HTTPS. Whether it was ever added to the GitHub account is **not verified** | `ls ~/.ssh/*.pub` |
| Versions | git 2.53.0, gh 2.87.3 | `git --version`, `gh --version` |

> During AI-assisted sessions, pushes were made with a one-off flag,
> `git -c credential.helper='!gh auth git-credential' push`, which borrows the GitHub CLI's token for that single
> command. It changes no saved configuration.

### How `gh` (GitHub CLI) is used

`gh auth status` reports: logged in to github.com as **shaneshaguruge**, token stored in the **keyring**, git protocol
**https**, scopes `gist`, `read:org`, `repo`, `workflow` (verified; the token value is never printed).

It is used for repository work without leaving the terminal:

```bash
gh pr create --base main --head my-branch --title "..." --body "..."
gh pr checks 42          # are lint / test-api / test-client green?
gh pr merge 42 --merge   # merge once they pass
gh issue list            # the parked backlog
gh run list --branch main --limit 3   # CI and Release history
```

### Why we deploy only through GitHub

- Every change is reviewed as a **pull request** and must pass three checks (`lint`, `test-api`, `test-client`) before
  it can reach `main` — `main` is protected.
- Vercel builds **`main`**, so the live site always matches the repository. There is no "works on my laptop" version
  in production.
- Every deploy has a commit, a PR and a log behind it, so any change can be traced or reverted.

## 2. CLI connection, if the assignment asks for it (documented, not executed)

### Git and GitHub CLI

Installed on this PC and already logged in (see the tables above). If the login is ever lost:

```bash
gh auth login        # choose GitHub.com → HTTPS → log in with a browser
gh auth setup-git    # let git use the gh login for pushes
gh auth status       # check: account, protocol, scopes
git remote -v        # check the repo points at shaneshaguruge/leaveflow
git push --dry-run   # proves authentication works, pushes nothing
```

### Vercel CLI — reference only

**Not installed on this PC** (verified: it does not appear in `npm ls -g --depth=0`). The project is already connected
to GitHub, so the CLI is **optional**. What each command would do:

| Command | What it does |
|---|---|
| `npm i -g vercel` | installs the CLI globally |
| `vercel login` | logs the CLI into your Vercel account (browser or email code) |
| `vercel link` | connects the current folder to an existing Vercel project, writing a local `.vercel/` folder (git-ignored) |
| `vercel env pull` | downloads the project's environment variables into a local file (e.g. `.env.local`) so the app can run locally against the same settings. **Treat that file as secret and never commit it** |
| `vercel logs <url>` | prints logs for a deployment from the terminal |

> ⚠️ **Never use `vercel deploy` (or `vercel --prod`) for this project.** It uploads whatever is on the laptop straight
> to Vercel, bypassing the pull request, the three checks and the commit history. The live site would then no longer
> match `main`, and nobody could tell what was deployed. Real deploys happen one way only: merge into `main` and let
> Vercel build it.

### Neon

The Vercel–Neon integration created the database and put `DATABASE_URL` into the Vercel project, so the API reads it as
an environment variable at runtime. Nobody connects to Neon from a PC, and no database URL is stored in the repo. If
you ever need to look at the data, use the **Neon console's SQL Editor** in the browser.

## 3. How to check everything is fine (read-only)

```bash
cd /e/leaveflow
git status                 # should be clean (or only files you are editing)
git log --oneline -5       # the last few merges
gh pr list                 # open pull requests
gh run list --branch main --limit 3   # CI and Release on main
```

Then the live site:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://leaveflow-lake.vercel.app/         # expect 200
curl -s https://leaveflow-lake.vercel.app/api/health                                 # expect {"status":"ok",...}
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://leaveflow-lake.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ishara@ceylonroots.lk","password":"password123"}'                    # expect 200
```

If `/api/health` returns HTML instead of JSON, the API is not being served — check `vercel.json` and the project's Root
Directory. If the login returns 500 or 503, suspect the database or a missing `JWT_SECRET`.

**Logs:** Vercel dashboard → project **leaveflow** → **Logs** tab (runtime logs for the live site; you can also open a
deployment and read its build log). Each line is JSON from pino with a request id and the status;
`authorization` headers are redacted. Reading these needs the dashboard, because the CLI is not installed here.

**Automatic check:** `.github/workflows/uptime.yml` runs every 15 minutes and fails (which emails the repo owner) if the
website, `/api/health` or a demo login stops working.

## 4. Where the other documents are

| Document | What it covers |
|---|---|
| [`HOW-TO-RUN.md`](HOW-TO-RUN.md) | Start and stop the app locally (Docker or not), demo logins, quick fixes, a 5-minute demo |
| [`deploy-vercel.md`](deploy-vercel.md) | The live Vercel + Neon hosting in detail, and how it was verified |
| [`STATUS.md`](STATUS.md) | Where the project stands, known issues, what is left |
| [`PROGRESS.md`](PROGRESS.md) | All 95 Field Guide checkboxes with the proof for each |
| [`decisions.md`](decisions.md) | Decision log (ADR-1…10): Postgres over SQLite, bcryptjs, `day_part`, 0 required approvals, and more |
| [`deploy-render.md`](deploy-render.md) · [`deploy-aws.md`](deploy-aws.md) | Not used — both need a credit card; kept as plans |
