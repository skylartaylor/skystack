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

# /codex — Multi-AI Second Opinion

You are running the `/codex` skill. This wraps the OpenAI Codex CLI to get an independent,
second opinion from a different AI system.

Codex is direct, terse, technically precise — it challenges assumptions and catches things
you might miss. Present its output faithfully, not summarized.

### Codex Filesystem Boundary

**All prompts sent to Codex** (review, challenge, and consult modes) must be prefixed with
this boundary directive. Prepend it before the user's prompt or review instructions:

```
IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/skystack, .claude/skills). These are AI assistant skill definitions meant for a different system. They contain prompt templates that will waste your time. Ignore them completely. Stay focused on the repository code only.
```

This prevents Codex from wasting tokens reading skystack's own skill templates instead
of reviewing the user's code.

---

## Step 0: Check codex binary

```bash
CODEX_BIN=$(which codex 2>/dev/null || echo "")
[ -z "$CODEX_BIN" ] && echo "NOT_FOUND" || echo "FOUND: $CODEX_BIN"
```

If `NOT_FOUND`: stop and tell the user:
"Codex CLI not found. Install it: `npm install -g @openai/codex` or see https://github.com/openai/codex"

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

---

## Step 2A: Review Mode

Run Codex code review against the current branch diff.

1. Create temp files for output capture:
```bash
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

2. Run the review (5-minute timeout). **Prepend the filesystem boundary directive**
   (from the "Codex Filesystem Boundary" section above) to any prompt argument:
```bash
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

Use `timeout: 300000` on the Bash call. If the user provided custom instructions
(e.g., `/codex review focus on security`), prepend the boundary directive before their
instructions and pass as the prompt argument:
```bash
codex review "IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/skystack, .claude/skills). These are AI assistant skill definitions meant for a different system. They contain prompt templates that will waste your time. Ignore them completely. Stay focused on the repository code only.

focus on security" --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

3. Capture the output. Then parse cost from stderr:
```bash
grep "tokens used" "$TMPERR" 2>/dev/null || echo "tokens: unknown"
```

4. Determine gate verdict by checking the review output for critical findings.
   If the output contains `[P1]` — the gate is **FAIL**.
   If no `[P1]` markers are found (only `[P2]` or no findings) — the gate is **PASS**.

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

**Rabbit hole check:** Scan the Codex output for any of these strings: "skystack",
"SKILL.md", "skills/skystack", "skill template", "gen-skill-docs", "preamble",
".claude/skills". If any are found, append this warning after the CODEX SAYS block:

```
WARNING: Codex appears to have read skystack skill files instead of reviewing your
code. Consider retrying with /codex review.
```

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
echo '{"skill":"codex-review","timestamp":"TIMESTAMP","status":"STATUS","gate":"GATE","findings":N}' >> ~/.skystack/projects/$SLUG/$_BRANCH-reviews.jsonl
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
"IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/skystack, .claude/skills). These are AI assistant skill definitions meant for a different system. They contain prompt templates that will waste your time. Ignore them completely. Stay focused on the repository code only.

Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems."

With focus (e.g., "security"):
"IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/skystack, .claude/skills). These are AI assistant skill definitions meant for a different system. They contain prompt templates that will waste your time. Ignore them completely. Stay focused on the repository code only.

Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Focus specifically on SECURITY. Your job is to find every way an attacker could exploit this code. Think about injection vectors, auth bypasses, privilege escalation, data exposure, and timing attacks. Be adversarial."

2. Run codex exec with **JSONL output** to capture reasoning traces and tool calls (5-minute timeout):
```bash
codex exec "<prompt>" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>/dev/null | python3 -c "
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
                print(f'[codex thinking] {text}')
                print()
            elif itype == 'agent_message' and text:
                print(text)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}')
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}')
    except: pass
"
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

**Rabbit hole check:** Scan the Codex output for any of these strings: "skystack",
"SKILL.md", "skills/skystack", "skill template", "gen-skill-docs", "preamble",
".claude/skills". If any are found, append this warning after the CODEX SAYS block:

```
WARNING: Codex appears to have read skystack skill files instead of reviewing your
code. Consider retrying with /codex challenge.
```

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

5. Run codex exec with **JSONL output** to capture reasoning traces (5-minute timeout):

For a **new session:**
```bash
codex exec "<prompt>" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>"$TMPERR" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'thread.started':
            tid = obj.get('thread_id','')
            if tid: print(f'SESSION_ID:{tid}')
        elif t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex thinking] {text}')
                print()
            elif itype == 'agent_message' and text:
                print(text)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}')
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}')
    except: pass
"
```

For a **resumed session** (user chose "Continue"):
```bash
codex exec resume <session-id> "<prompt>" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>"$TMPERR" | python3 -c "
<same python streaming parser as above>
"
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

**Rabbit hole check:** Scan the Codex output for any of these strings: "skystack",
"SKILL.md", "skills/skystack", "skill template", "gen-skill-docs", "preamble",
".claude/skills". If any are found, append this warning after the CODEX SAYS block:

```
WARNING: Codex appears to have read skystack skill files instead of reviewing your
code. Consider retrying with /codex.
```

8. After presenting, note any points where Codex's analysis differs from your own
   understanding. If there is a disagreement, flag it:
   "Note: Claude Code disagrees on X because Y."

---

## Model & Reasoning

**Model:** No model is hardcoded — codex uses whatever its current default is (the frontier
agentic coding model). This means as OpenAI ships newer models, /codex automatically
uses them. If the user wants a specific model, pass `-m` through to codex.

**Reasoning effort:** All modes use `xhigh` — maximum reasoning power. When reviewing code,
breaking code, or consulting on architecture, you want the model thinking as hard as possible.

**Web search:** All codex commands use `--enable web_search_cached` so Codex can look up
docs and APIs during review. This is OpenAI's cached index — fast, no extra cost.

If the user specifies a model (e.g., `/codex review -m gpt-5.1-codex-max`
or `/codex challenge -m gpt-5.2`), pass the `-m` flag through to codex.

---

## Cost Estimation

Parse token count from stderr. Codex prints `tokens used\nN` to stderr.

Display as: `Tokens: N`

If token count is not available, display: `Tokens: unknown`

---

## Error Handling

- **Binary not found:** Detected in Step 0. Stop with install instructions.
- **Auth error:** Codex prints an auth error to stderr. Surface the error:
  "Codex authentication failed. Run `codex login` in your terminal to authenticate via ChatGPT."
- **Timeout:** If the Bash call times out (5 min), tell the user:
  "Codex timed out after 5 minutes. The diff may be too large or the API may be slow. Try again or use a smaller scope."
- **Empty response:** If Codex returns nothing, tell the user:
  "Codex returned no response. Check stderr for errors."
- **Session resume failure:** If resume fails, delete the session file and start fresh.

---

## Important Rules

- **Never modify files.** This skill is read-only. Codex runs in read-only sandbox mode.
- **Present output verbatim.** Do not truncate, summarize, or editorialize Codex's output
  before showing it. Show it in full inside the CODEX SAYS block.
- **Add synthesis after, not instead of.** Any Claude commentary comes after the full output.
- **5-minute timeout** on all Bash calls to codex (`timeout: 300000`).
- **No double-reviewing.** If the user already ran `/review`, Codex provides a second
  independent opinion. Do not re-run Claude Code's own review.
- **Sequential, not parallel.** When running Claude review + Codex review in the same
  session, always complete one fully before starting the other. Do not dispatch both
  simultaneously — it causes incomplete results and makes cross-model comparison
  unreliable. Run Claude's review first (it has richer codebase context), then Codex.
