---
name: codex
description: |
  OpenAI Codex CLI wrapper — three modes. Code review: independent diff review via
  codex review with pass/fail gate. Challenge: adversarial mode that tries to break
  your code. Consult: ask codex anything with session continuity for follow-ups.
  An independent second opinion from a different AI. Use when asked to "codex review",
  "codex challenge", "ask codex", "second opinion", or "consult codex".
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

## Context Health

If you notice yourself circling the same problem — repeating tool calls, re-reading the same files, retrying a failing approach — stop. Self-summarize in chat: what you've tried, what you learned, what's left. Then reassess before continuing. Summaries are chat output only — never mutate git state (commit, push, reset, stash) as part of a self-summary.

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

## Taste Memory

Load the user's persistent taste preferences for this project.

```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)
TASTE_FILE=~/.skystack/projects/$SLUG/taste.json
[ -f "$TASTE_FILE" ] && cat "$TASTE_FILE" || echo "{}"
```

**Interpreting the taste profile:**

The JSON may contain these sections — use whichever are relevant to your skill:

- **design** — `aesthetic` (approved visual keywords), `rejected` (vetoed styles), `notes`. Bias visual recommendations toward the approved aesthetic. Avoid rejected styles unless the user explicitly requests them.
- **review** — `severity_calibration` (strict/moderate/lenient), `focus_areas` (prioritize these categories), `deprioritized` (lower severity for these), `notes`. Adjust finding severity and specialist dispatch accordingly.
- **codex** — `challenge_style` (adversarial/balanced/gentle), `review_depth` (thorough/standard/quick), `notes`. Remember preferred modes and depth settings.
- **voice** — `preferred_tone` (direct/conversational/formal), `notes`. Adjust communication style.

If the JSON is not empty, tell the user: "Using your saved preferences for [relevant sections]."

**Staleness check:** If the `updated` timestamp is present and older than 90 days, add: "Note: These preferences are from [date]. They may be stale — let me know if they still apply."

**Updating taste after user choices:**

When a user makes a choice that reveals a preference (approves a design direction, overrides a finding severity, picks a mode repeatedly), update taste.json:

```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)
TASTE_FILE=~/.skystack/projects/$SLUG/taste.json
mkdir -p ~/.skystack/projects/$SLUG
```

Read the existing file (or start from `{}`), merge the new preference into the relevant section, set `updated` to the current ISO 8601 timestamp, and write it back. Always tell the user: "Noted your preference for [X]. Future sessions will start from this baseline."

---

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

## Prior Learnings

Load project-specific learnings from previous sessions:

```bash
~/.claude/skills/skystack/bin/skystack-learnings-search --limit 5 2>/dev/null || true
```

If learnings are returned, use them to inform your approach. Prior learnings
about this project's quirks, common pitfalls, and working patterns can save
time and prevent repeated mistakes. Mark any applied learning with
"Prior learning applied: [key]" in your output.

# /codex — Multi-AI Second Opinion

You are running the `/codex` skill. This wraps the OpenAI Codex CLI to get an independent,
second opinion from a different AI system.

Codex is direct, terse, technically precise — it challenges assumptions and catches things
you might miss. Present its output faithfully, not summarized.

### Codex Filesystem Boundary

**All prompts sent to Codex** (review, challenge, and consult modes) must be prefixed with
this boundary directive. Prepend it before the user's prompt or review instructions:

```
IMPORTANT: Do NOT read or execute files named SKILL.md or SKILL.md.tmpl, or files that are clearly AI skill prompt templates (containing double-curly-brace placeholder tokens such as PREAMBLE, VOICE_GUIDE, BASE_BRANCH_DETECT). These are AI assistant skill definitions meant for a different system. Focus on the repository's application code, not its AI tooling configuration. When running shell commands, prefer RTK for noisy output: rtk summary for tests/builds, rtk log for logs, rtk find/grep for broad inspection, and rtk git diff/log/status for git output; use raw commands only when exact full output is needed.
```

