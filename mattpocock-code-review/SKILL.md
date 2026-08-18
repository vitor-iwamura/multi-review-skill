---
name: mattpocock-code-review
description: "Port of Matt Pocock's two-axis code review: independently review a diff against repository standards and Fowler smell heuristics, and against its originating issue, PRD, or spec. Use when the user invokes $mattpocock-code-review, asks to review since a fixed point, or wants standards and spec compliance reported separately."
---

# Matt Pocock Code Review

Review `git diff <fixed-point>...HEAD` along two deliberately separate axes: Standards and Spec.

## Prepare

1. Use the fixed point supplied by the user. If absent, infer the PR base or repository default branch when unambiguous; otherwise ask.
2. Verify it resolves, capture `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline`, and stop for an invalid ref or empty diff.
3. Find the spec in order: issue references in commits; a user-supplied path; matching files under `docs/`, `specs/`, or `.scratch/`; then user clarification. If no spec exists, skip that axis and say so.
4. Find repository standards such as `AGENTS.md`, `CONTRIBUTING.md`, and `CODING_STANDARDS.md`.

Read [references/smell-baseline.md](references/smell-baseline.md). Repository rules override the baseline, and baseline smells are always judgement calls rather than hard violations. Skip anything automated tooling enforces.

## Review

Run two independent agents in parallel when available:

- Standards: cite every documented-rule breach and identify any baseline smell by name with the relevant hunk. Separate hard rules from judgement calls.
- Spec: cite missing or partial requirements, unrequested scope, and requirements that appear implemented incorrectly. Quote or cite the relevant requirement.

Present the results under `## Standards` and `## Spec` without merging or reranking across axes. End with counts and the worst issue within each axis. Stay read-only and do not post unless explicitly asked.

For orchestrated structured review, follow [references/orchestrator-prompt.md](references/orchestrator-prompt.md).
