# Specialist briefs

## Code

Review changed code against applicable `AGENTS.md`, `CONTRIBUTING.md`, style guides, and established local patterns. Find functional bugs, null handling, races, leaks, security and performance defects, accessibility failures, significant duplication, and missing critical error handling. Score confidence 0–100 and report only findings at least 80.

## Tests

Evaluate behavioral coverage rather than line coverage. Map changed behavior to tests, then find critical error paths, boundary cases, business branches, negative validation, async/concurrent behavior, or integration contracts that can regress undetected. Reject tests coupled only to implementation details. Rate each gap 1–10 and explain the exact regression it would catch; prioritize ratings 5 and above.

## Comments

Cross-check every added or changed comment against implementation, signatures, edge cases, side effects, complexity claims, and referenced symbols. Flag factually wrong or misleading comments, missing rationale for non-obvious behavior, stale TODOs, and comments that merely restate code or will predictably rot. Suggest an exact rewrite or removal.

## Errors

Audit try/catch or Result handling, callbacks, failure branches, fallback/default values, log-and-continue behavior, optional chaining, retries, and cleanup. Find errors that are swallowed, over-broad catches, unjustified fallbacks, missing actionable user feedback, insufficient diagnostic context, and mock/fake production fallbacks. Apply project logging and error-ID conventions only when the repository actually defines them.

## Types

For each changed type, identify invariants and rate 1–10: encapsulation, invariant expression, invariant usefulness, and enforcement. Find invalid states constructible from outside, mutable internals, inconsistent construction or mutation validation, anemic models, overly broad responsibilities, and invariants existing only in comments. Prefer pragmatic compile-time guarantees without gratuitous complexity.

## Simplify

Find behavior-preserving ways to improve recently changed code: reduce nesting and redundancy, remove premature abstractions, improve naming, consolidate related logic, and replace dense or clever constructs with explicit code. Do not optimize for fewer lines, flatten useful boundaries, or propose a refactor without a concrete clarity or maintenance benefit.
