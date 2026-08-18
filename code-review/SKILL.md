---
name: code-review
description: "Run the Claude official code-review workflow in Codex: check PR eligibility, review repository guidance, obvious bugs, git history, prior PR discussion, and code comments independently, then confidence-filter findings. Use when the user explicitly invokes $code-review or requests the high-confidence historical multi-pass review."
---

# Code Review

Perform a read-only, high-confidence review of a pull request or working-tree diff.

## Workflow

1. Resolve the target and changed files. For a PR, check whether it is closed, draft, automated, trivial, or already reviewed by the current user; stop with the reason when review is unnecessary.
2. Locate applicable repository instructions: root `AGENTS.md` plus any `AGENTS.md` files between the repository root and changed files. Treat them as review guidance only where applicable.
3. Summarize the change and its intended behavior.
4. Run five independent review seats. If subagents are available, dispatch all five in parallel with only the target, diff, and seat brief:
   - repository-guidance compliance;
   - shallow changed-lines bug scan;
   - git blame and history analysis;
   - previous PRs and review discussion touching changed files;
   - code-comment and local-contract compliance.
5. Verify every candidate independently and score confidence from 0–100. Keep only findings scoring at least 80.
6. For PRs, repeat the eligibility check immediately before presenting or posting results.

Use this confidence rubric:

- `0`: false positive, pre-existing issue, or disproven by light scrutiny.
- `25`: plausible but unverified; stylistic and not explicitly required.
- `50`: real but rare, low-impact, or a nitpick.
- `75`: highly likely and important, but below the reporting threshold.
- `100`: directly proven and likely to occur in practice.

Do not report build, typecheck, lint, formatting, missing-import, generic documentation, or general test-coverage issues that CI or another specialist owns. Do not report unchanged lines or intentional behavior implied by the change. Cite the exact changed line and the evidence used to validate each issue.

Return a brief `### Code review` report. For each issue include the problem, reason it is real, confidence, and `path:line`. If clean, say that no high-confidence issues were found. Do not post to GitHub unless the user explicitly asks; `$multi-review` owns consolidated posting.

For use inside the orchestrator, follow [references/orchestrator-prompt.md](references/orchestrator-prompt.md).
