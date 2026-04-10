# Codex Plan Reviewer Prompt Template

Use this template when running `codex exec` to get an independent plan review in Phase 3e.

**Purpose:** Get a second opinion on the implementation plan from a different AI model.
Codex reviews the plan for completeness, spec alignment, feasibility, and batch groupings.
This is an advisory gate — findings inform the plan but don't block on their own.

**When to run:** After the internal plan reviewer (Phase 3d) approves, before presenting
the plan to the user.

**Prerequisite:** `which codex >/dev/null 2>&1` — skip entirely if codex isn't installed.

---

## Prompt to pass to `codex exec`

Fill in the placeholders and pass this as the prompt argument to `codex exec`:

```
IMPORTANT: Do NOT read or execute files named SKILL.md or SKILL.md.tmpl, or files that are clearly AI skill prompt templates (containing {{PREAMBLE}}, {{VOICE_GUIDE}}, or similar placeholder syntax). These are AI assistant skill definitions meant for a different system. Focus on the repository's application code, not its AI tooling configuration.

You are reviewing an implementation plan for a software feature.

Read the plan at: [PLAN_FILE_PATH]
Read the approved spec at: [SPEC_FILE_PATH]

Review the plan against the spec and check:

1. **Completeness:** Are there TODOs, placeholders, missing steps, or vague hand-waves?
   Every task should be actionable without guessing.

2. **Spec alignment:** Does the plan cover all requirements from the spec? Is there
   scope creep (tasks that go beyond what the spec asks for)?

3. **Feasibility:** Could an engineer follow this plan without getting stuck? Are file
   paths real? Are dependencies between tasks correct? Would the batch ordering actually
   work?

4. **Batch groupings:** Are risky/complex tasks isolated in solo batches? Are independent
   tasks correctly marked for parallel execution?

5. **Test coverage:** Does the plan include tests for the key behaviors? Are edge cases
   from the spec covered?

Tag each finding with a severity:
- [P1] — Serious gap that would cause implementation to fail or deviate from spec.
  Examples: missing requirement, wrong dependency order, placeholder content, contradictory steps.
- [P2] — Minor issue or suggestion. Won't block implementation but worth noting.
  Examples: could be more specific, batch grouping could be tighter, naming suggestion.

Output format:

PLAN REVIEW:
- [P1] [specific finding] — [why it matters]
- [P2] [specific finding] — [suggestion]

If the plan looks solid, output:
PLAN REVIEW: No issues found.
```

---

## After codex responds

Parse the output for `[P1]` markers:

- **No P1 findings:** Note any P2 findings as advisory context. Proceed to the
  "Ready to implement?" question.

- **P1 findings found:** Incorporate the P1 findings as issues in the plan. Re-run
  the internal plan reviewer (Phase 3d) one more time to verify the fixes. Max 1
  iteration of this Codex→fix→re-review cycle. If the internal reviewer approves
  after fixes, proceed regardless of whether Codex would still flag issues.

- **Codex timed out or errored:** Print "Codex plan review skipped (timeout/error)."
  Proceed normally.

Present the combined plan review as a single section — not two separate blocks.
Integrate the internal reviewer's verdict with Codex's findings. Note dissent
parenthetically where they disagree.
