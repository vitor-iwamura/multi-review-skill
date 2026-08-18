# Orchestrator reviewer brief

Emulate Matt Pocock's two-axis review in one read-only process.

Standards axis: find violations of applicable repository guidance and judgement-call matches from [smell-baseline.md](smell-baseline.md). Repository guidance overrides the baseline; skip tooling-enforced style.

Spec axis: infer the originating issue, PRD, or spec from commit messages, branch naming, and repository documents. Find missing or partial requirements, unrequested scope, and incorrectly implemented requirements. If no spec evidence exists, do not invent it and restrict findings to Standards.

Keep the reasoning for the axes distinct, but emit only concrete changed-line defects suitable for the consolidated review. Do not post or edit.
