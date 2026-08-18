# Multi Review skill bundle

This repository contains the `multi-review` Codex skill and all six companion
skills it invokes:

- `code-review`
- `pr-review-toolkit`
- `mattpocock-code-review`
- `requesting-code-review`
- `review`
- `caveman-review`

## Install

Requirements:

- Codex CLI, authenticated with `codex login`
- Node.js 24 or newer
- GitHub CLI, authenticated with `gh auth login`
- A local Git repository with a GitHub remote when reviewing a pull request

Clone this repository and copy all seven skill directories into the agent skill
directory:

```bash
git clone https://github.com/vitor-iwamura/multi-review-skill.git
mkdir -p "$HOME/.agents/skills"
cp -R multi-review-skill/{multi-review,code-review,pr-review-toolkit,mattpocock-code-review,requesting-code-review,review,caveman-review} "$HOME/.agents/skills/"
```

Start a new Codex session after installation so the skills are discovered.

## Usage

Run from the repository you want to review:

```bash
node "$HOME/.agents/skills/multi-review/scripts/run-review.ts" \
  https://github.com/OWNER/REPOSITORY/pull/NUMBER \
  --no-post
```

Omit `--no-post` only when you want the orchestrator to post its consolidated
review to GitHub. Use `--dry-run` to inspect the planned passes without running
them.

See [`multi-review/SKILL.md`](multi-review/SKILL.md) for all options and behavior.