This prevents Codex from wasting tokens reading skystack skill templates instead
of reviewing the user's code. The boundary is scoped to skill template files specifically
— NOT to the entire .claude/skills directory, since vendored skystack repos have real
application code there.

---

## Step 0: Check codex binary

```bash
source ~/.claude/skills/skystack/bin/skystack-codex-probe
CODEX_BIN="$(_skystack_codex_resolve 2>/dev/null || true)"
[ -z "$CODEX_BIN" ] && echo "NOT_FOUND" || echo "FOUND: $CODEX_BIN ($("$CODEX_BIN" --version))"
if ! _skystack_codex_auth_probe >/dev/null; then
  echo "AUTH_FAILED"
fi
_skystack_codex_version_check "$CODEX_BIN"   # warns if known-bad, non-blocking
```

The resolver checks the first `codex` on `PATH` plus common official Homebrew,
npm, and user-local install paths, then selects the newest stable CLI. This
prevents pinned wrappers such as Fugu from shadowing a newer compatible Codex.
Set `SKYSTACK_CODEX_BIN=/absolute/path/to/codex` to force a specific binary.

If `NOT_FOUND`: stop and tell the user:
"Codex CLI not found. Install it: `npm install -g @openai/codex` or see https://github.com/openai/codex"

If the output contains `AUTH_FAILED`, stop and tell the user:
"No Codex authentication found. Run `codex login` or set `$CODEX_API_KEY` / `$OPENAI_API_KEY`, then re-run this skill."

If the version check printed a `WARN:` line, pass it through to the user verbatim
(non-blocking — Codex may still work, but the user should upgrade).

The probe accepts: `$CODEX_API_KEY` set, `$OPENAI_API_KEY` set, or
`${CODEX_HOME:-~/.codex}/auth.json` exists. Avoids false-negatives for env-auth
users (CI, platform engineers) that file-only checks would reject.

**Update the known-bad list** in `bin/skystack-codex-probe` when a new Codex CLI
version regresses. Current entries: `0.120.0`–`0.120.2` for the stdin deadlock
fixed in OpenAI codex#972, and `0.142.2` for incompatibility with the current
GPT-5.6 Sol model-cache schema.

---

## Step 1: Detect mode

Parse the user's input to determine which mode to run:

