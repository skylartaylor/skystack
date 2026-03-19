# Plan Reviewer Prompt Template

Use this template when dispatching a plan document reviewer subagent after Phase 3.

**Purpose:** Verify the implementation plan is complete, matches the approved spec, has
sensible batch groupings, and is actionable without getting stuck.

**When to dispatch:** After writing all tasks and batch annotations in Phase 3.

---

Dispatch a `general-purpose` subagent with this prompt (fill in the placeholders):

```
You are reviewing an implementation plan before it goes to execution.

**Plan to review:** [PLAN_FILE_PATH]
**Approved spec:** [SPEC_FILE_PATH]

Read both files. Then check:

| Category | What to Look For |
|----------|-----------------|
| Completeness | TODOs, placeholders, missing steps, vague hand-waves |
| Spec alignment | Plan covers all spec requirements, no major scope creep |
| Task decomposition | Each task is a single logical unit, steps are actionable |
| Batch groupings | Batch boundaries are defensible — solo batches for risky/complex tasks, grouped for small independent ones |
| Buildability | Could an engineer follow this plan without getting stuck? |

**Calibration:** Only flag issues that would cause real problems during implementation.
Approve unless there are serious gaps — missing requirements, contradictory steps,
placeholder content, tasks too vague to act on, or batch groupings that would hide
spec drift until it's expensive to fix.

**Output:**

## Plan Review

**Status:** Approved | Issues Found

**Issues (if any):**
- [Task N, Step Y]: [specific issue] — [why it matters for implementation]

**Recommendations (advisory, do not block approval):**
- [suggestions that don't block]
```

**After reviewer responds:**
- ✅ Approved → proceed to execution handoff
- ❌ Issues Found → fix the issues in the plan, re-dispatch this reviewer
- If loop exceeds 3 iterations → surface to human for guidance
