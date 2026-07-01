#!/usr/bin/env bash
set -euo pipefail

MODEL="opus[1m]"
EFFORT="max"
BASE=""
FOCUS=""
WITH_TOOLS="${CLAUDE_REVIEW_WITH_TOOLS:-0}"
MAX_DIFF_BYTES="${CLAUDE_REVIEW_MAX_DIFF_BYTES:-1500000}"

usage() {
  cat <<'EOF'
Usage: claude_review.sh [--base BRANCH] [--opus|--fable|--reviewer opus|fable|--model MODEL] [--effort LEVEL] [--focus TEXT] [--with-tools] [--max-diff-bytes N]

Runs a structured, read-only Claude Code review of the current branch diff.
Defaults: --model 'opus[1m]' --effort max

Review profiles:
  --opus              Use Opus 1M review (default)
  --fable             Use Fable review
  --reviewer NAME     Use a named review profile: opus or fable
  --model MODEL       Pass an exact Claude Code model alias or full model name

Default mode is diff-only: Claude receives the generated diff on stdin and no
repo tools. Use --with-tools only when you want a slower exploratory pass.
EOF
}

set_reviewer() {
  case "$1" in
    opus)
      MODEL="opus[1m]"
      ;;
    fable)
      MODEL="fable"
      ;;
    *)
      echo "--reviewer must be one of: opus, fable" >&2
      exit 2
      ;;
  esac
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --base)
      BASE="${2:-}"
      shift 2
      ;;
    --opus)
      set_reviewer opus
      shift
      ;;
    --fable)
      set_reviewer fable
      shift
      ;;
    --reviewer)
      set_reviewer "${2:-}"
      shift 2
      ;;
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --effort)
      EFFORT="${2:-}"
      shift 2
      ;;
    --focus)
      FOCUS="${2:-}"
      shift 2
      ;;
    --with-tools)
      WITH_TOOLS=1
      shift
      ;;
    --max-diff-bytes)
      MAX_DIFF_BYTES="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code CLI not found. Install Claude Code and run 'claude auth login'." >&2
  exit 127
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "claude-review must be run inside a git repository." >&2
  exit 128
fi

if [ -z "$BASE" ]; then
  if command -v gh >/dev/null 2>&1; then
    BASE="$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || true)"
    if [ -z "$BASE" ]; then
      BASE="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || true)"
    fi
  fi
fi

if [ -z "$BASE" ]; then
  if git show-ref --verify --quiet refs/remotes/origin/HEAD; then
    BASE="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD | sed 's#^origin/##')"
  elif git show-ref --verify --quiet refs/heads/main || git show-ref --verify --quiet refs/remotes/origin/main; then
    BASE="main"
  elif git show-ref --verify --quiet refs/heads/master || git show-ref --verify --quiet refs/remotes/origin/master; then
    BASE="master"
  else
    BASE="main"
  fi
fi

BASE_REF="$BASE"
if git show-ref --verify --quiet "refs/remotes/origin/$BASE"; then
  BASE_REF="origin/$BASE"
fi

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "Base ref '$BASE_REF' could not be resolved. Pass --base explicitly." >&2
  exit 128
fi

TMP_DIFF="$(mktemp "${TMPDIR:-/tmp}/claude-review-diff.XXXXXX")"
TMP_OUT="$(mktemp "${TMPDIR:-/tmp}/claude-review-out.XXXXXX")"
TMP_ERR="$(mktemp "${TMPDIR:-/tmp}/claude-review-err.XXXXXX")"
trap 'rm -f "$TMP_DIFF" "$TMP_OUT" "$TMP_ERR"' EXIT

{
  echo "# Review scope"
  echo "Base ref: $BASE_REF"
  echo "Head ref: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo
  echo "# Diff stat"
  git diff --stat "$BASE_REF" || true
  echo
  echo "# Untracked files"
  git ls-files --others --exclude-standard || true
  echo
  echo "# Diff"
  git diff --binary "$BASE_REF"
  while IFS= read -r -d '' file; do
    [ -f "$file" ] || continue
    echo
    echo "# Untracked file diff: $file"
    git diff --no-index --binary -- /dev/null "$file" || true
  done < <(git ls-files --others --exclude-standard -z)
} >"$TMP_DIFF"

if ! grep -q '^diff --git ' "$TMP_DIFF"; then
  echo "No changes found against $BASE_REF."
  exit 0
fi

if ! [[ "$MAX_DIFF_BYTES" =~ ^[0-9]+$ ]]; then
  echo "--max-diff-bytes must be a positive integer." >&2
  exit 2
fi

DIFF_BYTES="$(wc -c < "$TMP_DIFF" | tr -d '[:space:]')"
if [ "$DIFF_BYTES" -gt "$MAX_DIFF_BYTES" ]; then
  {
    echo "claude-review diff is too large to review safely without timing out."
    echo "Diff bytes: $DIFF_BYTES"
    echo "Limit: $MAX_DIFF_BYTES"
    echo
    echo "Try one of:"
    echo "- Narrow the branch diff or ignore/generated files."
    echo "- Re-run with --max-diff-bytes <larger-number> if this size is intentional."
    echo "- Re-run with --model sonnet --effort high for a faster pass."
  } >&2
  exit 2
fi

SYSTEM_PROMPT="You are an external code reviewer. Review only for actionable correctness, security, data loss, concurrency, error handling, regression, and missing-test risks. Do not edit files. Do not use ultrareview. Avoid style, naming, formatting, or speculative findings unless they cause real user-facing failure."

USER_PROMPT="Review the repository diff provided via stdin. Start with findings. Use this exact structure:

FINDINGS
- [P0|P1|P2] path:line - concise title
  Impact: what breaks for users or operators
  Evidence: the specific code path or diff behavior
  Fix: the smallest correct change

OPEN QUESTIONS
- Only questions that block a correct review.

VERIFICATION
- Commands or focused tests that should be run.

If there are no actionable findings, write: No blocking findings.

Severity calibration:
- P0: data loss, security exposure, production outage, or corruption likely.
- P1: clear functional regression, broken workflow, race, or missing critical error path.
- P2: real but narrower bug, edge case, or missing test for risky logic."

if [ -n "$FOCUS" ]; then
  USER_PROMPT="$USER_PROMPT

Additional focus: $FOCUS"
fi

CLAUDE_ARGS=(
  -p "$USER_PROMPT"
  --model "$MODEL"
  --effort "$EFFORT"
  --disable-slash-commands
  --no-session-persistence
  --permission-mode dontAsk
  --append-system-prompt "$SYSTEM_PROMPT"
  --output-format json
)

if [ "$WITH_TOOLS" = "1" ]; then
  CLAUDE_ARGS+=(
    --tools "Read,Bash"
    --allowedTools "Read" "Bash(git diff *)" "Bash(git status *)" "Bash(git log *)" "Bash(git show *)" "Bash(git rev-parse *)" "Bash(rg *)" "Bash(sed *)" "Bash(ls *)" "Bash(pwd)"
  )
else
  CLAUDE_ARGS+=(--tools "")
fi

if ! claude "${CLAUDE_ARGS[@]}" <"$TMP_DIFF" >"$TMP_OUT" 2>"$TMP_ERR"; then
  cat "$TMP_ERR" >&2
  cat "$TMP_OUT"
  exit 1
fi

python3 - "$TMP_OUT" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

try:
    data = json.loads(raw)
except json.JSONDecodeError:
    print(raw, end="")
    sys.exit(0)

result = data.get("result")
if isinstance(result, str):
    print(result)
else:
    print(json.dumps(data, indent=2))
PY