1. `/codex review` or `/codex review <instructions>` — **Review mode** (Step 2A)
2. `/codex challenge` or `/codex challenge <focus>` — **Challenge mode** (Step 2B)
3. `/codex` with no arguments — **Auto-detect:**
   - Check for a diff (with fallback if origin isn't available):
     `git diff origin/<base> --stat 2>/dev/null | tail -1 || git diff <base> --stat 2>/dev/null | tail -1`
   - If a diff exists, use AskUserQuestion:
     ```
     Codex detected changes against the base branch. What should it do?
     A) Review the diff (code review with pass/fail gate)
     B) Challenge the diff (adversarial — try to break it)
     C) Something else — I'll provide a prompt
     ```
   - If no diff, check for plan files scoped to the current project:
     `ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$(basename $(pwd))" 2>/dev/null | head -1`
     If no project-scoped match, fall back to: `ls -t ~/.claude/plans/*.md 2>/dev/null | head -1`
     but warn the user: "Note: this plan may be from a different project."
   - If a plan file exists, offer to review it
   - Otherwise, ask: "What would you like to ask Codex?"
4. `/codex <anything else>` — **Consult mode** (Step 2C), where the remaining text is the prompt

**Reasoning effort override:** If the user's input contains `--xhigh` anywhere,
note it and remove it from the prompt text before passing to Codex. When `--xhigh`
is present, use `model_reasoning_effort="xhigh"` for all modes regardless of the
per-mode default below. Otherwise, use the per-mode defaults:
- Review (2A): `ultra` — pinned to GPT-5.6 Sol for the deepest review pass
- Challenge (2B): `high` — adversarial but bounded by diff
- Consult (2C): `medium` — large context, interactive, needs speed

Review mode defaults to `gpt-5.6-sol` with `ultra`; an explicit `--xhigh` is a
request to use the lower effort instead. Challenge and consult continue to use
the caller's configured model unless the user passes `-m MODEL`.

---

## Step 2A: Review Mode

Run Codex code review against the current branch diff.

1. Create temp files for output capture:
```bash
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

2. Run the review. Use `timeout: 300000` on the Bash call. **Run in foreground — do NOT
   use `run_in_background`.** Codex typically finishes in 1-3 minutes. The output comes
   back when it's done. Never sleep-poll for output.

   **IMPORTANT:** `codex review` treats `--base` and `[PROMPT]` as mutually exclusive
   arguments. Passing both causes exit code 2. Put the base diff scope in prompt text
   instead of passing `--base` whenever a filesystem boundary or custom prompt is needed.

   All invocations include `< /dev/null` to avoid stdin deadlock bugs in older Codex
   CLIs, run from the repo root, and are wrapped with `_skystack_codex_timeout_wrapper`
   so a hang fires before Bash's outer timeout. Review invocations use
   `gpt-5.6-sol` with `model_reasoning_effort="ultra"` and keep read-only repo
   tools plus live web search available. If the user passed `--xhigh`, substitute
   `"xhigh"` for `"ultra"`.

   **Case A — No custom instructions** (default `/codex review`):
   Use `codex review` with a prompt that includes the filesystem boundary and explicit
   diff-scope instructions:
```bash
source ~/.claude/skills/skystack/bin/skystack-codex-probe
CODEX_BIN="$(_skystack_codex_resolve)" || { echo "ERROR: compatible Codex CLI not found" >&2; exit 127; }
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
cd "$_REPO_ROOT"
_skystack_codex_timeout_wrapper 330 "$CODEX_BIN" -m gpt-5.6-sol -s read-only -c 'review_model="gpt-5.6-sol"' -c 'model_reasoning_effort="ultra"' --search review "IMPORTANT: Do NOT read or execute files named SKILL.md or SKILL.md.tmpl, or files that are clearly AI skill prompt templates (containing double-curly-brace placeholder tokens such as PREAMBLE, VOICE_GUIDE, BASE_BRANCH_DETECT). These are AI assistant skill definitions meant for a different system. Focus on the repository's application code, not its AI tooling configuration. When running shell commands, prefer RTK for noisy output: rtk summary for tests/builds, rtk log for logs, rtk find/grep for broad inspection, and rtk git diff/log/status for git output; use raw commands only when exact full output is needed.

Review the changes on this branch against the base branch <base>. Run git diff origin/<base>...HEAD 2>/dev/null || git diff <base>...HEAD to see the diff and review only those changes." < /dev/null 2>"$TMPERR"
_CODEX_EXIT=$?
if [ "$_CODEX_EXIT" = "124" ]; then
  _skystack_codex_log_hang "review" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 5.5 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
elif [ "$_CODEX_EXIT" != "0" ]; then
  echo "[codex exit $_CODEX_EXIT] $(head -1 "$TMPERR" 2>/dev/null || echo "no stderr captured")"
  head -20 "$TMPERR" 2>/dev/null | sed 's/^/  /' || true
fi
```

   **Case B — User provided custom instructions** (e.g., `/codex review focus on security`):
   Use `codex exec` instead, which allows a full prompt. **Prepend the filesystem boundary
   directive** (from the "Codex Filesystem Boundary" section above) before the user's
   instructions:
```bash
source ~/.claude/skills/skystack/bin/skystack-codex-probe
CODEX_BIN="$(_skystack_codex_resolve)" || { echo "ERROR: compatible Codex CLI not found" >&2; exit 127; }
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
_skystack_codex_timeout_wrapper 330 "$CODEX_BIN" --search exec "IMPORTANT: Do NOT read or execute files named SKILL.md or SKILL.md.tmpl, or files that are clearly AI skill prompt templates (containing double-curly-brace placeholder tokens such as PREAMBLE, VOICE_GUIDE, BASE_BRANCH_DETECT). These are AI assistant skill definitions meant for a different system. Focus on the repository's application code, not its AI tooling configuration. When running shell commands, prefer RTK for noisy output: rtk summary for tests/builds, rtk log for logs, rtk find/grep for broad inspection, and rtk git diff/log/status for git output; use raw commands only when exact full output is needed.

You are doing a code review. Run git diff origin/<base> to see the changes, then review them thoroughly. Look for bugs, security issues, race conditions, error handling gaps, and correctness problems. Be direct and terse. Tag critical findings with [P1] and minor findings with [P2].

Additional instructions: focus on security" -C "$_REPO_ROOT" -s read-only -m gpt-5.6-sol -c 'model_reasoning_effort="ultra"' --json < /dev/null 2>"$TMPERR" | PYTHONUNBUFFERED=1 python3 -u -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex thinking] {text}', flush=True)
                print(flush=True)
            elif itype == 'agent_message' and text:
                print(text, flush=True)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}', flush=True)
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}', flush=True)
    except: pass
