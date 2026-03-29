# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer after spec compliance passes.

**Purpose:** Verify the batch implementation is well-built — clean, tested, maintainable,
consistent with codebase patterns. Runs AFTER spec compliance review passes.

**When to dispatch:** After spec compliance reviewer returns ✅ for this batch.

---

Dispatch a `general-purpose` subagent with this prompt (fill in the placeholders):

```
You are reviewing the code quality of a batch of implementation commits.

Spec compliance has already been verified — the implementation does the right thing.
Your job is to check whether it does it well.

## What Was Implemented

[Summary from implementer subagents — what they built]

## Batch Diff

Base SHA (before batch started): [BASE_SHA]
Current HEAD: [CURRENT_HEAD]

Run this to see the batch diff:
git diff [BASE_SHA]..[CURRENT_HEAD]

## Review Criteria

Read the review checklist from skystack's /review skill:
- Check: ~/.claude/skills/skystack/review/checklist.md
- Fallback: .claude/skills/skystack/review/checklist.md
- If neither path exists: apply general clean-code judgment (YAGNI, DRY, single responsibility)

Apply the checklist to the batch diff. Also check:
- Does each file have one clear responsibility?
- Are units decomposed so they can be understood and tested independently?
- Is the implementation following the file structure from the plan?
- Did this batch create files that are already large, or significantly grow existing files?
  (Don't flag pre-existing file sizes — focus on what this batch contributed.)

Note: this reviewer uses CRITICAL/IMPORTANT/MINOR severity labels (not Missing/Extra/Wrong)
— it's checking code quality, not spec compliance.

## Gating Rules

HARD FAIL — any of these = ❌ regardless of other quality:
- **Test coverage:** ANY new conditional with only happy-path test
- **Pattern consistency:** New architectural pattern introduced without justification
- **Security:** ANY OWASP top 5 finding (injection, broken auth, XSS, SSRF, misconfig)
- **Build health:** Code doesn't compile/type-check clean

SOFT FLAG — note these but don't fail the batch:
- Naming conventions
- Performance optimizations not in hot paths
- Documentation completeness

When reporting, explicitly state which gate triggered:
"❌ FAIL — Hard gate: [category]. [specific violation]."

## Output

**Strengths:** [What's done well]

**Issues:**
- CRITICAL: [file:line] [issue] — [fix]
- IMPORTANT: [file:line] [issue] — [fix]
- MINOR: [file:line] [issue] — [suggestion]

**Assessment:** Approved | Changes Required

If Changes Required: list exactly what must be fixed before this batch is done.
```

**After reviewer responds:**
- ✅ Approved → mark batch complete, proceed to next batch
- ❌ Changes Required → dispatch fix subagent with specific issue list, re-dispatch code quality reviewer
- If loop exceeds 3 iterations → surface to human for guidance
