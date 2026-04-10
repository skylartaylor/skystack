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

(If this says "codex not available": skip all cross-model logic. Just pass through
the Claude /review findings with all items marked [SINGLE SOURCE: review].)

## Diff Context

Base SHA: [BASE_SHA]
Current HEAD: [CURRENT_HEAD]

You can run `git diff [BASE_SHA]..[CURRENT_HEAD]` to see the actual code if you
need to verify a finding.

## Your Task

1. **Deduplicate by location.** If both sources flag the same file:line (or clearly
   the same issue within 5 lines), merge into one finding. Keep the more specific
   description. Mark as [HIGH CONFIDENCE] — two independent models agree.

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

5. **Assess overall status:**
   - CLEAN: No findings from either source
   - HAS_FIXES: Only auto-fixable items found
   - HAS_CONCERNS: Items that need user attention exist

## Output Format

## Cross-Model Review Synthesis

### Auto-fixable
- [file:line] [issue] — [specific fix] [HIGH CONFIDENCE|SINGLE SOURCE: review|SINGLE SOURCE: codex]

### Surface to User
- [SEVERITY] [file:line] [issue] — [recommendation] [HIGH CONFIDENCE|SINGLE SOURCE: review|SINGLE SOURCE: codex]

### Assessment: CLEAN | HAS_FIXES | HAS_CONCERNS

If Assessment is HAS_CONCERNS, add:
### Recommendation
[One sentence: should the user review before publishing, or are the concerns minor enough to ship?]
```

---

## After synthesizer responds

Parse the Assessment line:

- **CLEAN:** Proceed to Phase 6 with clean recommendation (Publish).
- **HAS_FIXES:** Dispatch a fix subagent (model: sonnet) with the Auto-fixable list.
  After fixes commit, proceed to Phase 6 with clean recommendation.
- **HAS_CONCERNS:** Carry the "Surface to User" list into Phase 6. Shift the
  recommendation away from "Publish" toward "Review the code first." Include the
  synthesizer's Recommendation line in the Phase 6 summary.
