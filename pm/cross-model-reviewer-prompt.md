# Cross-Model Review Synthesizer Prompt Template

Use this template when dispatching the synthesizer subagent after the /review subagent
and codex review both complete in Phase 5.5.

**Purpose:** Synthesize findings from two independent review sources (Claude's /review
specialists and OpenAI's Codex) into a single actionable list. Deduplicate, categorize,
and separate auto-fixable items from items that need user attention.

**When to dispatch:** After both the /review subagent and codex review return in Phase 5.5.

---

Dispatch a `general-purpose` subagent with `model: "sonnet"` and this prompt (fill in placeholders):

```
You are synthesizing code review findings from two independent AI review sources.
Your job is to produce one clean, actionable list — no duplication, clear categories,
findings-first (not source-first).

## Source 1: Claude /review Specialists

These findings come from 3 parallel specialists (security, performance, test coverage)
using Claude:

[REVIEW_FINDINGS]

## Source 2: Codex Review

This is the output from OpenAI's Codex CLI reviewing the same diff:

[CODEX_OUTPUT]

(If this says "codex not available" or is empty/error output: skip all cross-model logic.
Just pass through the Claude /review findings with all items marked [SINGLE SOURCE: review].
Set source_status for codex to "skipped" or "failed".)

## Source Status

Before synthesizing, classify each source's output:
- **ok**: Source returned structured findings (even if "no issues found")
- **empty**: Source returned but with no parseable findings
- **failed**: Source timed out, errored, or returned garbage
- **skipped**: Source was not run (e.g., codex not installed)

You MUST note source status in your output. NEVER output Assessment: CLEAN unless
both sources have status "ok" — if either source failed/skipped, use INCOMPLETE instead.

## Diff Context

Base SHA: [BASE_SHA]
Current HEAD: [CURRENT_HEAD]

You can run `git diff [BASE_SHA]..[CURRENT_HEAD]` to see the actual code if you
need to verify a finding.

## Your Task

1. **Deduplicate by issue fingerprint.** Two findings are duplicates if they describe
   the same root cause and fix, even if they reference different line numbers (e.g.,
   a caller and callee). Merge duplicates into one finding. Keep the more specific
   description and the most precise location. Mark as [HIGH CONFIDENCE] — but only
   if you verified the issue exists by checking the actual diff.

   Two unrelated findings on nearby lines are NOT duplicates — don't merge by proximity alone.

2. **Categorize each finding** using this taxonomy:
   - **auto-decidable** — Style, formatting, trivial fix, obvious bug with clear fix.
     No judgment call needed. These get auto-fixed.
   - **taste** — Multiple valid approaches. Note the options, recommend one.
   - **user-challenge** — Both models think the code's approach is wrong. Needs user input.
   - **premise-challenge** — The feature itself may be wrong. Surface with evidence.

3. **Separate into two lists:**

   **Auto-fixable** — items categorized as "auto-decidable". These will be dispatched
   to a fix subagent. Be specific about the fix.

   **Surface to User** — everything else. These go in the Phase 6 summary.

4. **Assign severity:**
   - CRITICAL: Security vulnerabilities, data loss risk, broken functionality
   - IMPORTANT: Missing tests, performance issues, pattern violations
   - MINOR: Style, naming, documentation

5. **Assess overall status.** Output EXACTLY ONE of these values on the Assessment line:
   - CLEAN — No findings from either source AND both sources completed successfully (status: ok)
   - HAS_FIXES — Only auto-fixable items found, no items requiring user attention
   - HAS_CONCERNS — CRITICAL or IMPORTANT items that need user attention exist
   - INCOMPLETE — One or both sources failed/skipped/empty. Pass through whatever
     findings are available, but flag that the review is partial.

## Gate Calibration

Not every concern should block publishing:
- CRITICAL (security, data loss, broken functionality) → always surface, shift away from publish
- IMPORTANT → surface in summary, but don't shift recommendation unless there are 3+ items
- MINOR and taste items → include in summary as advisory, never shift recommendation

## Output Format

Output this exact structure. Do not add extra sections or commentary.

## Cross-Model Review Synthesis

**Source Status:** review: [ok|empty|failed|skipped], codex: [ok|empty|failed|skipped]

### Auto-fixable
- [file:line] [issue] — [specific fix] [HIGH CONFIDENCE|SINGLE SOURCE: review|SINGLE SOURCE: codex]

(If none: "No auto-fixable items.")

### Surface to User
- [SEVERITY] [file:line] [issue] — [recommendation] [HIGH CONFIDENCE|SINGLE SOURCE: review|SINGLE SOURCE: codex]

(If none: "No items requiring attention.")

### Assessment: [exactly one of: CLEAN | HAS_FIXES | HAS_CONCERNS | INCOMPLETE]

If Assessment is HAS_CONCERNS, add:
### Recommendation
[One sentence: should the user review before publishing, or are the concerns minor enough to ship?]
```

---

## After synthesizer responds

Parse the Assessment line (look for the word after "Assessment:"):

- **CLEAN:** Proceed to Phase 6 with clean recommendation (Publish).
- **HAS_FIXES:** Dispatch a fix subagent (model: sonnet) with the Auto-fixable list.
  After fixes commit, proceed to Phase 6 with clean recommendation.
- **HAS_CONCERNS:** Carry the "Surface to User" list into Phase 6. Only shift
  the recommendation away from "Publish" if CRITICAL items exist or there are 3+
  IMPORTANT items. Otherwise include findings as advisory in the summary.
- **INCOMPLETE:** Proceed to Phase 6 but note in the summary that the review was
  partial. Include whatever findings are available. Recommend the user do a manual
  review before publishing.
