# Bug Verification: The mod saves a limit that has no reset time

- **Slug**: 010-skip-limit-without-reset
- **Tested**: 2026-11-14
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The steps of the assessment run as hooks tests. After an answer or a measure with a limit that has
no reset time, the store holds no such limit, and the band still shows it. No other test broke.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `claude plugin test plugins/runway`: the tests "an answer whose limits have no reset time shows them and saves no reading" and "a measure whose limits have no reset time saves no reading" | pass | Steps 1 to 3 of the assessment. The store has no `limits` record, and no delete call is made |
| New / updated tests | `claude plugin test plugins/runway` | pass | 33 passed, 0 failed. 7 new tests, 2 with new store checks. One test covers a reset time that is not a date (review round 1) |
| Regression suite | `npm test` | pass | 244 passed, 0 failed, 10 skipped (POSIX-only cases, on Windows) |
| Lint / type-check | `npm run build` | pass | `tsc`, no errors |
| Versions | `npm run check-version` | pass | All version files match 0.1.2 |
| Mod validation | `claude plugin validate plugins/runway` | pass | "Validation passed" |
| The new tests fail on the code before the fix | none | not-run | This command must not change source code. On `main`, `follow` saves every limit of the view, so the store checks of the new tests would fail there |
| The band in a real session | none | not-run | Only the owner can read the band. It is step 3 of the release run, after the merge |

## Output Excerpts

```
(pass) an answer saves its limits that have a reset time
(pass) an answer whose limits have no reset time shows them and saves no reading
(pass) an answer whose limit has a reset time that is not a date saves no reading
(pass) a measure whose limits have no reset time saves no reading
(pass) of an answer's limits, only those with a reset time are saved
(pass) an answer whose limits have no reset time keeps the reading that another session saved
(pass) a session that starts with limits with no reset time keeps the reading that another session saved
 33 pass
 0 fail
```

## Residual Risks

- It is not known whether Claude Code ever reports a limit with no reset time. The hooks tests
  give such a reading; a real session may never do so.
- The hooks tests answer the store from a `Map` in the test, not from Claude Code's store.
- A new session can show a saved reading that is older than the account's newest reading, while
  the newest one has only limits with no reset time. The saved limits' own reset times bound it.

## Recommendation

Close the bug after the merge. The fix is verified by the hooks tests; the band in a real session
is checked in the release run.