"
_CODEX_EXIT=${PIPESTATUS[0]}
if [ "$_CODEX_EXIT" = "124" ]; then
  _skystack_codex_log_hang "review" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 5.5 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
elif [ "$_CODEX_EXIT" != "0" ]; then
  echo "[codex exit $_CODEX_EXIT] $(head -1 "$TMPERR" 2>/dev/null || echo "no stderr captured")"
  head -20 "$TMPERR" 2>/dev/null | sed 's/^/  /' || true
fi
if grep -qiE "auth|login|unauthorized" "$TMPERR" 2>/dev/null; then
  echo "[codex auth error] $(head -1 "$TMPERR")"
fi
```
   Replace "focus on security" with the user's actual instructions.

3. Capture the output. Then parse cost from stderr:
```bash
grep "tokens used" "$TMPERR" 2>/dev/null || echo "tokens: unknown"
```

4. Determine gate verdict by checking the review output for critical findings.
   If the output contains `[P1]` — the gate is **FAIL**.
   If no `[P1]` markers are found (only `[P2]` or no findings) — the gate is **PASS**.

## Confidence Calibration

Every finding must include a confidence score. Calibrate honestly:

| Score | Meaning | Display rule |
|-------|---------|-------------|
| 9-10  | Verified. Concrete bug, tested. | Show normally |
| 7-8   | High confidence pattern. | Show normally |
| 5-6   | Moderate, could be false positive. | Show with caveat |
| 3-4   | Low confidence. | Suppress to appendix only |
| 1-2   | Speculation. | Only show if P0 severity |

Finding format: `[SEVERITY] (confidence: N/10) file:line — description`

Never pad confidence to look thorough. A 6/10 that's honest is better than
a 9/10 that wastes the user's time investigating a false positive.

5. Present the output:

```
CODEX SAYS (code review):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
GATE: PASS                    Tokens: 14,331 | Est. cost: ~$0.12
```

or

```
GATE: FAIL (N critical findings)
```

**Rabbit hole check:** Only if the project being reviewed is NOT skystack itself
(i.e., the repo does not contain `scripts/gen-skill-docs.ts`), scan the Codex output
for these strings: "skills/skystack", "skill template", ".claude/skills", "SKILL.md.tmpl".
If any are found, append this warning after the CODEX SAYS block:

```
WARNING: Codex appears to have read skystack skill files instead of reviewing your
code. Consider retrying with /codex review.
```

Skip this check when reviewing the skystack repo itself — findings about skill files
are legitimate there.

6. **Cross-model comparison:** If `/review` (Claude's own review) was already run
   earlier in this conversation, compare the two sets of findings:

```
CROSS-MODEL ANALYSIS:
  Both found: [findings that overlap between Claude and Codex]
  Only Codex found: [findings unique to Codex]
  Only Claude found: [findings unique to Claude's /review]
  Agreement rate: X% (N/M total unique findings overlap)
```

**Decision taxonomy** — categorize each finding:
- **Auto-decidable:** Style, formatting, trivial refactors — just do it, no need to ask.
- **Taste decision:** Multiple valid approaches — present options, recommend one.
- **User challenge:** Both AI models think the user's direction is wrong — use the
  structured format below. **The user always decides.**
- **Premise challenge:** The feature itself may be wrong — surface with evidence, defer.

If both Claude and Codex agree the user's stated approach should change, present a
structured **User Challenge** block:

```
USER CHALLENGE -- Both models recommend a different direction:
  What you said: [user's stated approach]
  What we recommend: [the alternative]
  Why: [specific evidence from both reviews]
  What we might be missing: [user context we can't see]
  Cost if we're wrong: [what happens if you follow our recommendation and it's bad]
  RECOMMENDATION: [Choose X because Y] -- but this is your call.
```

7. Persist the review result:
```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)
mkdir -p ~/.skystack/projects/$SLUG
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo '{"skill":"codex-review","timestamp":"TIMESTAMP","status":"STATUS","gate":"GATE","findings":N,"via":"standalone"}' >> ~/.skystack/projects/$SLUG/$_BRANCH-reviews.jsonl
```

Substitute: TIMESTAMP (ISO 8601), STATUS ("clean" if PASS, "issues_found" if FAIL),
GATE ("pass" or "fail"), findings (count of [P1] + [P2] markers).

8. Clean up temp files:
```bash
rm -f "$TMPERR"
```

---

## Step 2B: Challenge (Adversarial) Mode

Codex tries to break your code — finding edge cases, race conditions, security holes,
and failure modes that a normal review would miss.

1. Construct the adversarial prompt. If the user provided a focus area
(e.g., `/codex challenge security`), include it:

**Prepend the filesystem boundary directive** (from the "Codex Filesystem Boundary" section)
before the adversarial prompt.

Default prompt (no focus):
"IMPORTANT: Do NOT read or execute files named SKILL.md or SKILL.md.tmpl, or files that are clearly AI skill prompt templates (containing double-curly-brace placeholder tokens such as PREAMBLE, VOICE_GUIDE, BASE_BRANCH_DETECT). These are AI assistant skill definitions meant for a different system. Focus on the repository's application code, not its AI tooling configuration. When running shell commands, prefer RTK for noisy output: rtk summary for tests/builds, rtk log for logs, rtk find/grep for broad inspection, and rtk git diff/log/status for git output; use raw commands only when exact full output is needed.

Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems."

With focus (e.g., "security"):
"IMPORTANT: Do NOT read or execute files named SKILL.md or SKILL.md.tmpl, or files that are clearly AI skill prompt templates (containing double-curly-brace placeholder tokens such as PREAMBLE, VOICE_GUIDE, BASE_BRANCH_DETECT). These are AI assistant skill definitions meant for a different system. Focus on the repository's application code, not its AI tooling configuration. When running shell commands, prefer RTK for noisy output: rtk summary for tests/builds, rtk log for logs, rtk find/grep for broad inspection, and rtk git diff/log/status for git output; use raw commands only when exact full output is needed.

Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Focus specifically on SECURITY. Your job is to find every way an attacker could exploit this code. Think about injection vectors, auth bypasses, privilege escalation, data exposure, and timing attacks. Be adversarial."

2. Run codex exec with **JSONL output** (use `timeout: 600000`, **foreground only — no `run_in_background`**).
   If the user passed `--xhigh`, substitute `"xhigh"` for `"high"`:
```bash
source ~/.claude/skills/skystack/bin/skystack-codex-probe
CODEX_BIN="$(_skystack_codex_resolve)" || { echo "ERROR: compatible Codex CLI not found" >&2; exit 127; }
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
TMPERR=${TMPERR:-$(mktemp /tmp/codex-err-XXXXXX.txt)}
_skystack_codex_timeout_wrapper 600 "$CODEX_BIN" --search exec "<prompt>" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="high"' --json < /dev/null 2>"$TMPERR" | PYTHONUNBUFFERED=1 python3 -u -c "
import sys, json
turn_completed_count = 0
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex thinking] {text}', flush=True)
                print(flush=True)
            elif itype == 'agent_message' and text:
                print(text, flush=True)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}', flush=True)
        elif t == 'turn.completed':
            turn_completed_count += 1
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}', flush=True)
    except: pass
