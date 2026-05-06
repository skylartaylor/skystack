---
name: claude-review
description: Run a structured external code review through the Claude Code CLI from Codex. Use when the user asks for a Claude review, Claude Code review, external reviewer, cross-model review, or second opinion on a branch diff. This skill uses local Claude Code only with a structured prompt, Opus 1M context by default, max effort by default, and does not use ultrareview.
---

# Claude Review

Run Claude Code as an external, read-only reviewer of the current branch diff.
Do not use `claude ultrareview` for this skill.

## Workflow

1. Check that `claude` is available:

```bash
command -v claude >/dev/null && claude --version
```

If it is missing, tell the user to install or authenticate Claude Code before retrying.

2. Run the bundled wrapper from the repository root:

```bash
.agents/skills/claude-review/scripts/claude_review.sh
```

The wrapper:

- Detects the PR base branch with `gh` when available, then falls back to the repo default branch or `main`.
- Builds a diff from the base branch to the working tree, including staged, unstaged, and untracked file changes.
- Calls Claude Code with `--model 'opus[1m]'` and `--effort max`.
- Uses `--disable-slash-commands`, `--no-session-persistence`, read-only tools, and a structured review prompt.
- Prints Claude's review text only.

3. If the user supplied review focus, pass it through:

```bash
.agents/skills/claude-review/scripts/claude_review.sh --focus "security and data-loss risks"
```

4. Present Claude's output faithfully. If you disagree with a finding, verify it against the code before saying so.

## Options

```bash
.agents/skills/claude-review/scripts/claude_review.sh \
  --base main \
  --model 'opus[1m]' \
  --effort max \
  --focus "race conditions"
```

Use a different model or effort only when the user asks. The intended default is Opus 1M with max effort.

## Failure Handling

- If Claude authentication fails, tell the user to run `claude auth login`.
- If `opus[1m]` is unavailable for the account, Claude Code may fail or fall back depending on local configuration. Report the exact error and suggest retrying with `--model opus`.
- If the diff is empty, say there are no changes to review.
- If the wrapper exits nonzero, show the useful stderr/stdout context and do not invent findings.
