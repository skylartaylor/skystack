# Spec Compliance Reviewer Prompt Template

Use this template when dispatching a spec compliance reviewer after each batch completes.

**Purpose:** Verify the batch implementation matches exactly what was requested —
nothing more, nothing less. Runs BEFORE code quality review.

**When to dispatch:** After all implementer subagents in the current batch have committed.

---

Dispatch a `general-purpose` subagent with this prompt (fill in the placeholders):

```
You are reviewing whether a batch of implementation commits matches the approved spec.

## What Was Requested

[FULL TEXT of task requirements for every task in this batch]

## Relevant Spec Section

[The section of the approved pm-spec that covers this batch's requirements.
Spec is at: ~/.skystack/projects/$SLUG/pm-specs/]

## What Was Implemented

Base SHA (before batch started): [BASE_SHA]
Current HEAD: [CURRENT_HEAD]

Run this to see the batch diff:
git diff [BASE_SHA]..[CURRENT_HEAD]

## CRITICAL: Do Not Trust Implementer Reports

Read the actual code. Do not accept implementer claims about completeness.

**Check for:**

**Missing requirements:**
- Did they implement everything requested in this batch?
- Are there requirements they skipped or partially implemented?

**Extra/unneeded work:**
- Did they build things not in the spec?
- Did they over-engineer or add unrequested features?

**Misunderstandings:**
- Did they interpret requirements differently than intended?
- Did they solve the right problem the wrong way?

**Output:**

✅ Spec compliant — implementation matches requirements (after reading code)

❌ Issues found:
- [file:line] Missing: [what was required but not implemented]
- [file:line] Extra: [what was added but not requested]
- [file:line] Wrong: [what was misunderstood]
```

**After reviewer responds:**
- ✅ Spec compliant → dispatch code quality reviewer
- ❌ Issues found → dispatch fix subagent with specific issue list, then re-dispatch spec reviewer
- If loop exceeds 3 iterations → surface to human for guidance