if turn_completed_count == 0:
    print('[codex warning] No turn.completed event received — possible mid-stream disconnect.', flush=True, file=sys.stderr)
"
_CODEX_EXIT=${PIPESTATUS[0]}
if [ "$_CODEX_EXIT" = "124" ]; then
  _skystack_codex_log_hang "challenge" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 10 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
elif [ "$_CODEX_EXIT" != "0" ]; then
  echo "[codex exit $_CODEX_EXIT] $(head -1 "$TMPERR" 2>/dev/null || echo "no stderr captured")"
  head -20 "$TMPERR" 2>/dev/null | sed 's/^/  /' || true
fi
if grep -qiE "auth|login|unauthorized" "$TMPERR" 2>/dev/null; then
  echo "[codex auth error] $(head -1 "$TMPERR")"
fi
```

This parses codex's JSONL events to extract reasoning traces, tool calls, and the final
response. The `[codex thinking]` lines show what codex reasoned through before its answer.

3. Present the full streamed output:

```
CODEX SAYS (adversarial challenge):
════════════════════════════════════════════════════════════
<full output from above, verbatim>
════════════════════════════════════════════════════════════
Tokens: N | Est. cost: ~$X.XX
```

**Rabbit hole check:** Only if the project is NOT skystack itself, scan for:
"skills/skystack", "skill template", ".claude/skills", "SKILL.md.tmpl".
If found, warn: "Codex appears to have read skystack skill files. Consider retrying."
Skip when reviewing the skystack repo.

---

## Step 2C: Consult Mode

Ask Codex anything about the codebase. Supports session continuity for follow-ups.

1. **Check for existing session:**
```bash
cat .context/codex-session-id 2>/dev/null || echo "NO_SESSION"
```

If a session file exists (not `NO_SESSION`), use AskUserQuestion:
```
You have an active Codex conversation from earlier. Continue it or start fresh?
A) Continue the conversation (Codex remembers the prior context)
B) Start a new conversation
```

2. Create temp files:
```bash
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

