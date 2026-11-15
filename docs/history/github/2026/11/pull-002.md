---
kind: "pull"
number: 2
title: "build(deps): Bump actions/setup-node from 6.3.0 to 7.1.0"
state: "merged"
draft: false
labels: ["dependencies","github_actions"]
author: "dependabot[bot]"
created_at: "2026-11-13T20:51:18Z"
updated_at: "2026-11-13T23:10:08Z"
closed_at: "2026-11-13T23:10:05Z"
merged_at: "2026-11-13T23:10:05Z"
merge_commit: "bddf1425f6111c7bcf81cbfc8703b922b3bf1180"
head: "dependabot/github_actions/actions/setup-node-7.1.0"
base: "main"
url: "https://github.com/tmathura/claude-runway/pull/2"
headings: []
version_set: null
release_runs: []
---

# PR #2: build(deps): Bump actions/setup-node from 6.3.0 to 7.1.0

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `dependabot[bot]`, 2026-11-13T20:51:18Z, https://github.com/tmathura/claude-runway/pull/2

Bumps [actions/setup-node](https://github.com/actions/setup-node) from 6.3.0 to 7.1.0.
<details>
<summary>Release notes</summary>
<p><em>Sourced from <a href="https://github.com/actions/setup-node/releases">actions/setup-node's releases</a>.</em></p>
<blockquote>
<h2>v7.1.0</h2>
<h2>What's Changed</h2>
<h3>Enhancements:</h3>
<ul>
<li>Add support for mise.toml file by <a href="https://github.com/gperdomor"><code>@​gperdomor</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1421">actions/setup-node#1421</a></li>
<li>Support absolute paths in node-version-file by <a href="https://github.com/v-mahabaleshwars"><code>@​v-mahabaleshwars</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1633">actions/setup-node#1633</a></li>
</ul>
<h3>Bug fixes:</h3>
<ul>
<li>Add Node version validation and manifest fetch retry by <a href="https://github.com/v-jitenderpalsingh"><code>@​v-jitenderpalsingh</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1580">actions/setup-node#1580</a></li>
</ul>
<h3>Documentation updates:</h3>
<ul>
<li>README.md: bump actions/checkout to latest version 7 by <a href="https://github.com/deining"><code>@​deining</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1578">actions/setup-node#1578</a></li>
<li>docs: add V7 ESM migration and NODE_AUTH_TOKEN behavior change by <a href="https://github.com/v-gowridurgad"><code>@​v-gowridurgad</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1593">actions/setup-node#1593</a></li>
<li>Fixed cache recommendation syntax by <a href="https://github.com/SubJunk"><code>@​SubJunk</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1603">actions/setup-node#1603</a></li>
</ul>
<h3>Dependency updates:</h3>
<ul>
<li>Update workflow pins and migrate Node matrices to modern versions by <a href="https://github.com/v-HarithaVattikuti"><code>@​v-HarithaVattikuti</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1583">actions/setup-node#1583</a></li>
<li>Upgrade  <code>@​actions/cache</code> to 6.2.0 by <a href="https://github.com/philip-gai"><code>@​philip-gai</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1584">actions/setup-node#1584</a></li>
<li>Pin <code>@​types/node</code> to v24 by <a href="https://github.com/v-priyagupta108"><code>@​v-priyagupta108</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1585">actions/setup-node#1585</a></li>
<li>Override brace-expansion to 5.0.8 by <a href="https://github.com/v-priyagupta108"><code>@​v-priyagupta108</code></a> with <a href="https://github.com/Copilot"><code>@​Copilot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1599">actions/setup-node#1599</a></li>
<li>Upgrade  actions/checkout from 7.0.0 to 7.0.1 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1598">actions/setup-node#1598</a></li>
<li>Upgrade  prettier from 3.8.4 to 3.9.6 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1590">actions/setup-node#1590</a></li>
<li>Upgrade  <code>@​vercel/ncc</code> from 0.44.0 to 0.45.0 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1610">actions/setup-node#1610</a></li>
<li>Upgrade  pnpm/action-setup from 6.0.9 to 6.0.10 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1602">actions/setup-node#1602</a></li>
<li>Upgrade  baseline-browser-mapping from 2.10.38 to 2.11.22 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1629">actions/setup-node#1629</a></li>
<li>Upgrade <code>@​types/semver</code> from 7.7.1 to 7.8.0 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1616">actions/setup-node#1616</a></li>
<li>Upgrade <code>@​typescript-eslint/parser</code> from 8.62.0 to 8.70.0 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1615">actions/setup-node#1615</a></li>
<li>Upgrade pnpm/action-setup from 6.0.10 to 6.1.0 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1631">actions/setup-node#1631</a></li>
<li>Upgrade jest-each from 30.4.1 to 30.5.2 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1636">actions/setup-node#1636</a></li>
<li>Upgrade eslint-plugin-n from 18.1.0 to 18.3.0 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1638">actions/setup-node#1638</a></li>
<li>Update dependencies and add license files by <a href="https://github.com/v-HarithaVattikuti"><code>@​v-HarithaVattikuti</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1642">actions/setup-node#1642</a></li>
<li>Upgrade eslint from 10.5.0 to 10.11.0 and package.json from 7.0.0 to 7.1.0 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1635">actions/setup-node#1635</a></li>
</ul>
<h2>New Contributors</h2>
<ul>
<li><a href="https://github.com/v-jitenderpalsingh"><code>@​v-jitenderpalsingh</code></a> made their first contribution in <a href="https://redirect.github.com/actions/setup-node/pull/1580">actions/setup-node#1580</a></li>
<li><a href="https://github.com/philip-gai"><code>@​philip-gai</code></a> made their first contribution in <a href="https://redirect.github.com/actions/setup-node/pull/1584">actions/setup-node#1584</a></li>
<li><a href="https://github.com/gperdomor"><code>@​gperdomor</code></a> made their first contribution in <a href="https://redirect.github.com/actions/setup-node/pull/1421">actions/setup-node#1421</a></li>
<li><a href="https://github.com/SubJunk"><code>@​SubJunk</code></a> made their first contribution in <a href="https://redirect.github.com/actions/setup-node/pull/1603">actions/setup-node#1603</a></li>
</ul>
<p><strong>Full Changelog</strong>: <a href="https://github.com/actions/setup-node/compare/v7.0.0...v7.1.0">https://github.com/actions/setup-node/compare/v7.0.0...v7.1.0</a></p>
<h2>v7.0.0</h2>
<h2>What's Changed</h2>
<h3>Enhancements:</h3>
<ul>
<li>Add cache-primary-key and cache-matched-key as outputs by <a href="https://github.com/gowridurgad"><code>@​gowridurgad</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1577">actions/setup-node#1577</a></li>
<li>Migrate to ESM and upgrade dependencies by <a href="https://github.com/gowridurgad"><code>@​gowridurgad</code></a> in <a href="https://redirect.github.com/actions/setup-node/pull/1574">actions/setup-node#1574</a></li>
</ul>
<!-- raw HTML omitted -->
</blockquote>
<p>... (truncated)</p>
</details>
<details>
<summary>Commits</summary>
<ul>
<li><a href="https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1"><code>949feb2</code></a> Bump eslint from 10.5.0 to 10.11.0 and package.json from 7.0.0 to 7.1.0 (<a href="https://redirect.github.com/actions/setup-node/issues/1635">#1635</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/7207c4f1189c7ee83ddf20c7c68bd1af6fdd751c"><code>7207c4f</code></a> chore: update dependencies and add license files (<a href="https://redirect.github.com/actions/setup-node/issues/1642">#1642</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/54337e0d02de9202d0948aaff36ad556375497b9"><code>54337e0</code></a> Bump eslint-plugin-n from 18.1.0 to 18.3.0 (<a href="https://redirect.github.com/actions/setup-node/issues/1638">#1638</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/fb54fa8c14c63410cc752f0ae3b7b3ca6af161fc"><code>fb54fa8</code></a> Bump jest-each from 30.4.1 to 30.5.2 (<a href="https://redirect.github.com/actions/setup-node/issues/1636">#1636</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/7f84f1d52d0c56afb45c62fee31a93b843cea4d6"><code>7f84f1d</code></a> Bump pnpm/action-setup from 6.0.10 to 6.1.0 (<a href="https://redirect.github.com/actions/setup-node/issues/1631">#1631</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/0c54c7b07420dcba69a7d832587f55ebdf771c9e"><code>0c54c7b</code></a> Bump <code>@​typescript-eslint/parser</code> from 8.62.0 to 8.70.0 (<a href="https://redirect.github.com/actions/setup-node/issues/1615">#1615</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/a8294190049a9c296f01b9a432aff41dd83d8284"><code>a829419</code></a> Bump <code>@​types/semver</code> from 7.7.1 to 7.8.0 (<a href="https://redirect.github.com/actions/setup-node/issues/1616">#1616</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/680d1e489b82f1243de15bc7665c0007e3c9a860"><code>680d1e4</code></a> Support absolute paths in node-version-file (<a href="https://redirect.github.com/actions/setup-node/issues/1633">#1633</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/db0fb3a98ed314b69026b6e8c9be26a7e2fe65a8"><code>db0fb3a</code></a> Bump baseline-browser-mapping from 2.10.38 to 2.11.22 (<a href="https://redirect.github.com/actions/setup-node/issues/1629">#1629</a>)</li>
<li><a href="https://github.com/actions/setup-node/commit/94196ee1d15439c1b6651cd87ef14e88ec435966"><code>94196ee</code></a> Bump pnpm/action-setup from 6.0.9 to 6.0.10 (<a href="https://redirect.github.com/actions/setup-node/issues/1602">#1602</a>)</li>
<li>Additional commits viewable in <a href="https://github.com/actions/setup-node/compare/53b83947a5a98c8d113130e565377fae1a50d02f...949feb2413d6458794dcd2491c4babbbce0c15c1">compare view</a></li>
</ul>
</details>
<br />

***

**Comment** by `coderabbitai[bot]`, 2026-11-13T22:59:01Z, https://github.com/tmathura/claude-runway/pull/2#issuecomment-6867041350

<!-- coderabbit-ai-generated:v1 -->

<!-- This is an auto-generated comment: summarize by coderabbit.ai -->
<!-- This is an auto-generated comment: skip review by coderabbit.ai -->

> [!IMPORTANT]
> ## Review skipped
> 
> Bot user detected.
> 
> To trigger a single review, invoke the `@coderabbitai review` command.
> 
> <details>
> <summary><strong><picture><source media="(prefers-color-scheme: dark)" srcset="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/cog-dark.svg"><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/cog.svg" width="16" height="16" align="absmiddle" alt=""></picture> Run configuration</strong></summary>
> <dl>
> <dd>
> <br>
> 
> - **Source mode**: Auto
> - **Repository**: Unavailable
> - **Branch**: Unavailable
> - **File**: No configuration file from this repository applied
> - **Commit**: Unavailable
> - **Layers**: Organization UI
> - **Review profile**: CHILL
> - **Plan**: Advanced
> - **Run ID**: `e03d0e9e-57fc-4d98-ad2b-6e3c6e1a36c1`
> 
> </dd>
> </dl>
> </details>
> 
> You can disable this status message by setting the `reviews.review_status` to `false` in the CodeRabbit configuration file.
> 
> Use the checkbox below for a quick retry:
> - [ ] <!-- {"checkboxId":"e9bb8d72-00e8-4f67-9cb2-caf3b22574fe"} --> Trigger review

<!-- end of auto-generated comment: skip review by coderabbit.ai -->

<!-- tips_start -->



Thanks for using [CodeRabbit](https://coderabbit.ai?utm_source=oss&utm_medium=github&utm_campaign=tmathura/claude-runway&utm_content=2)! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.

<details>
<summary><strong>Share</strong></summary>
<dl>
<dd>
<br>

- [X](https://twitter.com/intent/tweet?text=I%20just%20used%20%40coderabbitai%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20the%20proprietary%20code.%20Check%20it%20out%3A&url=https%3A//coderabbit.ai)
- [Mastodon](https://mastodon.social/share?text=I%20just%20used%20%40coderabbitai%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20the%20proprietary%20code.%20Check%20it%20out%3A%20https%3A%2F%2Fcoderabbit.ai)
- [Reddit](https://www.reddit.com/submit?title=Great%20tool%20for%20code%20review%20-%20CodeRabbit&text=I%20just%20used%20CodeRabbit%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20proprietary%20code.%20Check%20it%20out%3A%20https%3A//coderabbit.ai)
- [LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fcoderabbit.ai&mini=true&title=Great%20tool%20for%20code%20review%20-%20CodeRabbit&summary=I%20just%20used%20CodeRabbit%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20proprietary%20code)

</dd>
</dl>
</details>

<!-- tips_end -->
