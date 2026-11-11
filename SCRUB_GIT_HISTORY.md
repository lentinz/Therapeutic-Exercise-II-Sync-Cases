# Purging plaintext case content from git history

The current `Pilot Case_Shoulder Pain.html` (and any other case file you've committed so far) is sitting in plaintext
in past commits, even after you start committing only encrypted output going forward. Anyone can still `git log` /
`git show` an old commit and read it. This is a one-time cleanup, separate from the ongoing build workflow above.

## Recommended tool: `git filter-repo`

Use [`git filter-repo`](https://github.com/newren/git-filter-repo) rather than the older `git filter-branch` — it's
the tool git.github.com itself now recommends, it's dramatically faster, and it doesn't leave the stale, confusing
`refs/original/` backup refs that `filter-branch` does.

```bash
# 1. Install it (pipx is the cleanest way; a plain pip/brew install also works)
pipx install git-filter-repo

# 2. Make a fresh clone to work on — don't do this in your normal working copy
git clone --mirror https://github.com/lentinz/Therapeutic-Exercise-II-Sync-Cases.git scrub-tmp
cd scrub-tmp

# 3. Strip every historical version of the plaintext case file(s) from ALL history.
#    Repeat --path for each case filename that was ever committed in plaintext.
git filter-repo --invert-paths --path "Pilot Case_Shoulder Pain.html"

# If the file's content changed over several plaintext commits before you started
# encrypting it, this still removes it from every one of those old commits — the
# whole path is purged from history, not just the latest version.

# 4. Push the rewritten history back, replacing what's on GitHub
git push --force --mirror origin
```

## Caveats — read before doing this

- **This rewrites every commit hash after the point the file first appears.** It is irreversible on GitHub's end
  once pushed (old commits become unreachable, though GitHub may cache them briefly and a determined person with a
  cached clone/fork could still have the old blobs — there's no way to fully guarantee deletion from something that
  was ever public).
- **Anyone else with a clone must re-clone, not pull.** A `git pull` after a forced history rewrite will create a
  confusing mess of duplicate/conflicting history. If anyone besides you has cloned the repo, tell them to delete
  their local copy and re-clone fresh after you push the rewritten history.
- **Do this once, deliberately, not as a reflex per-commit cleanup.** Run it after you've already switched the repo
  over to the encrypted-build workflow above, so no *new* plaintext commits land in history right after you scrub the
  old ones.
- If GitHub Pages is serving from a branch (not a separate `gh-pages` deploy step), double check the Pages build
  picks up the rewritten branch correctly after the force-push — it normally does, but it's worth a quick look.
- Consider whether the scrubbed case's old answer tiers need to be considered "burned" (i.e., assume some students
  may have already seen them) — scrubbing git history doesn't un-expose anything that already happened, it only
  stops *future* readers of the repo from finding it.

## Lower-effort alternative

If rewriting shared history feels too risky for now, the pragmatic middle ground is: leave old history alone, but
make sure **no new plaintext ever lands in a commit from today forward** (the `src/` + build-workflow setup above
already ensures that). The exposure window stops growing even if the old commits still technically contain the old
content. You can always come back and do the `filter-repo` pass later once you're comfortable with it.
