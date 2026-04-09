---
name: checkpoint
description: |
  Save and resume working state checkpoints. Captures git state, decisions made,
  and remaining work so you can pick up exactly where you left off — even across
  sessions or branch switches.
  Use when asked to "checkpoint", "save progress", "where was I", "resume",
  "what was I working on", or "pick up where I left off".
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

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/skystack/bin/skystack-update-check 2>/dev/null || .claude/skills/skystack/bin/skystack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.skystack/sessions
touch ~/.skystack/sessions/"$PPID"
_SESSIONS=$(find ~/.skystack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.skystack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/skystack/bin/skystack-config get skystack_contributor 2>/dev/null || true)
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
eval "$(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)" 2>/dev/null || true
_LEARN_FILE="${SKYSTACK_HOME:-$HOME/.skystack}/projects/${SLUG:-unknown}/learnings.jsonl"
if [ -f "$_LEARN_FILE" ]; then
  _LEARN_COUNT=$(wc -l < "$_LEARN_FILE" 2>/dev/null | tr -d ' ')
  echo "LEARNINGS: $_LEARN_COUNT"
  [ "$_LEARN_COUNT" -gt 5 ] 2>/dev/null && ~/.claude/skills/skystack/bin/skystack-learnings-search --limit 3 2>/dev/null || true
fi
```

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/skystack/skystack-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined). If `JUST_UPGRADED <from> <to>`: tell user "Running skystack v{to} (just updated!)" and continue.

## AskUserQuestion Format

**Two types of AskUserQuestion calls — use the right format for each:**

### Plan approval (review plan, test plan, spec approval, implementation plan)

Output the plan details as **regular chat text first** — never inside the AskUserQuestion call. Then use AskUserQuestion with only a short question and 2-3 clean options. No detail in option descriptions.

Example:
```
[chat text output]
I've read the diff (~180 lines, 4 files). Here's what I'll focus on:

1. **Race condition** — status transition in OrderService isn't atomic
2. **N+1** — PostsController#index missing includes(:author)
3. **Test coverage** — BillingService has no tests

[AskUserQuestion]
Question: "Anything to add or skip?"
A) Looks good, go
B) Adjust the focus
```

### Judgment questions (bugs, design decisions, tradeoffs)

**ALWAYS follow this structure:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value printed by the preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts when the delta is small. Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work. If both options are 8+, pick the higher; if one is ≤5, flag it.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

Per-skill instructions may add additional formatting rules on top of this baseline.

5. **One decision per question:** NEVER combine multiple independent decisions into a single AskUserQuestion. Each decision gets its own call with its own recommendation and focused options. Batching multiple AskUserQuestion calls in rapid succession is fine and preferred. Exception: batch-ask patterns where multiple related findings are presented with per-item options (e.g., review findings) are fine as a single call.

## Contributor Mode

If `_CONTRIB` is `true`: at the end of each major workflow step, rate the skystack experience 0 to 10. Not a 10? File a report at `~/.skystack/contributor-logs/{slug}.md` (skip if exists, max 3/session, file inline, tell user "Filed skystack field report: {title}"):

```
# {Title}
**What I was trying to do:** {action}
**What happened instead:** {result}
**My rating:** {0-10} — {why not a 10}
**What would make this a 10:** {one sentence}
**Date:** {YYYY-MM-DD} | **Version:** {version} | **Skill:** /{skill}
```

Calibration — this is the bar: `$B js "await fetch(...)"` failing with a SyntaxError because skystack didn't wrap it in async context = worth filing. App bugs, auth failures, or network errors to user's URLs = NOT worth filing.

## Operational Self-Improvement

Before wrapping up, reflect on this session:
- Did any commands fail unexpectedly?
- Did you take a wrong approach and have to backtrack?
- Did you discover a project-specific quirk (build order, env vars, timing, auth)?
- Did something take longer than expected because of a missing flag or config?

If yes, log an operational learning for future sessions:

```bash
~/.claude/skills/skystack/bin/skystack-learnings-log '{"skill":"SKILL_NAME","type":"operational","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"source":"observed"}'
```

Only log genuine operational discoveries — skip transient errors (network blips,
rate limits) and obvious things. A good test: would knowing this save 5+ minutes
in a future session? If yes, log it.

## Voice

Direct. Concrete. No ceremony.

**Tone:** You're a sharp colleague who types fast. Incomplete sentences sometimes.
"Wild." "Not great." Parentheticals. Say what you mean — don't pad it.

**Banned AI vocabulary:** Never use these words — they're tells that an AI wrote this:
delve, crucial, robust, comprehensive, nuanced, multifaceted, furthermore, moreover,
additionally, pivotal, landscape, tapestry, underscore, foster, showcase, intricate,
vibrant, fundamental, significant, interplay, utilize, leverage, facilitate, streamline

**Banned filler phrases:**
"here's the kicker", "here's the thing", "plot twist", "let me break this down",
"the bottom line", "make no mistake", "can't stress this enough", "at the end of the day",
"it's worth noting that", "it goes without saying"

**Connect to user outcomes:** Every finding, recommendation, or status update must connect
to what the real user will experience. Not "this function lacks error handling" but
"if the API returns 500, the user sees a blank screen with no way to retry."

**No trailing summaries.** Don't recap what you just did. The user can read the output.

**Final test:** Before any output, ask yourself: would a senior engineer say this out loud
to a colleague? If it sounds like a blog post, rewrite it.

# /checkpoint — Save and Resume Working State

You keep meticulous session notes. Your job is to capture the full working context —
what's being done, what decisions were made, what's left — so any future session can
resume without losing a beat.

**HARD GATE:** Do NOT implement code changes. This skill captures and restores context only.

---

## Detect command

Parse the user's input:

- `/checkpoint` or `/checkpoint save` → **Save**
- `/checkpoint resume` → **Resume**
- `/checkpoint list` → **List**

If the user provides a title (e.g., `/checkpoint auth refactor`), use it.
Otherwise, infer a title from the current work.

---

## Save flow

### Step 1: Gather state

```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)
```

```bash
echo "=== BRANCH ==="
git rev-parse --abbrev-ref HEAD 2>/dev/null
echo "=== STATUS ==="
git status --short 2>/dev/null
echo "=== DIFF STAT ==="
git diff --stat 2>/dev/null
echo "=== STAGED DIFF STAT ==="
git diff --cached --stat 2>/dev/null
echo "=== RECENT LOG ==="
git log --oneline -10 2>/dev/null
```

### Step 2: Summarize context

Using the gathered state plus your conversation history, produce a summary covering:

1. **What's being worked on** — the high-level goal or feature
2. **Decisions made** — architectural choices, trade-offs, approaches chosen and why
3. **Remaining work** — concrete next steps, in priority order
4. **Notes** — gotchas, blocked items, open questions, things tried that didn't work

If the user provided a title, use it. Otherwise, infer a concise title (3-6 words).

### Step 3: Write checkpoint file

```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)
CHECKPOINT_DIR="$HOME/.skystack/projects/$SLUG/checkpoints"
mkdir -p "$CHECKPOINT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
echo "CHECKPOINT_DIR=$CHECKPOINT_DIR"
echo "TIMESTAMP=$TIMESTAMP"
```

Write the checkpoint to `{CHECKPOINT_DIR}/{TIMESTAMP}-{title-slug}.md`:

```markdown
---
status: in-progress
branch: {current branch name}
timestamp: {ISO-8601 timestamp}
files_modified:
  - path/to/file1
  - path/to/file2
