# Contributing to skystack

Thanks for wanting to make skystack better. Whether you're fixing a typo in a skill prompt or building an entirely new workflow, this guide will get you up and running fast.

## Quick start

skystack ships separate generated skill surfaces for Claude Code and Codex.
Claude skills normally live under `~/.claude/skills/`; Codex skills live under
`$CODEX_HOME/skills` (default `~/.codex/skills/`). During development, use the
generated skills from your working tree so template changes can be exercised
before release.

Claude dev mode symlinks the checkout into the repository-local
`.claude/skills/` directory. Codex-native skills are generated into
`.agents/skills/`.

```bash
git clone <repo> && cd skystack
bun install                    # install dependencies
bin/dev-setup                  # activate dev mode
bun run gen:codex-skills       # refresh Codex-native skills
```

Edit a Claude `SKILL.md.tmpl` or the Codex definitions in
`scripts/gen-codex-skills.ts`, regenerate, then invoke the generated skill in
the matching agent. Never hand-edit generated `SKILL.md` files. When you're done
with Claude dev mode:

```bash
bin/dev-teardown               # deactivate — back to your global install
```

## Working on skystack inside the skystack repo

When you're editing skystack skills and want to test them by actually using skystack
in the same repo, `bin/dev-setup` wires this up. It creates `.claude/skills/`
symlinks (gitignored) pointing back to your working tree, so Claude Code uses
your local edits instead of the global install.

```
skystack/                          <- your working tree
├── .claude/skills/              <- created by dev-setup (gitignored)
│   ├── review -> skystack/review
│   ├── publish -> skystack/publish
│   └── ...                      <- working-tree skill links
├── review/
│   ├── SKILL.md.tmpl            <- edit this
│   └── SKILL.md                 <- generated; test with /review
├── .agents/skills/              <- generated Codex-native skills
├── browse/
│   ├── src/                     <- TypeScript source
│   └── dist/                    <- compiled binary (gitignored)
└── ...
```

## Day-to-day workflow

```bash
# 1. Enter dev mode
bin/dev-setup

# 2. Edit a Claude skill template and regenerate
vim review/SKILL.md.tmpl
bun run gen:skill-docs

# 3. Test it in Claude Code
#    > /review

# 4. Editing a Codex skill? Edit its generator source and regenerate
vim scripts/gen-codex-skills.ts
bun run gen:codex-skills

# 5. Editing browse source? Rebuild the binary
bun run build

# 6. Done for the day? Tear down Claude dev mode
bin/dev-teardown
```

## Testing & evals

### Setup

```bash
# Optional: copy .env.example when running the paid Anthropic judge
cp .env.example .env
# Edit .env → set ANTHROPIC_API_KEY=sk-ant-...

# Install deps
bun install
```

Bun auto-loads `.env`. Agent E2E runs may also use existing Claude Code or Codex
CLI authentication; each required CLI must be installed and authenticated.
Conductor workspaces inherit `.env` from the main worktree automatically.

### Test tiers

| Tier | Command | Cost | What it tests |
|------|---------|------|---------------|
| 1 — Static | `bun test` | Free | Browser behavior, catalog/generator freshness, prompt contracts, runner and persistence tests |
| 2 — E2E | `bun run test:e2e` | Paid | Outcome scenarios through an isolated agent CLI |
| 2+3 | `bun run test:evals` | Paid | E2E plus the pinned LLM judge |

```bash
bun test                     # Tier 1 only (runs on every commit, <5s)
bun run eval:select          # preview diff-selected paid scenarios
bun run test:e2e             # Tier 2: selected E2E scenarios
bun run test:evals           # Tier 2 + 3 combined
bun run test:e2e:all         # force the complete E2E matrix
```

### Tier 1: Static validation (free)

Runs automatically with `bun test`. No API keys needed.

