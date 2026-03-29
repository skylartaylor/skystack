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

## AI Slop Check (UI batches only)

If this batch created or modified UI files (components, views, templates, CSS),
check for these AI slop patterns:

**Instant FAIL patterns:**
- Purple/blue gradient backgrounds with white card overlays
- Hero sections with vague inspirational copy ("Unlock the power of...",
  "Transform your workflow...")
- Generic card grids with rounded corners and subtle shadows as the
  primary layout pattern
- Stock illustration placeholder aesthetic (blob shapes, abstract geometry)

**Warning patterns (flag, don't fail):**
- Using component library defaults without customization
- Spacing/padding that looks like framework defaults (e.g., p-4 everywhere)
- Color palette that matches a popular template or starter kit
- Typography that's the framework default (Inter for everything)

**What to look for instead:**
- Evidence of deliberate creative choices (custom color palette, intentional
  type scale, layout that serves the content)
- Consistency with DESIGN.md if it exists
- UI that looks like it was designed for THIS app, not any app

Skip this check entirely if the batch is backend-only (no UI files).

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
