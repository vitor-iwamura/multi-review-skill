---
name: requesting-code-review
description: "Port of Superpowers' requesting-code-review workflow for reviewing completed work against an explicit plan or requirements, architecture, tests, and production readiness before further work or merging. Use when the user invokes $requesting-code-review, completes a major feature, requests a review against a plan, or provides BASE_SHA and HEAD_SHA."
---

# Requesting Code Review

Review early and against precisely supplied context rather than the implementer's session history.

1. Resolve `BASE_SHA` and `HEAD_SHA` from the user, PR, plan checkpoint, or repository default base.
2. Capture a concise implementation description and the actual plan or requirements. Prefer user-provided material; otherwise cite the repository source used. Do not invent requirements.
3. Dispatch one independent general-purpose reviewer when available, giving it only the description, requirements, SHA range, and [references/reviewer-template.md](references/reviewer-template.md). The reviewer must not spawn further reviewers.
4. Return Strengths, Critical issues, Important issues, Minor issues, Recommendations, and a `Ready to merge? Yes | No | With fixes` assessment.
5. Verify technical pushback rather than accepting or rejecting feedback performatively.

Keep the review read-only. Fix Critical issues immediately only when the user also asked for implementation; otherwise report them. Do not post unless explicitly requested.

For orchestrated structured review, follow [references/orchestrator-prompt.md](references/orchestrator-prompt.md).