- **Browser tests** (`browse/test/`) exercise the compiled CLI and server behavior.
- **Skill validation tests** (`test/skill-validation.test.ts`) validate command
  usage and outcome-oriented workflow contracts.
- **Generator tests** (`test/gen-skill-docs.test.ts`) validate the canonical
  catalog, both generated surfaces, placeholder resolution, and prompt budgets.
- **Runner/store tests** validate provider command construction, scratch-home
  isolation, run identity, and schema-versioned evidence.

### Tier 2: agent E2E

The provider-neutral runner can spawn Claude Code or Codex CLI, streams
provider JSON events for progress, and normalizes them into one result shape.
Every run gets a scratch `HOME` and `SKYSTACK_HOME`; only authentication and a
runtime-only snapshot of the explicit skill root cross that boundary. Existing compatibility scenarios
default to Claude unless they select a provider explicitly.

```bash
EVALS=1 bun test test/skill-e2e.test.ts
```

- Gated by `EVALS=1` env var (prevents accidental expensive runs)
- Real-time progress to stderr: `[Ns] turn T tool #C: Name(...)`
- Saves full transcripts, failure JSON, and provider/model/effort/CLI/prompt/skill identity
- Tests live in `test/skill-e2e.test.ts`; new runner logic lives in
  `test/helpers/agent-runner.ts`

### E2E observability

When E2E tests run, they produce machine-readable artifacts in `~/.skystack-dev/`:

| Artifact | Path | Purpose |
|----------|------|---------|
| Heartbeat | `e2e-live.json` | Current test status (updated per tool call) |
| Partial results | `evals/_partial-e2e.json` | Completed tests (survives kills) |
| Progress log | `e2e-runs/{runId}/progress.log` | Append-only text log |
| JSON event transcripts | `e2e-runs/{runId}/{test}.ndjson` | Raw provider output per test |
| Run identity | `e2e-runs/{runId}/{test}-metadata.json` | Provider, model, effort, CLI and prompt/skill digests |
| Failure JSON | `e2e-runs/{runId}/{test}-failure.json` | Diagnostic data on failure |

**Live dashboard:** Run `bun run eval:watch` in a second terminal to see a live dashboard showing completed tests, the currently running test, and cost. Use `--tail` to also show the last 10 lines of progress.log.

**Eval history tools:**

```bash
bun run eval:list            # list all eval runs (turns, duration, cost per run)
bun run eval:compare         # compare two runs — shows per-test deltas + Takeaway commentary
bun run eval:summary         # aggregate stats + per-test efficiency averages across runs
```

**Eval comparison commentary:** `eval:compare` generates natural-language Takeaway sections interpreting what changed between runs — flagging regressions, noting improvements, calling out efficiency gains (fewer turns, faster, cheaper), and producing an overall summary. This is driven by `generateCommentary()` in `eval-store.ts`.

Artifacts are never cleaned up — they accumulate in `~/.skystack-dev/` for post-mortem debugging and trend analysis.

### Tier 3: LLM-as-judge

Uses the judge model pinned in `test/helpers/llm-judge.ts` to score generated
SKILL.md docs and outcome reports. Documentation scoring covers:

- **Clarity** — Can an AI agent understand the instructions without ambiguity?
- **Completeness** — Are all commands, flags, and usage patterns documented?
- **Actionability** — Can the agent execute tasks using only the information in the doc?

Each dimension is scored 1-5. Threshold: every dimension must score **≥ 4**. There's also a regression test that compares generated docs against the hand-maintained baseline from `origin/main` — generated must score equal or higher.

```bash
# Needs ANTHROPIC_API_KEY in .env — included in bun run test:evals
```

- Tests live in `test/skill-llm-eval.test.ts`
- Calls the Anthropic API directly and therefore requires `ANTHROPIC_API_KEY`

### CI

A GitHub Action (`.github/workflows/skill-docs.yml`) regenerates Claude
SKILL.md files on every push and PR and fails on a diff. The free test suite also
checks the canonical Claude and Codex inventories and generation contracts.

