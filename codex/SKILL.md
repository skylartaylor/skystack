---
name: codex
description: |
  Get an independent second opinion from OpenAI Codex CLI. Supports code review,
  adversarial challenge, and focused consultation. Use when asked for a Codex
  review, challenge, consultation, cross-model review, or second opinion.
argument-hint: "review|challenge|consult [focus]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# Codex second opinion

Run Codex as a read-only independent reviewer. Give it the task and relevant
repository context, then present its answer faithfully before adding your own
synthesis.

## Resolve Codex

```bash
_PROBE="$HOME/.claude/skills/skystack/bin/skystack-codex-probe"
if [ ! -f "$_PROBE" ]; then
  _ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
  _PROBE="$_ROOT/bin/skystack-codex-probe"
fi
[ -f "$_PROBE" ] || { echo "PROBE_NOT_FOUND"; exit 1; }
source "$_PROBE"
CODEX_BIN="$(_skystack_codex_resolve 2>/dev/null || true)"
[ -n "$CODEX_BIN" ] || { echo "CODEX_NOT_FOUND"; exit 1; }
_skystack_codex_auth_probe >/dev/null || { echo "AUTH_REQUIRED"; exit 1; }
"$CODEX_BIN" --version
```

If Codex is missing, suggest the official Codex CLI installation. If
authentication is missing, ask the user to run `codex login` or configure the
supported API-key environment variable. Pass through any compatibility warning
from the probe.

## Choose a mode

- **Review:** inspect the current diff for correctness, regressions, security,
  performance, and missing tests.
- **Challenge:** try to break the change with adversarial inputs and failure
  modes.
- **Consult:** answer a focused question about code, architecture, or a plan.

Infer the mode from the user's wording. With no mode, review an existing diff;
otherwise ask what they want Codex to examine. Do not add a mode-selection
question when the request is already clear.

Use `gpt-5.6-sol` by default. Use `ultra` reasoning for review, `high` for
challenge, and `medium` for consultation. Honor an explicit model or effort
request.

## Review

Detect the base branch:

## Step 0: Detect base branch

Determine which branch this PR targets. Use the result as "the base branch" in all subsequent steps.

1. Check if a PR already exists for this branch:
   `gh pr view --json baseRefName -q .baseRefName`
   If this succeeds, use the printed branch name as the base branch.

2. If no PR exists (command fails), detect the repo's default branch:
   `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

3. If both commands fail, fall back to `main`.

Print the detected base branch name. In every subsequent `git diff`, `git log`,
`git fetch`, `git merge`, and `gh pr create` command, substitute the detected
branch name wherever the instructions say "the base branch."

---

Run from the repository root. Keep Codex read-only, ignore unrelated user
configuration, and avoid persisting the evaluation session:

```bash
source "$HOME/.claude/skills/skystack/bin/skystack-codex-probe"
CODEX_BIN="$(_skystack_codex_resolve)" || exit 127
_ROOT=$(git rev-parse --show-toplevel) || exit 1
_OUT=$(mktemp /tmp/skystack-codex-review-XXXXXX)
"$CODEX_BIN" --search exec \
  -C "$_ROOT" \
  -s read-only \
  --ephemeral \
  --ignore-user-config \
  -m gpt-5.6-sol \
  -c 'model_reasoning_effort="ultra"' \
  -o "$_OUT" \
  review --base "<base branch>" \
  "<optional user focus>"
_STATUS=$?
[ -s "$_OUT" ] && cat "$_OUT"
rm -f "$_OUT"
exit "$_STATUS"
```

Use `--uncommitted` instead of `--base` when the user specifically wants only
staged, unstaged, and untracked work reviewed.

## Challenge

Give Codex the repository scope, the relevant diff or artifact, and the user's
focus. Ask for concrete trigger conditions and evidence, not generic risk lists.
Run the prompt through stdin:

```bash
source "$HOME/.claude/skills/skystack/bin/skystack-codex-probe"
CODEX_BIN="$(_skystack_codex_resolve)" || exit 127
_ROOT=$(git rev-parse --show-toplevel) || exit 1
_OUT=$(mktemp /tmp/skystack-codex-challenge-XXXXXX)
"$CODEX_BIN" --search exec \
  -C "$_ROOT" \
  -s read-only \
  --ephemeral \
  --ignore-user-config \
  -m gpt-5.6-sol \
  -c 'model_reasoning_effort="high"' \
  -o "$_OUT" - <<'CODEX_PROMPT'
Challenge the change in this repository. Inspect the diff against its base
branch. Try to produce real failures: edge cases, races, authorization mistakes,
data loss, resource leaks, bad rollback behavior, and silent corruption. For
each finding, give the triggering condition, impact, evidence, and smallest
useful fix. Stay within the requested scope.

User focus: <focus, or "none">
CODEX_PROMPT
_STATUS=$?
[ -s "$_OUT" ] && cat "$_OUT"
rm -f "$_OUT"
exit "$_STATUS"
```

## Consult

Send the user's actual question and any named artifact. Do not preload the whole
repository or unrelated skill instructions. Use the same command shape as
Challenge with `model_reasoning_effort="medium"` and a prompt that contains:

1. The question
2. The relevant file, plan, or decision
3. The desired output or decision criteria
4. A request to inspect supporting repository context as needed

Start fresh by default. If the user explicitly asks to continue a prior Codex
conversation, use `codex exec resume --last` rather than maintaining a separate
Skystack session file.

## Evaluate the response

Show Codex's final answer without silently dropping findings. Then:

1. Verify any important claim against the source before endorsing it.
2. Deduplicate it against findings already established in this conversation.
3. State where you agree, disagree, or need more evidence.
4. Keep the user's requested outcome in charge; a model disagreement is advice,
   not authority.

Do not turn the response into a pass/fail gate by counting marker strings.

## Failure handling

- Surface the exact useful error for missing auth, unsupported model, timeout,
  or empty output.
- Retry once only when the failure is clearly transient.
- Narrow an oversized task instead of raising timeouts indefinitely.
- Never switch Codex to a writable sandbox for this skill.
