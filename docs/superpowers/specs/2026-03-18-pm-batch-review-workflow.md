# /pm Batch Review Workflow — Design Spec

**Date:** 2026-03-18
**Status:** Approved

---

## Problem

`/pm`'s Build phase dispatches subagent implementers but has no quality gates between
implementation and self-review. Spec drift (building the wrong thing) and code quality
issues are only caught at the end in Phase 5's self-review, which is the main agent
reviewing its own work — not independent, and too late to be cheap.

Similarly, the Plan phase produces a plan document with no external review — a flawed
plan propagates errors into every task.

---

## Proposed Solution

Introduce three review layers, inlined into `/pm`'s existing plan and build phases:

1. **Plan-document review** (Phase 3): after writing the plan, a reviewer subagent
   checks completeness, spec alignment, and defensibility of the batch groupings.

2. **Batch-based review** (Phase 4): tasks are grouped into review batches during
   planning. After each batch completes, a spec compliance reviewer and a code quality
   reviewer check the batch diff independently.

3. **Lightweight Phase 5**: since batches are already reviewed, Phase 5 becomes a
   test-suite run + accessibility spot-check only — no full code review.

---

## Review Batch Design

### Core principle

Review granularity is a **planning decision**, not a runtime rule. The planner determines
batch boundaries during Phase 3 based on task signals. Tasks are labelled `[BATCH N]`
in the plan, with a one-line rationale per batch.

### Batch-alone signals (task gets its own review batch)

- Touches auth, payments, security, or data migrations
- Modifies 4+ files or contains complex/branching logic
- Other tasks depend on its output (shared interfaces, shared state, exported types)

### Small batch signals (2–4 tasks share one review)

- Related changes in the same module with no shared files between tasks
- Sequential steps toward one cohesive feature (e.g. model → service → view)
- Medium complexity, no cross-task overlap

### Large batch / single end review

- Cosmetic changes, copy edits, config tweaks
- Test additions for already-implemented behavior
- Boilerplate and scaffolding

### Batch rationale requirement

Every batch boundary in the plan must include a one-line rationale:

```
**BATCH 1** (solo — touches shared auth state)
**BATCH 2** (grouped — 3 independent widget files, same module)
**BATCH 3** (end — cosmetic copy changes)
```

---

## Phase 3 Changes (Plan)

After writing tasks and grouping into batches:

1. Dispatch `plan-document-reviewer` subagent with:
   - Path to plan document
   - Path to approved spec
2. If issues found: fix and re-dispatch (max 3 iterations, then surface to human)
3. If approved: proceed to execution handoff

Reviewer validates:
- Plan completeness (no TODOs, no placeholders)
- Spec alignment (all requirements covered, no scope creep)
- Task decomposition (steps are actionable, not vague)
- Batch groupings are defensible given the signals above

Prompt template: `pm/plan-reviewer-prompt.md`

---

## Phase 4 Changes (Build)

Loop over **batches** rather than individual tasks:

```
For each batch:
  1. Dispatch implementer subagents for all tasks in batch
     - Independent tasks within the batch: parallel dispatch
     - Dependent tasks within the batch: sequential dispatch
  2. Spec compliance review for the batch diff
     - "Does this batch implement exactly what was asked — nothing more, nothing less?"
     - Fix loop: implementer fixes → re-review until ✅ (max 3 iterations, then surface to human)
  3. Code quality review for the batch diff (only after spec passes)
     - "Is this implementation well-built, testable, and consistent with codebase patterns?"
     - Fix loop: implementer fixes → re-review until ✅ (max 3 iterations, then surface to human)
  4. Mark batch complete → next batch
```

Prompt templates:
- `pm/spec-reviewer-prompt.md`
- `pm/code-quality-reviewer-prompt.md`

### Reviewer context (what to provide)

**Spec compliance reviewer:**
- Full task text for each task in the batch
- Approved spec section relevant to this batch
- Git diff for the batch (base SHA before batch started → current HEAD)
- Instruction: "Read the actual code. Do not trust the implementer's report."

**Code quality reviewer:**
- Dispatched as a `general-purpose` subagent using `pm/code-quality-reviewer-prompt.md`
- Batch diff (base SHA → HEAD)
- Codebase patterns from Phase 1b
- Task requirements for context

---

## Phase 5 Changes (Self-Review)

Reduced scope since batch reviews already covered spec compliance and code quality:

1. Run full test suite — confirm all tests pass
2. Spot-check accessibility attributes on any UI-touching tasks
3. Confirm no broken imports or missing references

No full code review in Phase 5. That responsibility has moved to the batch review loop.

---

## Prompt Template Files

Three new files added to `/pm/`:

| File | Purpose |
|------|---------|
| `pm/plan-reviewer-prompt.md` | Dispatched after Phase 3 to review plan document |
| `pm/spec-reviewer-prompt.md` | Dispatched after each batch to check spec compliance |
| `pm/code-quality-reviewer-prompt.md` | Dispatched after spec passes to check code quality |

All three are skystack-native prompt files — no superpowers dependency. Adapted from
the superpowers equivalents with skystack-specific calibration:
- Batch-aware context (diff scope = batch, not single task)
- References to the pm-spec artifact for compliance checks
- Calibration notes tuned to skystack's YAGNI/DRY/TDD principles

---

## Superpowers Mining (parallel, not blocking)

This is a separate sweep that happens alongside writing the implementation plan —
not a gate before Phase 4 implementation. Read these superpowers skills and
cherry-pick any patterns skystack's existing skills don't already cover:

- `finishing-a-development-branch` → gaps in `/publish`?
- `verification-before-completion` → gaps in how `/pm` confirms work before presenting?
- `systematic-debugging` → anything `/review` misses?

Apply findings as targeted additions to the relevant skill templates. Not a port —
cherry-pick only what adds value.

---

## Non-Goals

- Porting superpowers brainstorming, TDD enforcement, or worktree management to skystack
  (skystack has its own equivalents)
- Adding review gates to skills other than `/pm` (those can be separate efforts)
- Per-task reviews as a rigid rule (batch sizing is always a planning judgment)