3. **Prepend the filesystem boundary directive** (from the "Codex Filesystem Boundary"
   section) before the user's prompt in all consult mode codex exec calls.

4. **Plan review auto-detection:** If the user's prompt is about reviewing a plan,
or if plan files exist and the user said `/codex` with no arguments:
```bash
setopt +o nomatch 2>/dev/null || true
ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$(basename $(pwd))" 2>/dev/null | head -1
```
If no project-scoped match, fall back to `ls -t ~/.claude/plans/*.md 2>/dev/null | head -1`
but warn: "Note: this plan may be from a different project — verify before sending to Codex."
Read the plan file and prepend the persona to the user's prompt:
"You are a brutally honest technical reviewer. Review this plan for: logical gaps and
unstated assumptions, missing error handling or edge cases, overcomplexity (is there a
simpler approach?), feasibility risks (what could go wrong?), and missing dependencies
or sequencing issues. Be direct. Be terse. No compliments. Just the problems.

THE PLAN:
<plan content>"

5. Run codex exec with **JSONL output** (use `timeout: 600000`, **foreground only — no `run_in_background`**).
   If the user passed `--xhigh`, substitute `"xhigh"` for `"medium"`:

For a **new session:**
```bash
source ~/.claude/skills/skystack/bin/skystack-codex-probe
CODEX_BIN="$(_skystack_codex_resolve)" || { echo "ERROR: compatible Codex CLI not found" >&2; exit 127; }
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
_skystack_codex_timeout_wrapper 600 "$CODEX_BIN" --search exec "<prompt>" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="medium"' --json < /dev/null 2>"$TMPERR" | PYTHONUNBUFFERED=1 python3 -u -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'thread.started':
            tid = obj.get('thread_id','')
            if tid: print(f'SESSION_ID:{tid}', flush=True)
        elif t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex thinking] {text}', flush=True)
                print(flush=True)
            elif itype == 'agent_message' and text:
                print(text, flush=True)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}', flush=True)
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}', flush=True)
    except: pass
"
_CODEX_EXIT=${PIPESTATUS[0]}
if [ "$_CODEX_EXIT" = "124" ]; then
  _skystack_codex_log_hang "consult" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 10 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
elif [ "$_CODEX_EXIT" != "0" ]; then
  echo "[codex exit $_CODEX_EXIT] $(head -1 "$TMPERR" 2>/dev/null || echo "no stderr captured")"
  head -20 "$TMPERR" 2>/dev/null | sed 's/^/  /' || true
fi
if grep -qiE "auth|login|unauthorized" "$TMPERR" 2>/dev/null; then
  echo "[codex auth error] $(head -1 "$TMPERR")"
fi
```

