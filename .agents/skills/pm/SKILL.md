---
name: pm
description: |
  End-to-end feature workflow: research the problem, write the spec with user approval, plan TDD tasks, build task-by-task with commits, verify, and present for publish. Two checkpoints with the user (spec approval, publish decision); everything else runs autonomously. Use when the user says "PM this", "build feature X", "spec it out", or wants structured feature work instead of ad-hoc coding.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# PM

Idea → spec → build → ship. Two checkpoints with the user (spec approval and
publish decision). Everything else runs autonomously.

## When to use

- User says: "PM this", "build feature X", "let's add Y", "spec it out"
- A new feature or non-trivial change that needs structured thinking before code

## Phase 1: Discovery (autonomous)

Before writing any code, understand:

1. **Existing context.** Read `TODOS.md` if present. Look at recent commits
   in the relevant area (`git log --oneline -20` then narrow). Skim the 3-5
   files closest to where this feature would live.
2. **Codebase patterns.** What's the state management? Routing? Data layer?
   Match what's there — don't invent new patterns without a reason.
3. **Competitive research.** What do 2-3 similar apps do? Web search if useful.
   Capture: what users expect (baseline), what's clever (worth borrowing),
   what to avoid (anti-patterns seen in competitors).
4. **Edge cases inventory.** Empty state? One-item? 10,000-item? Offline?
   No permission? Make these explicit before building.

## Phase 2: Spec — first checkpoint

Output a written spec to chat, then ask the user for approval. Sections:

1. **Problem** — what user pain this solves, in plain language
2. **Solution** — what the user sees and does, step by step
3. **Design** — display patterns, components, key interactions, with rationale
4. **Architecture** — how this fits existing patterns; any concerns flagged
5. **Accessibility** — concrete checklist for the target stack (semantic HTML,
   ARIA labels, contrast, touch targets, screen reader)
6. **Edge cases** — explicit list, not "edge cases handled"
7. **Non-goals** — what this feature does NOT do (kills scope creep)

After the spec, ask the user: ready to build / adjust scope / rethink approach?
Wait for approval.

After approval, save the spec to `~/.skystack/projects/<slug>/pm-specs/<date>-<slug>.md`
so future `$qa` and design audits can verify against it.

## Phase 3: Plan

1. **File map.** List every file with one-line responsibility:
   ```
   Create: path/to/new_file.ts        # data model
   Modify: path/to/router.ts          # route registration
   Test:   path/to/new_file.test.ts   # validates X, Y, Z
   ```
   Keep files small and focused. If a file grows to do two things, split.

2. **Tasks (5-10 min each).** TDD order: failing test → minimum impl → run →
   edge cases → commit. One commit per task.

3. **Order matters.** Data models before services, services before
   controllers/views. Each commit must be independently valid (no broken
   imports, no references to code not yet written).

## Phase 4: Build (autonomous)

Execute task by task:
1. Write the failing test first. Run it. Confirm it fails with the expected error.
2. Implement minimum code to make it pass.
3. Handle edge cases from the spec.
4. Build accessibility in during implementation, not after.
5. Match existing codebase patterns exactly — no new architectural patterns.
6. Commit with a message describing what changed (not how).
7. Move to the next task.

Don't batch tasks into one commit. Don't refactor outside the task scope.

## Phase 5: Verify

Run the full test suite. If anything fails, fix before proceeding. Spot-check
accessibility on UI tasks. Run the type checker if the project has one.

## Phase 6: Cross-model review (optional)

If `$claude-review` is available, run it on the feature diff. Surface any
P1 findings to the user. Auto-fix obvious P2s; mention them.

## Phase 7: Present & Publish — second checkpoint

Show the user:
- What was built (one paragraph)
- Files changed (list)
- Tests added (count + what they cover)
- Any deviations from spec (and why)
- Remaining concerns from review

Ask: publish / review first / adjust. Default recommendation = publish if review
came back clean.

## Rules

- Two checkpoints with the user, no more. Spec approval and publish.
- Edge cases are part of the feature, not optional.
- Keep it simple. The best feature solves the user's problem with the least
  complexity. Research informs simplicity, not complexity.
- Show your research in the spec. "Linear does X, Notion does Y, I recommend Z
  because…" — gives the user confidence in the direction.
- Trust existing patterns. If the codebase uses Provider, don't introduce
  Riverpod. If it uses REST, don't add GraphQL.
