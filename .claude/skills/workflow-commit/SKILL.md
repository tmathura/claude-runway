---
name: workflow-commit
description: Commit staged changes on a claude-runway ticket branch with the "[#n] Imperative description" subject and the session's Co-Authored-By trailer, if it gives one. Never commits on main.
argument-hint: "[imperative description] [-- commit body]"
---

# workflow: commit

First read the repo's `.claude/skills/workflow-common/REFERENCE.md`. Read it again after each summary of the conversation. Follow its "Commit and push rules".

## Input

`$ARGUMENTS`: an optional one-line description. It can be followed by `--` and a commit body. A review
round, for example, passes its findings and their outcomes as the body.

`--allow-empty` as the first word, before the description, marks a review round commit with no
change (REFERENCE.md "Code review round"). Then `git status --porcelain` must print nothing: if
any file is staged, changed or new, stop and report it. Skip step 3, and commit with
`--allow-empty` in step 6.

## Steps

1. **Check the branch.** If `git branch --show-current` is `main` or empty, stop. Take `<n>` from the
   branch name `<type>/<n>-<slug>`, or from an export branch `export/<n>-history` (REFERENCE.md
   "History export"). If the name does not match, stop and report.
2. **Look at the changes** with `git status` and `git diff --staged`.
3. **If nothing is staged:**
   - When `workflow-manual` passed a file list, stage those files by name
     (`git add -- <files>`). Leave any other changed or untracked files alone, and ask whether they
     belong to this ticket.
   - Otherwise ask: **Stage tracked changes with `git add -u` (Recommended)** / **Pick files** /
     **Stop**.
   - If there is nothing to commit at all, say so and stop.

   **If files are staged already** and `workflow-manual` passed a file list, stage the listed files
   too. If a staged file is not in the list, stop and ask whether it belongs to this ticket.

   **Check what is staged for sensitive text.** No secret and no private detail may reach a
   commit in any file, so do the two sensitive-text checks now, after the staging, on each
   staged text file (REFERENCE.md "Sensitive text" in "History export"). The checks read the
   files on disk, and the commit takes the staged content, so the two must be the same for
   each file of this commit. List the staged files with
   `git -c core.quotePath=false diff --staged --name-only --diff-filter=d` (a file that the
   commit deletes has no text to check; the option keeps a name with special letters as it
   is); these are the files to check. Then `git -c core.quotePath=false diff --name-only`
   names each file with a change that is not staged. A file that both commands name is staged in part, maybe on
   purpose. For such a file ask: **Stage the whole file (Recommended)** / **Stop**. After the
   file is staged as a whole (`git add -- <file>`), list again. Leave other changed files
   alone, as above.

   Go on only when the pattern check ends with exit 0. Exit 1 is a find, and exit 2 means
   that the check did not run to its end (a file or the word list could not be read): both
   stop the commit. For a find in test data that is no real value, build the text from parts
   in the test, as `tests/history.test.mjs` does, then check again.
4. **Write the message.**
   - Subject: `[#<n>] <Imperative description>` (see "Naming" in REFERENCE.md). If no description was
     passed, write one from the staged diff.
   - Body: the text after `--`, wrapped at 72 characters. It is optional.
   - Trailer: from "Naming" in REFERENCE.md.
5. **Ask only if you wrote the description yourself.** Show the message and ask: **Commit
   (Recommended)** / **Edit the subject** / **Stop**. A description that was passed in needs no
   question.
6. **Commit.** Write the message to `<scratchpad>/commit-msg.txt` with the file tool, not with a
   shell heredoc (a body line that is exactly the heredoc's end word would cut the message):

   ```text
   [#<n>] <Imperative description>

   <optional body>

   <trailer from "Naming" in REFERENCE.md, if there is one>
   ```

   Then run `git commit -F "<scratchpad>/commit-msg.txt"`, or with `--allow-empty`, run
   `git commit --allow-empty -F "<scratchpad>/commit-msg.txt"`.

7. **Check** with `git status` and `git log -1 --oneline`. Report the hash and the subject.

Do not push. `workflow-pr` pushes.
