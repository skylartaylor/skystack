---
name: claude-review
description: |
  Run a structured external code review through the Claude Code CLI from Codex. Use when the user asks for a Claude review, Claude Code review, external reviewer, cross-model review, or second opinion on a branch diff. This skill uses local Claude Code only with a structured prompt, Opus 1M context by default, max effort by default, and does not use ultrareview.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# Claude Review

Run Claude Code as an external, read-only reviewer of the current branch diff.
Do not use `claude ultrareview` for this skill.

## Workflow

1. Check that `claude` is available:

```bash
command -v claude >/dev/null && claude --version
```

If it is missing, tell the user to install or authenticate Claude Code before retrying.

2. Resolve the bundled wrapper from the installed skill, then run it from the
   repository root you want reviewed. In Codex, run this as a long-running shell
   command with at least a 15 minute timeout (for example, `timeout_ms: 900000`);
   the default shell timeout is often too short for external model review.

```bash
CLAUDE_REVIEW=""
for _s in \
  "${CODEX_HOME:-$HOME/.codex}/skills/claude-review/scripts/claude_review.sh" \
  "$HOME/.codex/skills/claude-review/scripts/claude_review.sh" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/.agents/skills/claude-review/scripts/claude_review.sh"; do
  [ -x "$_s" ] && CLAUDE_REVIEW="$_s" && break
done
[ -z "${CLAUDE_REVIEW:-}" ] && { echo "claude-review wrapper not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
"$CLAUDE_REVIEW"
```

The wrapper:

- Detects the PR base branch with `gh` when available, then falls back to the repo default branch or `main`.
- Builds a diff from the base branch to the working tree, including staged, unstaged, and untracked file changes.
- Calls Claude Code with `--model 'opus[1m]'` and `--effort max`.
- Uses `--disable-slash-commands`, `--no-session-persistence`, no repo tools by default, and a structured review prompt.
- Refuses oversized diffs before calling Claude so Codex gets a clear error instead of a silent timeout. Use `--max-diff-bytes N` to raise the limit when intentional.
- Prints Claude's review text only.

3. If the user supplied review focus, resolve the wrapper the same way and pass
   the focus through:

```bash
CLAUDE_REVIEW=""
for _s in \
  "${CODEX_HOME:-$HOME/.codex}/skills/claude-review/scripts/claude_review.sh" \
  "$HOME/.codex/skills/claude-review/scripts/claude_review.sh" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/.agents/skills/claude-review/scripts/claude_review.sh"; do
  [ -x "$_s" ] && CLAUDE_REVIEW="$_s" && break
done
[ -z "${CLAUDE_REVIEW:-}" ] && { echo "claude-review wrapper not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
"$CLAUDE_REVIEW" --focus "security and data-loss risks"
```

4. Present Claude's output faithfully. If you disagree with a finding, verify it against the code before saying so.

## Options

```bash
CLAUDE_REVIEW=""
for _s in \
  "${CODEX_HOME:-$HOME/.codex}/skills/claude-review/scripts/claude_review.sh" \
  "$HOME/.codex/skills/claude-review/scripts/claude_review.sh" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/.agents/skills/claude-review/scripts/claude_review.sh"; do
  [ -x "$_s" ] && CLAUDE_REVIEW="$_s" && break
done
[ -z "${CLAUDE_REVIEW:-}" ] && { echo "claude-review wrapper not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
"$CLAUDE_REVIEW" \
  --base main \
  --model 'opus[1m]' \
  --effort max \
  --focus "race conditions"
```

Use `--with-tools` only for an explicitly slower exploratory pass where Claude
may run read-only git/search commands itself. Default diff-only mode is faster
and avoids repo-specific hooks/tool loops.

Use a different model or effort only when the user asks. The intended default is Opus 1M with max effort.

## Failure Handling

- If Claude authentication fails, tell the user to run `claude auth login`.
- If `opus[1m]` is unavailable for the account, Claude Code may fail or fall back depending on local configuration. Report the exact error and suggest retrying with `--model opus`.
- If the diff is empty, say there are no changes to review.
- If the diff is too large, report the byte count and suggest narrowing generated/untracked files or retrying with `--model sonnet --effort high`.
- If the wrapper exits nonzero, show the useful stderr/stdout context and do not invent findings.
