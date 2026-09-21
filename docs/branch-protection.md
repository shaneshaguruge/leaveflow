# Branch protection for `main`

Goal: nothing reaches `main` unless it came through a pull request and passed all three CI checks.
Force pushes and branch deletion are blocked.

**Applied rule (2026-09-21, read back with the command at the end of Option B):** checks `lint`, `test-api`,
`test-client`; pull request required; **0 approvals**; **admins not enforced** (`enforce_admins: false`);
**`strict: false`** (the branch does not have to be up to date with `main`); no force pushes, no deletions.

Why 0 approvals: this is a solo repo. GitHub does not let a PR author approve their own PR, so a required
approval would lock the only developer out of `main`. The guide asks for "one review"; that decision is left
to the project owner — raise the count to `1` once a second person with write access reviews PRs.

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
   - Leave **Require approvals** unticked (applied rule: 0 approvals; see the note at the top).
6. Tick **Require status checks to pass before merging**.
   - Leave **Require branches to be up to date before merging** unticked (applied rule: `strict: false`).
   - In the **Search for status checks in the last week for this repository** box, type and
     select each of: `lint`, `test-api`, `test-client`. Make sure all three are listed under
     the box. If one shows two sources, pick the one from **GitHub Actions**.
7. Leave **Allow force pushes** unticked.
8. Leave **Allow deletions** unticked.
9. Leave **Do not allow bypassing the above settings** unticked (applied rule: admins not enforced).
   Admins still go through PRs by habit; the fire drill (PR #27) was merged without `--admin`.
10. Click **Create** at the bottom of the page.

### Alternative in the same page: a ruleset

If you prefer rulesets (**Settings -> Rules -> Rulesets -> New ruleset -> New branch ruleset**):
name it `protect-main`, set **Enforcement status** to **Active**, under **Target branches** click
**Add target -> Include default branch** (or **Include by pattern** `main`), then tick
**Restrict deletions**, **Require a pull request before merging** (required approvals `0`),
**Require status checks to pass** (leave **Require branches to be up to date before merging** unticked,
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
    "strict": false,
    "contexts": ["lint", "test-api", "test-client"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

This is the payload that was applied on 2026-09-21. `"strict": true` would mean "Require branches to be up to
date before merging"; `"enforce_admins": true` would hold admins to the rule too; raise
`"required_approving_review_count"` to `1` when a reviewer joins.

Check the result (read-only, safe to run):

```bash
gh api repos/shaneshaguruge/leaveflow/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts, strict: .required_status_checks.strict,
         approvals: .required_pull_request_reviews.required_approving_review_count,
         enforce_admins: .enforce_admins.enabled,
         force_pushes: .allow_force_pushes.enabled, deletions: .allow_deletions.enabled}'
```

Expected (and read back on 2026-09-21): `checks` = `["lint","test-api","test-client"]`, `strict` = `false`,
`approvals` = `0`, `enforce_admins` = `false`, `force_pushes` = `false`, `deletions` = `false`.

## Prove it works (Phase 8 fire drill)

Open a PR that deliberately breaks a server test: `test-api` goes red and the merge is blocked
("Required statuses must pass"; `gh pr merge` says "the base branch policy prohibits the merge").
Done for real in PR #27 on 2026-09-21. Push the fix, the checks rerun and go green,
and the merge unlocks. After merging, the **Release** workflow pushes
`ghcr.io/shaneshaguruge/leaveflow-api:<merge SHA>` and `:main`.
