# Bug Verification: A saved limits reading past its reset time is never deleted

- **Slug**: 007-delete-expired-limits-reading
- **Tested**: 2026-11-14
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The symptom no longer shows: a session that starts with a saved reading whose limits are all past
their reset time deletes it from the store. A reading with a limit still in its window stays. No
other test changed its result.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `claude plugin test plugins/runway`, the test `a saved reading whose reset time has passed is not shown, and is deleted` | pass | The steps of the assessment, run in the test kit: the record is gone after the start |
| New / updated tests | `claude plugin test plugins/runway` | pass | 23 passed, 0 failed |
| Regression suite | `npm test` | pass | 242 passed, 0 failed, 10 skipped |
| Lint / type-check | `npm run build` | pass | `tsc` reports no error |
| Version files | `npm run check-version` | pass | All match 0.1.1 |
| Mod validation | `claude plugin validate plugins/runway` | pass | Validation passed |
| The band in a real session | not run | not-run | Claude cannot see the band. The release run after the merge covers it |

## Output Excerpts

```text
 23 pass
 0 fail
Ran 23 tests across 1 file.
```

```text
All version metadata matches 0.1.1.
✔ Validation passed
```

## Residual Risks

- The store in the hooks tests is a `Map` in the test, not the store of Claude Code. A difference
  in how the real store answers a delete would not show here.

## Recommendation

Close the bug after the merge. The fix is verified by the automated checks; the release run reads
the band in a real session.