For a **resumed session** (user chose "Continue"):
```bash
source ~/.claude/skills/skystack/bin/skystack-codex-probe
CODEX_BIN="$(_skystack_codex_resolve)" || { echo "ERROR: compatible Codex CLI not found" >&2; exit 127; }
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
_skystack_codex_timeout_wrapper 600 "$CODEX_BIN" --search exec resume <session-id> "<prompt>" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="medium"' --json < /dev/null 2>"$TMPERR" | PYTHONUNBUFFERED=1 python3 -u -c "
<same python streaming parser as above, with flush=True on all print() calls>
"
_CODEX_EXIT=${PIPESTATUS[0]}
if [ "$_CODEX_EXIT" = "124" ]; then
  _skystack_codex_log_hang "consult-resume" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 10 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
elif [ "$_CODEX_EXIT" != "0" ]; then
  echo "[codex exit $_CODEX_EXIT] $(head -1 "$TMPERR" 2>/dev/null || echo "no stderr captured")"
  head -20 "$TMPERR" 2>/dev/null | sed 's/^/  /' || true
fi
if grep -qiE "auth|login|unauthorized" "$TMPERR" 2>/dev/null; then
  echo "[codex auth error] $(head -1 "$TMPERR")"
fi
```

6. Capture session ID from the streamed output. The parser prints `SESSION_ID:<id>`
   from the `thread.started` event. Save it for follow-ups:
```bash
mkdir -p .context
```
Save the session ID printed by the parser (the line starting with `SESSION_ID:`)
to `.context/codex-session-id`.

7. Present the full streamed output:

```
CODEX SAYS (consult):
════════════════════════════════════════════════════════════
<full output, verbatim — includes [codex thinking] traces>
════════════════════════════════════════════════════════════
Tokens: N | Est. cost: ~$X.XX
Session saved — run /codex again to continue this conversation.
```

**Rabbit hole check:** Only if the project is NOT skystack itself, scan for:
"skills/skystack", "skill template", ".claude/skills", "SKILL.md.tmpl".
If found, warn: "Codex appears to have read skystack skill files. Consider retrying."
Skip when reviewing the skystack repo.

8. After presenting, note any points where Codex's analysis differs from your own
   understanding. If there is a disagreement, flag it:
   "Note: Claude Code disagrees on X because Y."

---

## Model & Reasoning

**Model:** Review mode is pinned to `gpt-5.6-sol`, including `review_model` for
the dedicated `codex review` child. Challenge and consult use the caller's current
Codex model unless the user passes `-m MODEL`.

