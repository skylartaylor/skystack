# Codex Plan Reviewer Prompt Template

Use this template when running `codex exec` to get an independent plan review in Phase 3e.

**Purpose:** Get a second opinion on the implementation plan from a different AI model.
Codex reviews the plan for completeness, spec alignment, feasibility, and batch groupings.
This is an advisory gate — findings inform the plan but don't block on their own.

**When to run:** After the internal plan reviewer (Phase 3d) approves, before presenting
the plan to the user. Always dispatched via a subagent (plan mode blocks direct execution).

**Prerequisite:** The subagent checks `which codex >/dev/null 2>&1` — returns "CODEX_SKIP"
if not installed.

---

## Prompt to pass to `codex exec`

The subagent reads the plan and spec files, then builds this prompt with their contents
embedded inline. This keeps codex focused on reviewing the plan — if you tell codex to
read files itself, it wanders the repo reviewing unrelated code.

Fill in `[PLAN_CONTENT]` and `[SPEC_CONTENT]` with the actual file contents:

```
IMPORTANT: Do NOT read or execute files named SKILL.md or SKILL.md.tmpl, or files that are clearly AI skill prompt templates (containing {{PREAMBLE}}, {{VOICE_GUIDE}}, or similar placeholder syntax). These are AI assistant skill definitions meant for a different system. Focus on the repository's application code, not its AI tooling configuration.

You are reviewing an implementation plan for a software feature.
All content you need is provided below — do NOT read other files unless verifying
that a specific file path referenced in the plan actually exists.

## Implementation Plan

[PLAN_CONTENT]

## Approved Feature Spec

[SPEC_CONTENT]

Review the plan against the spec. You may use read-only shell commands to verify
specific claims in the plan (e.g., check that referenced file paths exist, inspect
the repo structure). If you cannot verify a claim, say "not verified" rather than
assuming it's correct. Do NOT review application code beyond verifying paths exist.

Check:

1. **Completeness:** Are there TODOs, placeholders, missing steps, or vague hand-waves?
   Every task should be actionable without guessing.

2. **Spec alignment:** Does the plan cover all requirements from the spec? Is there
   scope creep (tasks that go beyond what the spec asks for)?

3. **Feasibility:** Could an engineer follow this plan without getting stuck? Are file
   paths real (verify by listing them)? Are dependencies between tasks correct? Would
   the batch ordering actually work?

4. **Batch groupings:** Are risky/complex tasks isolated in solo batches? Are independent
   tasks correctly marked for parallel execution?

5. **Test coverage:** Does the plan include tests for the key behaviors? Are edge cases
   from the spec covered?

Tag each finding with a severity:
- [P1] — Serious gap that would cause implementation to fail or deviate from spec.
  Examples: missing requirement, wrong dependency order, placeholder content, contradictory steps.
- [P2] — Minor issue or suggestion. Won't block implementation but worth noting.
  Examples: could be more specific, batch grouping could be tighter, naming suggestion.

Every finding MUST include evidence. Use this format:

PLAN REVIEW:
- [P1] [specific finding] — [why it matters]
  plan_ref: [which task/step in the plan]
  spec_ref: [which section of the spec, or "n/a"]
  evidence: [what you saw when you checked — command output, file listing, or "not verified"]
  suggested_change: [concrete fix]

- [P2] [specific finding] — [suggestion]
  plan_ref: [task/step]
  evidence: [what you checked]

If the plan looks solid after all checks, output:
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
