# skystack development

## Commands

```bash
bun install          # install dependencies
bun test             # run free tests (browse + snapshot + skill validation)
bun run test:evals   # run paid evals: LLM judge + E2E (diff-based)
bun run test:evals:all  # run ALL paid evals regardless of diff
bun run test:e2e     # run E2E tests only (diff-based)
bun run test:e2e:all # run ALL E2E tests regardless of diff
bun run eval:select  # show which tests would run based on current diff
bun run dev <cmd>    # run CLI in dev mode, e.g. bun run dev goto https://example.com
bun run build        # gen docs + compile binaries
bun run gen:skill-docs  # regenerate SKILL.md files from templates
bun run gen:codex-skills # regenerate Codex-native skills in .agents/skills
bun run skill:check  # health dashboard for all skills
bun run dev:skill    # watch mode: auto-regen + validate on change
bun run eval:list    # list all eval runs from ~/.skystack-dev/evals/
bun run eval:compare # compare two eval runs (auto-picks most recent)
bun run eval:summary # aggregate stats across all eval runs
```

The LLM judge in `test:evals` requires `ANTHROPIC_API_KEY`. Agent E2E tests use
the selected Claude Code or Codex CLI authentication, stream tool progress, and
persist results to `~/.skystack-dev/evals/`.

**Diff-based test selection:** `test:evals` and `test:e2e` auto-select tests based
on `git diff` against the base branch. Each test declares its file dependencies in
`test/helpers/touchfiles.ts`. Changes to global runner, store, judge, catalog, or
generator files trigger all tests. Use `EVALS_ALL=1` or the `:all` variants to
force all tests. Run `eval:select` to preview the selection.

## Project structure

```
skystack/
├── browse/          # Headless browser CLI (Playwright)
│   ├── src/         # CLI + server + commands
│   │   ├── commands.ts  # Command registry (single source of truth)
│   │   └── snapshot.ts  # SNAPSHOT_FLAGS metadata array
│   ├── test/        # Integration tests + fixtures
│   └── dist/        # Compiled binary
├── scripts/         # Build + DX tooling
│   ├── skill-catalog.ts   # canonical Claude/Codex product inventory
│   ├── gen-skill-docs.ts  # Template → SKILL.md generator
│   ├── gen-codex-skills.ts # Codex-native generator
│   ├── skill-check.ts     # Health dashboard
│   └── dev-skill.ts       # Watch mode
├── test/            # Skill validation + eval tests
│   ├── helpers/     # provider runners, judge, touchfiles, eval store
│   ├── fixtures/    # Ground truth JSON, planted-bug fixtures, eval baselines
│   ├── skill-validation.test.ts  # Tier 1: static validation (free, <1s)
│   ├── gen-skill-docs.test.ts    # Tier 1: generator quality (free, <1s)
│   ├── skill-llm-eval.test.ts   # Tier 3: paid LLM-as-judge
│   └── skill-e2e.test.ts         # Tier 2: isolated agent E2E scenarios
├── .agents/skills/  # generated Codex-native skill folders
├── mobile/          # native app driver CLI
├── pm/              # /pm skill (idea → shipped feature, orchestrates crew)
├── design/          # /design skill (design consultation + review)
├── review/          # /review skill (dev code review + architecture review)
├── qa/              # /qa skill (browser testing + bug fixes)
├── publish/         # /publish skill (publish workflow)
├── codex/           # /codex skill (multi-AI second opinion via OpenAI Codex)
├── retro/           # /retro skill (retrospective)
├── research/        # /research skill (update reference files)
├── diagnose/        # /diagnose skill (systematic root-cause debugging)
├── security/        # /security skill (evidence-driven security audit)
├── benchmark/       # /benchmark skill (performance regression detection)
├── devops/          # /devops skill (safe infrastructure management + incident tracking)
├── docs/            # documentation (skills.md, architecture guides)
├── document-release/ # /document-release skill (post-ship doc updates)
├── skystack-upgrade/ # /skystack-upgrade skill
├── setup            # Claude setup: build binaries + symlink skills
├── setup-codex      # Codex setup: generate, build, and link skills
├── SKILL.md         # Generated from SKILL.md.tmpl (don't edit directly)
├── SKILL.md.tmpl    # Template: edit this, run gen:skill-docs
└── package.json     # Build scripts for browse
```

## SKILL.md workflow

Claude SKILL.md files are generated from `.tmpl` templates:

1. Edit the `.tmpl` file (e.g. `SKILL.md.tmpl` or `browse/SKILL.md.tmpl`)
2. Run `bun run gen:skill-docs` (or `bun run build` which does it automatically)
3. Commit both the `.tmpl` and generated `.md` files

