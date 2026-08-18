# Orchestrator reviewer brief

Emulate Claude's PR Review Toolkit in one read-only pass. Apply all six specialist lenses from [aspects.md](aspects.md): general code quality, behavioral tests, comment accuracy, silent failures/error handling, type invariants, and behavior-preserving simplification. Apply a specialist only where the diff contains relevant changes, except general code quality, which always applies.

Report concrete changed-line findings, source each finding to the relevant aspect, and suppress generic advice. Treat simplification as advisory; do not edit. Do not post or run mutating commands.
