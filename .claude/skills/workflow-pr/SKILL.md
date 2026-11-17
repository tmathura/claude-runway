---
name: workflow-pr
description: Push a claude-runway ticket branch and open its PR against main with the Problem / Change / Testing body, or, if the PR is already open, push and rewrite its body to the current state.
argument-hint: "[draft]"
---

# workflow: pr

First read the repo's `.claude/skills/workflow-common/REFERENCE.md`. Read it again after each summary of the conversation. Follow its "Commit and push rules".

## Checks

Stop and report if one of these fails:

1. `git remote get-url origin` is the remote in REFERENCE.md.
2. `git branch --show-current` is not `main` and matches `<type>/<n>-<slug>`, or is an export
   branch `export/<n>-history` (REFERENCE.md "History export"). Take `<n>` from it.
3. `gh auth status` shows a login, and `gh api repos/tmathura/claude-runway --jq .permissions.push`
   prints `true`.
4. `git status --porcelain` is empty. If not, run `workflow-commit` first.
5. After `git fetch origin`, `git log origin/main..HEAD` shows at least one commit.

## Push

Run `git push -u origin HEAD`. If the push is rejected, stop and report. Do not rebase or force.

## Body

1. Read `git log origin/main..HEAD` (subjects and bodies), `git diff origin/main...HEAD --stat`, the
   diff, and the issue (`gh issue view <n>`). If the PR is open already, also read its present
   body (`gh pr view --json body --jq .body`).
2. Write the body to `<scratchpad>/pr-body-<n>.md` in the "PR body" shape from REFERENCE.md. On an
   export branch, use the shape of "The export PR body" in "History export" instead.
3. **Review rounds** must hold each rejected finding of both loops with its reason, from the
   three sources that "PR body" names: `node .claude/skills/workflow-common/collect-rejected.mjs <n>`,
   the bodies of the PR review loop commits, and the present PR body. Compare the new body with
   those three before you go on. A rejected finding that is in a source and not in the new body
   is a mistake: the squash commit on `main` is this body, and the branch commits are gone after
   the merge.
4. **Check the body for sensitive text**, as "PR body" and "Sensitive text" in REFERENCE.md say:
   `npm run history -- scan "<scratchpad>/pr-body-<n>.md"` (with `--terms` when the list exists),
   and a read. On a find, stop: do not create or edit the PR. Replace the value with
   `[removed: <kind>]`, check again, and tell the owner the kind and the place, never the value.

## Create or update

Look for a PR: `gh pr view --json number,state,url,isDraft`.

**No PR yet:**

```bash
gh pr create --base main --head "<branch>" \
  --title '[#<n>] <Imperative description of the whole change>' \
  --body-file "<scratchpad>/pr-body-<n>.md"
```

Add `--draft` only when `$ARGUMENTS` says `draft` or the user asked for it. Bot reviewers do not review
drafts, so tell the user the review loop starts when the PR is marked ready.

**PR already open:** `gh pr edit <number> --body-file "<scratchpad>/pr-body-<n>.md"`. Change the title
only if the scope changed.

On an export branch the title is `[#<n>] Export the history of #<n>`, exactly: the history export
knows an export PR by its branch, this title and its files.

## Output

End the reply with two lines, the PR URL and then the PR number:

```
https://github.com/tmathura/claude-runway/pull/<number>
<number>
```
