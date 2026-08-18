---
name: multi-review
description: Run the five ported Claude review workflows in parallel over a GitHub pull request or working-tree diff, apply the ported Caveman formatter, deduplicate findings, and optionally post one consolidated inline GitHub review. Use when the user asks for a multi-review, parallel review, deep PR review, consolidated review, or invokes $multi-review.
---

# Multi Review

Run the bundled orchestrator from the repository being reviewed:

```bash
node "$HOME/.agents/skills/multi-review/scripts/run-review.ts" [PR-number|PR-url] [options]
```

Pass the user's arguments through unchanged. Do not add `--no-post` or `--dry-run` unless requested.

The command accepts:

- A bare PR number or full GitHub pull-request URL.
- `--model <model>` to override the configured Codex model for every pass.
- `--effort <low|medium|high|xhigh|max>` to override reasoning effort.
- `--sequential` to run review workflows one at a time.
- `--summary` to post one summary comment instead of inline comments.
- `--no-post` to print and save the report without posting.
- `--dry-run` to show the planned Codex passes and posting mode without running them.

With no PR argument, review the current working tree against its default base branch and keep the result local.

The script runs the five original review workflows through their native Codex ports—`$code-review`, `$pr-review-toolkit`, `$mattpocock-code-review`, `$requesting-code-review`, and `$review`—then applies `$caveman-review` during a final deduplication, severity-ranking, source-tagging, and line-anchoring pass. It saves a Markdown report under the system temporary directory before any GitHub write.

All six ported skills must be installed beside this skill under `~/.agents/skills`.

After the command finishes, reproduce its report exactly. Also mention any posting confirmation or failure printed by the script. Do not independently post another review.

Prerequisites: authenticated `codex` CLI, Node.js 24 or newer, and a Git repository. Pull-request mode also requires an authenticated `gh` CLI and a GitHub remote.
