---
kind: "release"
tag: "v0.1.2"
name: "v0.1.2"
draft: false
prerelease: false
author: "tmathura"
created_at: "2026-11-14T09:54:32Z"
published_at: "2026-11-14T12:05:46Z"
target: "bec4a35db62253dd2962d0ecdb61823d0ac1907e"
tag_commit: "bec4a35db62253dd2962d0ecdb61823d0ac1907e"
url: "https://github.com/tmathura/claude-runway/releases/tag/v0.1.2"
---

# Release v0.1.2

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Notes** by `tmathura`, 2026-11-14T12:05:46Z, https://github.com/tmathura/claude-runway/releases/tag/v0.1.2

- Saves only the limits whose reset time is a date. Before, the mod also saved a limit with no
  reset time, which no session could show from the saved reading.
- The band of a session shows its own limits as before. A reading that is already saved stays
  until a reading with such a limit replaces it, until the account has no limits any more, or
  until its own reset times pass.


## What's Changed
* [#8] Move the spec folders to .specify/specs by @tmathura in https://github.com/tmathura/claude-runway/pull/11
* [#10] Save only the limits that have a reset time by @tmathura in https://github.com/tmathura/claude-runway/pull/12


**Full Changelog**: https://github.com/tmathura/claude-runway/compare/v0.1.1...v0.1.2
