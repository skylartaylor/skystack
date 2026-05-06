---
name: diagnose
description: |
  Systematic debugging with strict root-cause discipline. Five phases: investigate, pattern-match, hypothesize, fix, verify. Iron Law: no fixes without confirmed root cause. Use when the user says "debug", "diagnose", "fix this bug", "figure out why X is broken", "something is wrong with", or describes a symptom they don't understand yet.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# Diagnose

Systematic debugging. Find root cause, then fix.

## Iron law

**NO FIXES WITHOUT CONFIRMED ROOT CAUSE.**

Fixing symptoms creates whack-a-mole. Every fix that doesn't address root cause
makes the next bug harder to find. Trace it, prove it, then fix it.

## Phase 1: Investigate

Gather context before forming any hypothesis.

1. **Collect symptoms.** Read error messages, stack traces, repro steps. If
   the user hasn't given enough context, ask ONE question at a time.
2. **Read the code.** Trace from symptom back toward potential causes. Use
   `grep` for references, read source for logic.
3. **Check recent changes:**
   ```bash
   git log --oneline -20 -- <affected-files>
   ```
   Was this working before? A regression means the cause is in the diff.
4. **Reproduce.** Can you trigger the bug deterministically? If not, gather
   more evidence before proceeding — don't theorize on a single observation.

Output: **"Root cause hypothesis: …"** — a specific, testable claim about
what is wrong and why.

## Phase 2: Pattern match

Check if this matches a known shape:

| Pattern | Signature | Where to look |
|---------|-----------|---------------|
| Race condition | Intermittent, timing-dependent | Concurrent access to shared state |
| Nil/null propagation | NoMethodError, TypeError | Missing guards on optional values |
| State corruption | Inconsistent data, partial updates | Transactions, callbacks, hooks |
| Integration failure | Timeout, unexpected response | External API calls, service boundaries |
| Config drift | Works locally, fails in staging/prod | Env vars, feature flags, DB state |
| Stale cache | Shows old data, fixes on cache clear | Redis, CDN, browser cache |

Also check:
- `TODOS.md` for related known issues
- `git log` for prior fixes in the same area — **recurring bugs in the same
  files are an architectural smell**, not coincidence

If the bug doesn't fit a known pattern, search the web for
"{framework} {generic error type}" — but **sanitize first**: strip hostnames,
IPs, file paths, SQL fragments, customer data. Search the category, not the
raw message.

**Scope advisory.** Identify the narrowest directory containing affected
files. Tell the user: "Focusing edits on `<dir>/`." Avoid touching files
outside that scope unless the root cause genuinely spans modules.

## Phase 3: Test the hypothesis

Before writing ANY fix, verify the hypothesis.

1. **Confirm.** Add a temporary log line, assertion, or debug print at the
   suspected root cause. Run the repro. Does the evidence match?
2. **If wrong:** sanitize the error, search if useful, then return to Phase 1.
   Don't guess. Gather more evidence.
3. **3-strike rule.** If 3 hypotheses fail, STOP. Tell the user:
   "I've tested 3 hypotheses, none match. This may be architectural rather
   than a simple bug. Options: A) keep investigating with hypothesis #4,
   B) add logging and catch it next time, C) escalate / fresh eyes."

**Red flags** — slow down if you see any of these:
- "Quick fix for now" — there is no "for now." Fix it right or escalate.
- Proposing a fix before tracing data flow — you're guessing.
- Each fix reveals a new problem elsewhere — wrong layer, not wrong code.

## Phase 4: Fix

Once root cause is confirmed:

1. **Fix the root cause, not the symptom.** The smallest change that
   eliminates the actual problem.
2. **Minimal diff.** Fewest files, fewest lines. Resist refactoring adjacent
   code "while you're in there."
3. **Write a regression test** that fails without the fix and passes with
   it — proves the test is meaningful AND the fix works.
4. **Run the full test suite.** No regressions allowed.
5. **If the fix touches >5 files**, ask the user first:
   "This touches N files — large blast radius for a bug fix. Proceed / split
   / rethink?"

## Phase 5: Verify and report

Reproduce the original bug scenario and confirm it's fixed. Not optional —
"should be fixed" without verification ships bugs.

Output a structured debug report:

```
DEBUG REPORT
══════════════════════════════════════════════
Symptom:          <what you observed>
Root cause:       <what was actually wrong>
Fix:              <what changed, with file:line refs>
Evidence:         <test output / repro showing fix works>
Regression test:  <file:line of the new test>
Related:          <TODOS items, prior bugs in same area, arch notes>
Status:           DONE | DONE_WITH_CONCERNS | BLOCKED
══════════════════════════════════════════════
```

Status meanings:
- **DONE** — root cause confirmed, fix verified, regression test added
- **DONE_WITH_CONCERNS** — fixed but couldn't fully verify (intermittent,
  needs staging env, etc.)
- **BLOCKED** — root cause unclear after investigation. Escalate, don't guess.

## Rules

- No fix without confirmed root cause. Guessing wastes time.
- 3+ failed hypotheses → question the architecture, not the code.
- Never say "this should fix it." Verify and prove it.
- Fix touches >5 files → ask first.
- If you can't reproduce, don't ship.