Tests run against the browse binary directly — they don't require dev mode.

## Editing SKILL.md files

SKILL.md files are **generated** from `.tmpl` templates. Don't edit the `.md` directly — your changes will be overwritten on the next build.

```bash
# 1. Edit the template
vim SKILL.md.tmpl              # or browse/SKILL.md.tmpl

# 2. Regenerate
bun run gen:skill-docs

# 3. Check health
bun run skill:check

# Or use watch mode — auto-regenerates on save
bun run dev:skill
```

For template authoring best practices (natural language over bash-isms, dynamic branch detection, `{{BASE_BRANCH_DETECT}}` usage), see CLAUDE.md's "Writing SKILL templates" section.

To add a browse command, add it to `browse/src/commands.ts`. To add a snapshot flag, add it to `SNAPSHOT_FLAGS` in `browse/src/snapshot.ts`. Then rebuild.

## Conductor workspaces

If you're using [Conductor](https://conductor.build) to run multiple Claude Code sessions in parallel, `conductor.json` wires up workspace lifecycle automatically:

| Hook | Script | What it does |
|------|--------|-------------|
| `setup` | `bin/dev-setup` | Copies `.env` from main worktree, installs deps, symlinks skills |
| `archive` | `bin/dev-teardown` | Removes skill symlinks, cleans up `.claude/` directory |

When Conductor creates a new workspace, `bin/dev-setup` runs automatically. It detects the main worktree (via `git worktree list`), copies your `.env` so API keys carry over, and sets up dev mode — no manual steps needed.

**First-time setup:** Put your `ANTHROPIC_API_KEY` in `.env` in the main repo (see `.env.example`). Every Conductor workspace inherits it automatically.

## Things to know

- **SKILL.md files are generated.** Edit the `.tmpl` template, not the `.md`. Run `bun run gen:skill-docs` to regenerate.
- **Browse source changes need a rebuild.** If you touch `browse/src/*.ts`, run `bun run build`.
- **Dev mode shadows your global install.** Project-local skills take priority over `~/.claude/skills/skystack`. `bin/dev-teardown` restores the global one.
- **Conductor workspaces are independent.** Each workspace is its own git worktree. `bin/dev-setup` runs automatically via `conductor.json`.
- **`.env` propagates across worktrees.** Set it once in the main repo, all Conductor workspaces get it.
- **`.claude/skills/` is gitignored.** The symlinks never get committed.

## Testing your changes in a real project

**This is the recommended way to develop skystack.** Symlink your skystack checkout
into the project where you actually use it, so your changes are live while you
do real work:

```bash
# In your core project
ln -sfn /path/to/your/skystack-checkout .claude/skills/skystack
cd .claude/skills/skystack && bun install && bun run build
```

Now every skystack skill invocation in this project uses your working tree. Edit a
template, run `bun run gen:skill-docs`, and the next `/review` or `/qa` call picks
it up immediately.

For Codex, run `bun run gen:codex-skills` and use the repository's
`.agents/skills/` output, or run `./setup-codex` to link the generated catalog
into `$CODEX_HOME/skills` (default `~/.codex/skills/`).

**To go back to the stable global install**, just remove the symlink:

```bash
rm .claude/skills/skystack
```

Claude Code falls back to `~/.claude/skills/skystack/` automatically.

### Alternative: point your global install at a branch

If you don't want per-project symlinks, you can switch the global install:

```bash
cd ~/.claude/skills/skystack
git fetch origin
git checkout origin/<branch>
bun install && bun run build
```

This affects all projects. To revert: `git checkout main && git pull && bun run build`.

## Shipping your changes

When you're happy with your skill edits:

Run the checks appropriate to your change, regenerate both affected skill
surfaces, and open a focused pull request. Claude users can invoke `/publish`
for the repository's verify/commit/push/PR workflow. See
`publish/SKILL.md.tmpl` for its source.
