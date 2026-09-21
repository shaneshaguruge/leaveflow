# Phase 4 — Check your understanding

**1. Is a commit a diff or a snapshot?**
A snapshot of the whole project at that moment, plus a pointer to the commit before it. Git works out the diff only when I ask for one, by comparing two snapshots.

**2. What does `git add` actually move, and where?**
It copies my changes from the working folder into the staging area, which is the draft of my next commit. Nothing is saved in history until I run `git commit`.

**3. What is a branch, physically?**
Just a movable label that points at one commit. When I commit on a branch the label moves forward; deleting a branch deletes only the label, not the commits.

**4. What does a Pull Request add that plain `git merge` doesn't have?**
A place for discussion, a review and approval step, and automatic checks before the code reaches `main`. A plain merge just joins the code with nobody looking at it.

**5. Why is force-pushing to `main` dangerous?**
It rewrites history that other people already have, so their copies no longer match GitHub. Commits they pulled or pushed can be lost.

**6. Git stops mid-merge with conflict markers. Has something gone wrong?**
No. Two branches changed the same lines, and Git refuses to guess which one is right. I decide, remove every `<<<<<<<` / `=======` / `>>>>>>>` line, then commit the result.

**7. What does "Closes #12" in a PR description do?**
It links the PR to issue 12 and closes the issue automatically when the PR is merged. That way anyone can trace a piece of code back to the requirement that asked for it.
