# Branch protection for `main`

Goal: nothing reaches `main` unless it came through a pull request, got 1 approving review, and
passed all three CI checks on an up-to-date branch. Force pushes and branch deletion are blocked.

The required status checks are the job names in `.github/workflows/ci.yml`:

| Check name    | What it runs                                               |
|---------------|------------------------------------------------------------|
| `lint`        | `npm ci && npm run lint` in `server/` and in `client/`     |
| `test-api`    | `npm ci`, `npm run migrate`, `npm test` in `server/` against a `postgres:16` service |
| `test-client` | `npm ci`, `npm test` (Vitest), `npm run build` in `client/` |

The check names only show up in GitHub's picker after the CI workflow has run at least once on
the repo (open any PR first if the list is empty).

## Option A: GitHub web UI (classic branch protection rule)

1. Open https://github.com/shaneshaguruge/leaveflow and click **Settings** (you need admin on the repo).
2. In the left sidebar, under **Code and automation**, click **Branches**.
3. Next to **Branch protection rules**, click **Add classic branch protection rule**
   (older UI: **Add rule**).
4. **Branch name pattern**: `main`
5. Tick **Require a pull request before merging**.
   - Tick **Require approvals** and set **Required number of approvals before merging** to `1`.
6. Tick **Require status checks to pass before merging**.
   - Tick **Require branches to be up to date before merging**.
   - In the **Search for status checks in the last week for this repository** box, type and
     select each of: `lint`, `test-api`, `test-client`. Make sure all three are listed under
     the box. If one shows two sources, pick the one from **GitHub Actions**.
7. Leave **Allow force pushes** unticked.
8. Leave **Allow deletions** unticked.
9. Optional but recommended: tick **Do not allow bypassing the above settings** so admins are held
   to the same gates.
10. Click **Create** at the bottom of the page.

### Alternative in the same page: a ruleset

If you prefer rulesets (**Settings -> Rules -> Rulesets -> New ruleset -> New branch ruleset**):
name it `protect-main`, set **Enforcement status** to **Active**, under **Target branches** click
**Add target -> Include default branch** (or **Include by pattern** `main`), then tick
**Restrict deletions**, **Require a pull request before merging** (required approvals `1`),
**Require status checks to pass** (tick **Require branches to be up to date before merging**,
then **Add checks** `lint`, `test-api`, `test-client`), and **Block force pushes**. Click **Create**.
Use either the classic rule or the ruleset, not both.

## Option B: `gh api` (classic branch protection)

> **DO NOT RUN WITHOUT ADMIN APPROVAL.** This changes repository settings for everyone. It must be
> run by (or with the explicit OK of) a repo admin, and it replaces any existing protection on `main`.

```bash
gh api --method PUT \
  -H "Accept: application/vnd.github+json" \
  repos/shaneshaguruge/leaveflow/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test-api", "test-client"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

`"strict": true` is "Require branches to be up to date before merging". Set `"enforce_admins"` to
`false` if admins must be able to bypass the rule.

Check the result (read-only, safe to run):

```bash
gh api repos/shaneshaguruge/leaveflow/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts, strict: .required_status_checks.strict,
         approvals: .required_pull_request_reviews.required_approving_review_count,
         force_pushes: .allow_force_pushes.enabled, deletions: .allow_deletions.enabled}'
```

Expected: `checks` = `["lint","test-api","test-client"]`, `strict` = `true`, `approvals` = `1`,
`force_pushes` = `false`, `deletions` = `false`.

## Prove it works (Phase 8 fire drill)

Open a PR that deliberately breaks a server test: `test-api` goes red and the merge button reads
"Required statuses must pass" even after an approval. Push the fix, the checks rerun and go green,
and the merge unlocks. After merging, the **Release** workflow pushes
`ghcr.io/shaneshaguruge/leaveflow-api:<merge SHA>` and `:main`.
