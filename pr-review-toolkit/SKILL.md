---
name: pr-review-toolkit
description: "Port of Claude's PR Review Toolkit for specialized review of comments, tests, silent failures, type design, general code quality, and simplification. Use when the user invokes $pr-review-toolkit or requests one or more of those named review aspects."
---

# PR Review Toolkit

Run one or more specialist review aspects against the requested PR or diff.

## Select aspects

Parse the user's requested aspects: `comments`, `tests`, `errors`, `types`, `code`, `simplify`, or `all`. Default to all applicable aspects.

- Always apply `code`.
- Apply `tests` when behavior or tests changed.
- Apply `comments` when comments, docstrings, or documentation contracts changed.
- Apply `errors` when error handling, fallbacks, defaults, optional access, retries, or callbacks changed.
- Apply `types` when types or state models were added or modified.
- Apply `simplify` after correctness review. In a review request, report simplifications without editing. Only implement them when the user explicitly requests changes.

Read [references/aspects.md](references/aspects.md) for the full specialist briefs. Run applicable specialists independently; use parallel agents when `parallel` is requested or when all aspects are selected. Give every specialist the target and changed files, and keep their contexts separate.

Aggregate results into Critical, Important, Suggestions, and Strengths. Deduplicate overlap but preserve the specialist source. Every actionable finding needs `path:line`, a concrete failure or maintenance cost, and a specific remedy. Remain read-only unless the user explicitly asks to apply simplifications. Never post from inside `$multi-review`.

For orchestrated structured review, follow [references/orchestrator-prompt.md](references/orchestrator-prompt.md).