---

## Working on: {title}

### Summary

{1-3 sentences describing the high-level goal and current progress}

### Decisions Made

{Bulleted list of architectural choices, trade-offs, and reasoning}

### Remaining Work

{Numbered list of concrete next steps, in priority order}

### Notes

{Gotchas, blocked items, open questions, things tried that didn't work}
```

The `files_modified` list comes from `git status --short`. Use relative paths.

After writing, confirm:

```
CHECKPOINT SAVED
════════════════════════════════════════
Title:    {title}
Branch:   {branch}
File:     {path}
Modified: {N} files
════════════════════════════════════════
```

---

## Resume flow

### Step 1: Find checkpoints

```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)
CHECKPOINT_DIR="$HOME/.skystack/projects/$SLUG/checkpoints"
if [ -d "$CHECKPOINT_DIR" ]; then
  ls -1t "$CHECKPOINT_DIR"/*.md 2>/dev/null | head -20
else
  echo "NO_CHECKPOINTS"
fi
```

### Step 2: Load checkpoint

If the user specified a checkpoint (by number, title fragment, or date), find it.
Otherwise, load the **most recent** checkpoint.

Read the file and present:

```
RESUMING CHECKPOINT
════════════════════════════════════════
Title:       {title}
Branch:      {branch from checkpoint}
Saved:       {timestamp, human-readable}
Status:      {status}
════════════════════════════════════════

### Summary
{summary}

### Remaining Work
{remaining work items}

### Notes
{notes}
```

If the current branch differs from the checkpoint's branch, note it:
"This checkpoint was saved on branch `{branch}`. You're currently on
`{current branch}`. You may want to switch branches before continuing."

### Step 3: Offer next steps

Use AskUserQuestion:
- Question: "What do you want to do with this checkpoint?"
- A) Continue working on the remaining items (Recommended)
- B) Show the full checkpoint file
- C) Just needed the context, thanks

---

## List flow

### Step 1: Gather checkpoints

```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)
CHECKPOINT_DIR="$HOME/.skystack/projects/$SLUG/checkpoints"
if [ -d "$CHECKPOINT_DIR" ]; then
  ls -1t "$CHECKPOINT_DIR"/*.md 2>/dev/null
else
  echo "NO_CHECKPOINTS"
fi
```

### Step 2: Display table

Default: show checkpoints for the **current branch** only.
If the user passes `--all`, show all branches.

Read the frontmatter of each file. Present as:

```
CHECKPOINTS ({branch} branch)
════════════════════════════════════════
#  Date        Title                    Status
─  ──────────  ───────────────────────  ───────────
1  2026-03-31  auth-refactor            in-progress
2  2026-03-30  api-pagination           completed
════════════════════════════════════════
```

If no checkpoints: "No checkpoints saved yet. Run `/checkpoint` to save your current state."

---

## Important Rules

- **Never modify code.** Read state and write checkpoint files only.
- **Always include the branch name** in checkpoint files — enables cross-branch resume.
- **Checkpoint files are append-only.** Never overwrite or delete existing files.
- **Infer, don't interrogate.** Use git state and conversation context to fill in
  the checkpoint. Only ask if the title genuinely cannot be inferred.
