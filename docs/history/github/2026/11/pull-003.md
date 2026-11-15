---
kind: "pull"
number: 3
title: "build(deps): Bump actions/checkout from 6.0.2 to 7.0.1"
state: "merged"
draft: false
labels: ["dependencies","github_actions"]
author: "dependabot[bot]"
created_at: "2026-11-13T20:51:23Z"
updated_at: "2026-11-13T23:12:16Z"
closed_at: "2026-11-13T23:12:14Z"
merged_at: "2026-11-13T23:12:14Z"
merge_commit: "0154bb418dda4b4944a64e8bb95fb0002c4e1250"
head: "dependabot/github_actions/actions/checkout-7.0.1"
base: "main"
url: "https://github.com/tmathura/claude-runway/pull/3"
headings: []
version_set: null
release_runs: []
---

# PR #3: build(deps): Bump actions/checkout from 6.0.2 to 7.0.1

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `dependabot[bot]`, 2026-11-13T20:51:23Z, https://github.com/tmathura/claude-runway/pull/3

Bumps [actions/checkout](https://github.com/actions/checkout) from 6.0.2 to 7.0.1.
<details>
<summary>Release notes</summary>
<p><em>Sourced from <a href="https://github.com/actions/checkout/releases">actions/checkout's releases</a>.</em></p>
<blockquote>
<h2>v7.0.1</h2>
<h2>What's Changed</h2>
<ul>
<li>skip running unsafe pr check if input is default by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2518">actions/checkout#2518</a></li>
<li>trim only ascii whitespace for branch by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2521">actions/checkout#2521</a></li>
<li>escape values passed to --unset by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2530">actions/checkout#2530</a></li>
<li>Various dependency updates</li>
</ul>
<p><strong>Full Changelog</strong>: <a href="https://github.com/actions/checkout/compare/v7...v7.0.1">https://github.com/actions/checkout/compare/v7...v7.0.1</a></p>
<h2>v7.0.0</h2>
<h2>What's Changed</h2>
<ul>
<li>block checking out fork pr for pull_request_target and workflow_run by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2454">actions/checkout#2454</a></li>
<li>Bump actions/publish-immutable-action from 0.0.3 to 0.0.4 in the minor-actions-dependencies group across 1 directory by <a href="https://github.com/dependabot"><code>@​dependabot</code></a>[bot] in <a href="https://redirect.github.com/actions/checkout/pull/2458">actions/checkout#2458</a></li>
<li>Bump flatted from 3.3.1 to 3.4.2 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a>[bot] in <a href="https://redirect.github.com/actions/checkout/pull/2460">actions/checkout#2460</a></li>
<li>Bump js-yaml from 4.1.0 to 4.2.0 by <a href="https://github.com/dependabot"><code>@​dependabot</code></a>[bot] in <a href="https://redirect.github.com/actions/checkout/pull/2461">actions/checkout#2461</a></li>
<li>Bump <code>@​actions/core</code> and <code>@​actions/tool-cache</code> and Remove uuid by <a href="https://github.com/dependabot"><code>@​dependabot</code></a>[bot] in <a href="https://redirect.github.com/actions/checkout/pull/2459">actions/checkout#2459</a></li>
<li>upgrade module to esm and update dependencies by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2463">actions/checkout#2463</a></li>
<li>Bump the minor-npm-dependencies group across 1 directory with 3 updates by <a href="https://github.com/dependabot"><code>@​dependabot</code></a>[bot] in <a href="https://redirect.github.com/actions/checkout/pull/2462">actions/checkout#2462</a></li>
<li>getting ready for checkout v7 release by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2464">actions/checkout#2464</a></li>
<li>update error wording by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2467">actions/checkout#2467</a></li>
</ul>
<h2>New Contributors</h2>
<ul>
<li><a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> made their first contribution in <a href="https://redirect.github.com/actions/checkout/pull/2454">actions/checkout#2454</a></li>
</ul>
<p><strong>Full Changelog</strong>: <a href="https://github.com/actions/checkout/compare/v6.0.3...v7.0.0">https://github.com/actions/checkout/compare/v6.0.3...v7.0.0</a></p>
<h2>v6.1.0</h2>
<h2>What's Changed</h2>
<ul>
<li><strong>[BREAKING]</strong> backport <code>allow-unsafe-pr-checkout</code> to v6 by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2500">actions/checkout#2500</a></li>
<li>backport fixes to releases-v6 by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2527">actions/checkout#2527</a></li>
</ul>
<p><a href="https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/">https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/</a> for more details about this breaking change</p>
<p><strong>Full Changelog</strong>: <a href="https://github.com/actions/checkout/compare/v6.0.3...v6.1.0">https://github.com/actions/checkout/compare/v6.0.3...v6.1.0</a></p>
<h2>v6.0.3</h2>
<h2>What's Changed</h2>
<ul>
<li>Update changelog by <a href="https://github.com/ericsciple"><code>@​ericsciple</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2357">actions/checkout#2357</a></li>
<li>fix: expand merge commit SHA regex and add SHA-256 test cases by <a href="https://github.com/yaananth"><code>@​yaananth</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2414">actions/checkout#2414</a></li>
<li>Fix checkout init for SHA-256 repositories by <a href="https://github.com/yaananth"><code>@​yaananth</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2439">actions/checkout#2439</a></li>
<li>Update changelog for v6.0.3 by <a href="https://github.com/yaananth"><code>@​yaananth</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2446">actions/checkout#2446</a></li>
</ul>
<h2>New Contributors</h2>
<ul>
<li><a href="https://github.com/yaananth"><code>@​yaananth</code></a> made their first contribution in <a href="https://redirect.github.com/actions/checkout/pull/2414">actions/checkout#2414</a></li>
</ul>
<p><strong>Full Changelog</strong>: <a href="https://github.com/actions/checkout/compare/v6...v6.0.3">https://github.com/actions/checkout/compare/v6...v6.0.3</a></p>
</blockquote>
</details>
<details>
<summary>Changelog</summary>
<p><em>Sourced from <a href="https://github.com/actions/checkout/blob/main/CHANGELOG.md">actions/checkout's changelog</a>.</em></p>
<blockquote>
<h1>Changelog</h1>
<h2>v7.0.1</h2>
<ul>
<li>Skip running unsafe pr check if input is default by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2518">actions/checkout#2518</a></li>
<li>Trim only ascii whitespace for branch by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2521">actions/checkout#2521</a></li>
<li>Escape values passed to --unset by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2530">actions/checkout#2530</a></li>
<li>Various dependency updates</li>
</ul>
<h2>v7.0.0</h2>
<ul>
<li>Block checking out fork PR for pull_request_target and workflow_run by <a href="https://github.com/aiqiaoy"><code>@​aiqiaoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2454">actions/checkout#2454</a></li>
<li>Various dependency updates</li>
</ul>
<h2>v6.0.3</h2>
<ul>
<li>Fix checkout init for SHA-256 repositories by <a href="https://github.com/yaananth"><code>@​yaananth</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2439">actions/checkout#2439</a></li>
<li>fix: expand merge commit SHA regex and add SHA-256 test cases by <a href="https://github.com/yaananth"><code>@​yaananth</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2414">actions/checkout#2414</a></li>
</ul>
<h2>v6.0.2</h2>
<ul>
<li>Fix tag handling: preserve annotations and explicit fetch-tags by <a href="https://github.com/ericsciple"><code>@​ericsciple</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2356">actions/checkout#2356</a></li>
</ul>
<h2>v6.0.1</h2>
<ul>
<li>Add worktree support for persist-credentials includeIf by <a href="https://github.com/ericsciple"><code>@​ericsciple</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2327">actions/checkout#2327</a></li>
</ul>
<h2>v6.0.0</h2>
<ul>
<li>Persist creds to a separate file by <a href="https://github.com/ericsciple"><code>@​ericsciple</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2286">actions/checkout#2286</a></li>
<li>Update README to include Node.js 24 support details and requirements by <a href="https://github.com/salmanmkc"><code>@​salmanmkc</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2248">actions/checkout#2248</a></li>
</ul>
<h2>v5.0.1</h2>
<ul>
<li>Port v6 cleanup to v5 by <a href="https://github.com/ericsciple"><code>@​ericsciple</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2301">actions/checkout#2301</a></li>
</ul>
<h2>v5.0.0</h2>
<ul>
<li>Update actions checkout to use node 24 by <a href="https://github.com/salmanmkc"><code>@​salmanmkc</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2226">actions/checkout#2226</a></li>
</ul>
<h2>v4.3.1</h2>
<ul>
<li>Port v6 cleanup to v4 by <a href="https://github.com/ericsciple"><code>@​ericsciple</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2305">actions/checkout#2305</a></li>
</ul>
<h2>v4.3.0</h2>
<ul>
<li>docs: update README.md by <a href="https://github.com/motss"><code>@​motss</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/1971">actions/checkout#1971</a></li>
<li>Add internal repos for checking out multiple repositories by <a href="https://github.com/mouismail"><code>@​mouismail</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/1977">actions/checkout#1977</a></li>
<li>Documentation update - add recommended permissions to Readme by <a href="https://github.com/benwells"><code>@​benwells</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2043">actions/checkout#2043</a></li>
<li>Adjust positioning of user email note and permissions heading by <a href="https://github.com/joshmgross"><code>@​joshmgross</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2044">actions/checkout#2044</a></li>
<li>Update README.md by <a href="https://github.com/nebuk89"><code>@​nebuk89</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2194">actions/checkout#2194</a></li>
<li>Update CODEOWNERS for actions by <a href="https://github.com/TingluoHuang"><code>@​TingluoHuang</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2224">actions/checkout#2224</a></li>
<li>Update package dependencies by <a href="https://github.com/salmanmkc"><code>@​salmanmkc</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/2236">actions/checkout#2236</a></li>
</ul>
<h2>v4.2.2</h2>
<ul>
<li><code>url-helper.ts</code> now leverages well-known environment variables by <a href="https://github.com/jww3"><code>@​jww3</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/1941">actions/checkout#1941</a></li>
<li>Expand unit test coverage for <code>isGhes</code> by <a href="https://github.com/jww3"><code>@​jww3</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/1946">actions/checkout#1946</a></li>
</ul>
<h2>v4.2.1</h2>
<ul>
<li>Check out other refs/* by commit if provided, fall back to ref by <a href="https://github.com/orhantoy"><code>@​orhantoy</code></a> in <a href="https://redirect.github.com/actions/checkout/pull/1924">actions/checkout#1924</a></li>
</ul>
<!-- raw HTML omitted -->
</blockquote>
<p>... (truncated)</p>
</details>
<details>
<summary>Commits</summary>
<ul>
<li><a href="https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1"><code>3d3c42e</code></a> prep v7.0.1 release (<a href="https://redirect.github.com/actions/checkout/issues/2531">#2531</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/28802689a136bfcdb721715abd713740beecbe07"><code>2880268</code></a> escape values passed to --unset (<a href="https://redirect.github.com/actions/checkout/issues/2530">#2530</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/12cd2235efa0937479335606d7c3ac9f6c0973b1"><code>12cd223</code></a> trim only ascii whitespace for branch (<a href="https://redirect.github.com/actions/checkout/issues/2521">#2521</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/62661c4e71a304b2823ed026347b8d34c3eac541"><code>62661c4</code></a> skip running unsafe pr check if input is default (<a href="https://redirect.github.com/actions/checkout/issues/2518">#2518</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/e8d4307400f9427dba7cb98e488d6ab85f1cec5f"><code>e8d4307</code></a> Bump the minor-actions-dependencies group with 2 updates (<a href="https://redirect.github.com/actions/checkout/issues/2499">#2499</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/631c942040754b6e095e929c1677c07e10ed4f87"><code>631c942</code></a> eslint 9 (<a href="https://redirect.github.com/actions/checkout/issues/2474">#2474</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/4f1f4aec02e41874fa0262ea8ff5172d7978ad1e"><code>4f1f4ae</code></a> Bump actions/upload-artifact from 4 to 7 (<a href="https://redirect.github.com/actions/checkout/issues/2476">#2476</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/ba097532fb203f7e88c9c3c0b899b49469908a92"><code>ba09753</code></a> Bump actions/checkout from 6 to 7 (<a href="https://redirect.github.com/actions/checkout/issues/2488">#2488</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/b9e0990d219a03df7633c93f6f005a8fecbcab22"><code>b9e0990</code></a> Bump docker/login-action from 3.3.0 to 4.2.0 (<a href="https://redirect.github.com/actions/checkout/issues/2479">#2479</a>)</li>
<li><a href="https://github.com/actions/checkout/commit/e8cb398be4a550817e382abf69e4c12c76fce1f2"><code>e8cb398</code></a> Bump docker/build-push-action from 6.5.0 to 7.2.0 (<a href="https://redirect.github.com/actions/checkout/issues/2478">#2478</a>)</li>
<li>Additional commits viewable in <a href="https://github.com/actions/checkout/compare/de0fac2e4500dabe0009e67214ff5f5447ce83dd...3d3c42e5aac5ba805825da76410c181273ba90b1">compare view</a></li>
</ul>
</details>
<br />

***

**Comment** by `coderabbitai[bot]`, 2026-11-13T22:59:00Z, https://github.com/tmathura/claude-runway/pull/3#issuecomment-6867041289

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
> - **Run ID**: `ac43d6e5-1e24-4365-b6b6-9dddd9060c05`
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



Thanks for using [CodeRabbit](https://coderabbit.ai?utm_source=oss&utm_medium=github&utm_campaign=tmathura/claude-runway&utm_content=3)! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.

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

***

**Comment** by `tmathura`, 2026-11-13T23:10:21Z, https://github.com/tmathura/claude-runway/pull/3#issuecomment-6867235005

@dependabot rebase
