# Orchestrator reviewer brief

Perform the fast single-pass review corresponding to Claude's built-in `/review`. Find only actionable defects introduced by the supplied change: functional regressions, data loss, security, concurrency, error handling, API compatibility, and meaningful performance problems. Verify against nearby context. Suppress pre-existing issues, unchanged lines, style, praise, summaries, and compiler/linter findings. Stay read-only and do not post.