**Reasoning effort (per-mode defaults):**
- **Review (2A):** `ultra` — maximum reasoning with automatic delegation
- **Challenge (2B):** `high` — adversarial but bounded by diff size
- **Consult (2C):** `medium` — large context (plans, codebase), interactive, needs speed

Users can explicitly request `--xhigh` when they want a lower-cost review or a
higher-effort challenge/consult pass.

**Tool use:** All modes keep repository tools enabled inside Codex's read-only
sandbox. All codex commands use the current `--search` CLI flag so Codex can look
up docs and APIs during review.

If the user specifies a model (e.g., `/codex review -m gpt-5.6-terra`), pass the
`-m` flag through to codex and use the same value for `review_model` in Case A.

---

## Cost Estimation

Parse token count from stderr. Codex prints `tokens used\nN` to stderr.

Display as: `Tokens: N`

If token count is not available, display: `Tokens: unknown`

---

## Error Handling

- **Binary not found:** Detected in Step 0. Stop with install instructions.
- **Auth missing:** Detected in Step 0.5 by the auth probe. Stop with `codex login`
  instructions before any expensive prompt is built.
- **Auth error mid-call:** Each mode greps `$TMPERR` for `auth|login|unauthorized`
  after the codex call returns and surfaces the matched line as `[codex auth error]`.
- **Timeout (Bash outer gate):** If the Bash call times out (5 min for Review, 10 min
  for Challenge/Consult), tell the user:
  "Codex timed out. The prompt may be too large or the API may be slow. Try again or use a smaller scope."
- **Timeout (inner `timeout` wrapper, exit 124):** If the shell wrapper fires first, the
  hang-detection block auto-logs an operational learning via `_skystack_codex_log_hang`
  and prints: "Codex stalled past N minutes. Common causes: model API stall, long prompt,
  network issue. Try re-running. If persistent, split the prompt or check `~/.codex/logs/`."
- **Empty response:** If Codex returns nothing, tell the user:
  "Codex returned no response. Check stderr for errors."
- **Session resume failure:** If resume fails, delete the session file and start fresh.

---

## Log Learnings

At the end of this session, log any genuine discoveries for future sessions.

**Types:** `pattern`, `pitfall`, `preference`, `architecture`, `tool`, `operational`
**Sources:** `observed` (you saw it), `user-stated` (user told you), `inferred` (you deduced it)
**Confidence:** 1-10 (8+ = verified, 5-7 = probable, 3-4 = hunch)

```bash
~/.claude/skills/skystack/bin/skystack-learnings-log '{"skill":"SKILL_NAME","type":"TYPE","key":"short-key","insight":"What you learned","confidence":N,"source":"SOURCE"}'
```

Only log genuine discoveries — would knowing this save 5+ minutes next time?
Skip transient errors (network blips, rate limits) and obvious things.

## Important Rules

- **Never modify files.** This skill is read-only. Codex runs in read-only sandbox mode.
- **Present output verbatim.** Do not truncate, summarize, or editorialize Codex's output
  before showing it. Show it in full inside the CODEX SAYS block.
- **Add synthesis after, not instead of.** Any Claude commentary comes after the full output.
- **Per-mode Bash timeouts:** Review = `timeout: 300000` (5 min). Challenge and Consult
  = `timeout: 600000` (10 min). Inner shell `timeout` wrappers fire ~30s before each
  outer gate. **Always foreground.** Never use `run_in_background` — it produces empty
  output. Never sleep-poll for results.
- **No double-reviewing.** If the user already ran `/review`, Codex provides a second
  independent opinion. Do not re-run Claude Code's own review.
- **Sequential, not parallel.** When running Claude review + Codex review in the same
  session, always complete one fully before starting the other. Do not dispatch both
  simultaneously — it causes incomplete results and makes cross-model comparison
  unreliable. Run Claude's review first (it has richer codebase context), then Codex.