Codex skills are separately authored in `scripts/gen-codex-skills.ts`. Run
`bun run gen:codex-skills` and commit the source plus `.agents/skills/` output.
Add or remove product skills through `scripts/skill-catalog.ts`; generators,
tests, health checks, and watch mode consume that catalog.

To add a new browse command: add it to `browse/src/commands.ts` and rebuild.
To add a snapshot flag: add it to `SNAPSHOT_FLAGS` in `browse/src/snapshot.ts` and rebuild.

### Placeholders used by current templates

| Placeholder | Resolved by | Used in |
|-------------|------------|---------|
| `{{BROWSE_SETUP}}` | `generateBrowseSetup()` | Skills using the browse binary |
| `{{MOBILE_SETUP}}` | `generateMobileSetup()` | Native mobile QA |
| `{{BASE_BRANCH_DETECT}}` | `generateBaseBranchDetect()` | Diff-targeting workflows |
| `{{STACK_DETECT}}` | `generateStackDetect()` | Workflows that need stack discovery |
| `{{TASTE_MEMORY}}` | `generateTasteMemory()` | Design preference context |
| `{{LEARNINGS_SEARCH}}` / `{{LEARNINGS_LOG}}` | generator helpers | Stateful workflows that explicitly need project learnings |
| `{{PREAMBLE}}` / `{{VOICE_GUIDE}}` | generator helpers | Compatibility context for templates that still request it |

## Writing SKILL templates

Claude `SKILL.md.tmpl` files are prompt templates, not bash scripts. Codex skills
are authored separately rather than mechanically translating Claude prompts.
Each bash code block runs in a separate shell, so variables do not persist
between blocks.

Rules:
- **Start lean.** Assume the model knows general engineering practice. Keep only
  repository-specific workflow, safety, tool, and output requirements.
- **Use progressive disclosure.** The root skill routes; capability skills own
  their workflows; detailed command discovery belongs in `$B --help` or a
  narrowly loaded reference.
- **Use natural language for logic and state.** Don't use shell variables to pass
  state between code blocks. Instead, tell Claude what to remember and reference
  it in prose (e.g., "the base branch detected in Step 0").
- **Don't hardcode branch names.** Detect `main`/`master`/etc dynamically via
  `gh pr view` or `gh repo view`. Use `{{BASE_BRANCH_DETECT}}` for PR-targeting
  skills. Use "the base branch" in prose, `<base>` in code block placeholders.
- **Keep bash blocks self-contained.** Each code block should work independently.
  If a block needs context from a previous step, restate it in the prose above.
- **Express conditionals as English.** Instead of nested `if/elif/else` in bash,
  write numbered decision steps: "1. If X, do Y. 2. Otherwise, do Z."
- **Test outcomes, not prompt wording.** Static marker tests are appropriate for
  hard safety contracts; behavioral evals should measure completed actions,
  evidence, regressions, and unnecessary approval stops.

## Browser interaction

When you need to interact with a browser (QA, dogfooding, cookie setup), use the
`/browse` skill or run the browse binary directly via `$B <command>`. NEVER use
`mcp__claude-in-chrome__*` tools — they are slow, unreliable, and not what this
project uses.

## Vendored symlink awareness

When developing skystack, project-local entries under `.claude/skills/` may
symlink back to this working directory (gitignored). This means generated Claude
skill changes are **live immediately** —
great for rapid iteration, risky during big refactors where half-written skills
could break other Claude Code sessions using skystack concurrently.

**Check once per session:** Run `ls -la .claude/skills` and resolve the skystack
and individual skill links. If they point to your working directory:
- Template changes + `bun run gen:skill-docs` immediately affect all skystack invocations
- Breaking changes to SKILL.md.tmpl files can break concurrent skystack sessions
- During large refactors, use a separate worktree or tear down dev mode so the
  global install is used instead

**For plan reviews:** When reviewing plans that modify skill templates or the
gen-skill-docs pipeline, consider whether the changes should be tested in isolation
before going live (especially if the user is actively using skystack in other windows).

## Commit style

**Always bisect commits.** Every commit should be a single logical change. When
you've made multiple changes (e.g., a rename + a rewrite + new tests), split them
into separate commits before pushing. Each commit should be independently
understandable and revertable.

Examples of good bisection:
- Rename/move separate from behavior changes
- Test infrastructure (touchfiles, helpers) separate from test implementations
- Template changes separate from generated file regeneration
- Mechanical refactors separate from new features

When the user says "bisect commit" or "bisect and push," split staged/unstaged
changes into logical commits and push.

## Subagent and worktree patterns

Use subagents when independent work benefits from parallelism or context
isolation. Do not require fan-out as ceremony.

**When to use subagents:**
- Independent parallel work across distinct domains or file ownership
- Protecting the main context from large research or implementation traces
- Structured output (subagent returns findings in a specific format, main skill synthesizes)

