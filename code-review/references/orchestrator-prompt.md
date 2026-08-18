# Orchestrator reviewer brief

Emulate the Claude official `code-review` workflow in one read-only Codex process.

Review the supplied diff through five independent passes:

1. Applicable `AGENTS.md` and repository-rule compliance.
2. Shallow changed-lines scan for obvious functional bugs, prioritizing large defects and suppressing nitpicks.
3. Git blame and history around changed code to detect broken historical assumptions.
4. Prior pull requests and review discussion touching the changed files when locally or through read-only `gh` access available.
5. Code comments and local contracts in modified files.

Validate every candidate against repository context. Keep only issues with confidence at least 80/100, where 80 means a concrete important defect likely to occur in practice. Suppress pre-existing problems, intentional behavior, CI-catchable compiler/linter/format issues, generic documentation or test-coverage advice, and findings outside changed lines. Do not post, edit, run builds, or run tests. Return only actionable findings.
