---
name: review
description: "Fast single-pass Codex port of Claude's built-in /review command. Use only when the user explicitly invokes $review or asks for the fast general review seat used by $multi-review."
---

# Review

Perform one fast, independent, read-only review of the requested PR or current diff.

Focus on actionable defects introduced by the change: wrong behavior, regressions, data loss, security problems, races, broken error handling, incompatible API changes, and meaningful performance problems. Inspect enough surrounding code to verify each issue, but do not perform the historical multi-pass workflow owned by `$code-review` or the specialist sweeps owned by `$pr-review-toolkit`.

Suppress pre-existing problems, unchanged-line findings, style-only feedback, praise, summaries, and issues that automated tooling will reliably catch. For each finding provide severity, `path:line`, the concrete failure mode, and a specific remedy. If clean, state that no actionable findings were found. Do not edit or post unless explicitly asked.

For orchestrated structured review, follow [references/orchestrator-prompt.md](references/orchestrator-prompt.md).