**When to use `isolation: "worktree"`:**
- Subagent needs to **write files** AND runs in parallel with other writers
- Example: /pm dispatches parallel implementers that each write to different files
- The Agent tool handles worktree lifecycle automatically (cleanup on no changes, branch on changes)

**When NOT to use worktrees:**
- Read-only subagents (research, analysis, review without fixes)
- Sequential subagents (each waits for the previous to finish)
- Subagents sharing a browse daemon (`$B`) — they'd clobber each other's navigation state

**When NOT to use subagents:**
- Interactive work (browse sessions, cookie setup)
- Small sequential tasks where subagent overhead exceeds the work
- Tasks where accumulated context matters (debugging hypotheses)

**Current patterns to follow:**
- `/pm`: parallel writers only for genuinely independent file ownership; the
  main session integrates and verifies
- `/review`: one cohesive pass by default; optional read-only specialists for
  large cross-domain changes
- `/research`: independent reference-file research can fan out
- `/qa`: parallel writers only for independent bugs with explicit ownership

## Harness simplification

Every skill component encodes an assumption about what the model can't do alone.
As models improve, stress-test those assumptions periodically.

Candidates include universal preambles, repeated command references, mandatory
approval checkpoints, duplicated methodology, and fixed specialist fan-out.

**How to test:** Remove the component on a branch, run the skill 3-5 times on
real tasks, compare output quality against the version with the component.
If quality doesn't meaningfully degrade, ship the simpler version.

**When to test:** After each major agent-model upgrade,
or when a skill feels sluggish.

## CHANGELOG style

CHANGELOG.md is **for users**, not contributors. Write it like product release notes:

- Lead with what the user can now **do** that they couldn't before. Sell the feature.
- Use plain language, not implementation details. "You can now..." not "Refactored the..."
- **Never mention TODOS.md, internal tracking, eval infrastructure, or contributor-facing
  details.** These are invisible to users and meaningless to them.
- Put contributor/internal changes in a separate "For contributors" section at the bottom.
- Every entry should make someone think "oh nice, I want to try that."
- No jargon: say "the skill now starts with the work instead of setup
  instructions" rather than "removed universal preamble injection."

## AI effort compression

When estimating or discussing effort, always show both human-team and CC+skystack time:

| Task type | Human team | CC+skystack | Compression |
|-----------|-----------|-----------|-------------|
| Boilerplate / scaffolding | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature implementation | 1 week | 30 min | ~30x |
| Bug fix + regression test | 4 hours | 15 min | ~20x |
| Architecture / design | 2 days | 4 hours | ~5x |
| Research / exploration | 1 day | 3 hours | ~3x |

Completeness is cheap. Don't recommend shortcuts when the complete implementation is clearly achievable.

## Local plans

Contributors can store long-range vision docs and design documents in `~/.skystack-dev/plans/`.
These are local-only (not checked in). When reviewing TODOS.md, check `plans/` for candidates
that may be ready to promote to TODOs or implement.

## E2E eval failure blame protocol

When an E2E eval fails during `/publish` or any other workflow, **never claim "not
related to our changes" without proving it.** These systems have invisible couplings —
shared prompt text affects agent behavior, a new helper changes timing, and a
regenerated SKILL.md shifts prompt context.

**Required before attributing a failure to "pre-existing":**
1. Run the same eval on main (or base branch) and show it fails there too
2. If it passes on main but fails on the branch — it IS your change. Trace the blame.
3. If you can't run on main, say "unverified — may or may not be related" and flag it
   as a risk in the PR body

"Pre-existing" without receipts is a lazy claim. Prove it or don't say it.

## Deploying to the active skill

Claude installs normally live at `~/.claude/skills/skystack/`; Codex installs
link generated skills into `${CODEX_HOME:-$HOME/.codex}/skills/`.

After changing Claude templates:

1. Push your branch
2. Fetch and reset in the skill directory: `cd ~/.claude/skills/skystack && git fetch origin && git reset --hard origin/main`
3. Rebuild: `cd ~/.claude/skills/skystack && bun run build`

Or copy the binary directly: `cp browse/dist/browse ~/.claude/skills/skystack/browse/dist/browse`

After changing Codex definitions, run `bun run gen:codex-skills` and
`./setup-codex`. Restart Codex CLI when adding, renaming, or removing skills so
it rescans the catalog.

**When to re-run `./setup`:** The setup script creates per-skill symlinks
(`~/.claude/skills/<name>` → `skystack/<name>`) so Claude Code discovers each skill.
Re-run `cd ~/.claude/skills/skystack && ./setup` when:
- A **new skill directory** is added (e.g., `devops/`)
- A skill directory is **renamed or removed**
- Symlinks are broken (skill doesn't appear in new sessions)

You do NOT need to re-run setup for template edits, binary rebuilds, or
`gen:skill-docs` — those are picked up automatically via the existing symlinks.
