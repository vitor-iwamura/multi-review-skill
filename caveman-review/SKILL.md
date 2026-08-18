---
name: caveman-review
description: "Format code-review findings as ultra-compressed, actionable one-line comments containing location, problem, and fix. Use when the user invokes $caveman-review, requests Caveman style, or asks to make review comments terse; also used as $multi-review's merge formatter."
---

# Caveman Review

Write review comments terse and actionable. Use one line per finding: location, problem, fix. No throat-clearing.

Format as `L<line>: <problem>. <fix>.` or `<file>:L<line>: ...` for multiple files.

Use severity when mixed:

- `🔴 bug:` broken behavior or likely incident.
- `🟡 risk:` fragile behavior such as a race, missing guard, or swallowed error.
- `🔵 nit:` optional style, naming, or micro-optimization.
- `❓ q:` a genuine question rather than a disguised suggestion.

Drop praise, hedging, restatement of the code, and phrases such as “I noticed,” “consider,” or “this is just a suggestion.” Keep exact lines, backticked identifiers, a concrete fix, and the reason only when it is not obvious.

Use normal explanatory paragraphs for CVE-class security findings, architectural disagreements, and onboarding contexts that require rationale, then resume terse style.

Reviews only: do not edit, approve, request changes, post, or run linters unless separately requested. If there are no findings, output `LGTM`.

For the structured merge pass, follow [references/formatter-prompt.md](references/formatter-prompt.md).
