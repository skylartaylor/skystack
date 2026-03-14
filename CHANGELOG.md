# Changelog

## 0.3.6 — 2026-03-14

### Added
- **E2E observability** — heartbeat file (`~/.gstack-dev/e2e-live.json`), per-run log directory (`~/.gstack-dev/e2e-runs/{runId}/`), progress.log, per-test NDJSON transcripts, persistent failure transcripts. All I/O non-fatal.
- **`bun run eval:watch`** — live terminal dashboard reads heartbeat + partial eval file every 1s. Shows completed tests, current test with turn/tool info, stale detection (>10min), `--tail` for progress.log.
- **Incremental eval saves** — `savePartial()` writes `_partial-e2e.json` after each test completes. Crash-resilient: partial results survive killed runs. Never cleaned up.
- **Machine-readable diagnostics** — `exit_reason`, `timeout_at_turn`, `last_tool_call` fields in eval JSON. Enables `jq` queries for automated fix loops.
- **API connectivity pre-check** — E2E suite throws immediately on ConnectionRefused before burning test budget.
- **`is_error` detection** — `claude -p` can return `subtype: "success"` with `is_error: true` on API failures. Now correctly classified as `error_api`.
- **Stream-json NDJSON parser** — `parseNDJSON()` pure function for real-time E2E progress from `claude -p --output-format stream-json --verbose`.
- **Eval persistence** — results saved to `~/.gstack-dev/evals/` with auto-comparison against previous run.
- **Eval CLI tools** — `eval:list`, `eval:compare`, `eval:summary` for inspecting eval history.
- **All 9 skills converted to `.tmpl` templates** — plan-ceo-review, plan-eng-review, retro, review, ship now use `{{UPDATE_CHECK}}` placeholder. Single source of truth for update check preamble.
- **3-tier eval suite** — Tier 1: static validation (free), Tier 2: E2E via `claude -p` (~$3.85/run), Tier 3: LLM-as-judge (~$0.15/run). Gated by `EVALS=1`.
- **Planted-bug outcome testing** — eval fixtures with known bugs, LLM judge scores detection.
- 15 observability unit tests covering heartbeat schema, progress.log format, NDJSON naming, savePartial, finalize, watcher rendering, stale detection, non-fatal I/O.
- E2E tests for plan-ceo-review, plan-eng-review, retro skills.
- Update-check exit code regression tests.
- `test/helpers/skill-parser.ts` — `getRemoteSlug()` for git remote detection.

### Fixed
- **Browse binary discovery broken for agents** — replaced `find-browse` indirection with explicit `browse/dist/browse` path in SKILL.md setup blocks.
- **Update check exit code 1 misleading agents** — added `|| true` to prevent non-zero exit when no update available.
- **browse/SKILL.md missing setup block** — added `{{BROWSE_SETUP}}` placeholder.
- **plan-ceo-review timeout** — init git repo in test dir, skip codebase exploration, bump timeout to 420s.
- Planted-bug eval reliability — simplified prompts, lowered detection baselines, resilient to max_turns flakes.

### Changed
- **Template system expanded** — `{{UPDATE_CHECK}}` and `{{BROWSE_SETUP}}` placeholders in `gen-skill-docs.ts`. All browse-using skills generate from single source of truth.
- Enriched 14 command descriptions with specific arg formats, valid values, error behavior, and return types.
- Setup block checks workspace-local path first (for development), falls back to global install.
- LLM eval judge upgraded from Haiku to Sonnet 4.6.
- `generateHelpText()` auto-generated from COMMAND_DESCRIPTIONS (replaces hand-maintained help text).

## 0.3.3 — 2026-03-13

### Added
- **SKILL.md template system** — `.tmpl` files with `{{COMMAND_REFERENCE}}` and `{{SNAPSHOT_FLAGS}}` placeholders, auto-generated from source code at build time. Structurally prevents command drift between docs and code.
- **Command registry** (`browse/src/commands.ts`) — single source of truth for all browse commands with categories and enriched descriptions. Zero side effects, safe to import from build scripts and tests.
- **Snapshot flags metadata** (`SNAPSHOT_FLAGS` array in `browse/src/snapshot.ts`) — metadata-driven parser replaces hand-coded switch/case. Adding a flag in one place updates the parser, docs, and tests.
- **Tier 1 static validation** — 43 tests: parses `$B` commands from SKILL.md code blocks, validates against command registry and snapshot flag metadata
- **Tier 2 E2E tests** via Agent SDK — spawns real Claude sessions, runs skills, scans for browse errors. Gated by `SKILL_E2E=1` env var (~$0.50/run)
- **Tier 3 LLM-as-judge evals** — Haiku scores generated docs on clarity/completeness/actionability (threshold ≥4/5), plus regression test vs hand-maintained baseline. Gated by `ANTHROPIC_API_KEY`
- **`bun run skill:check`** — health dashboard showing all skills, command counts, validation status, template freshness
- **`bun run dev:skill`** — watch mode that regenerates and validates SKILL.md on every template or source file change
- **CI workflow** (`.github/workflows/skill-docs.yml`) — runs `gen:skill-docs` on push/PR, fails if generated output differs from committed files
- `bun run gen:skill-docs` script for manual regeneration
- `bun run test:eval` for LLM-as-judge evals
- `test/helpers/skill-parser.ts` — extracts and validates `$B` commands from Markdown
- `test/helpers/session-runner.ts` — Agent SDK wrapper with error pattern scanning and transcript saving
- **ARCHITECTURE.md** — design decisions document covering daemon model, security, ref system, logging, crash recovery
- **Conductor integration** (`conductor.json`) — lifecycle hooks for workspace setup/teardown
- **`.env` propagation** — `bin/dev-setup` copies `.env` from main worktree into Conductor workspaces automatically
- `.env.example` template for API key configuration

### Changed
- Build now runs `gen:skill-docs` before compiling binaries
- `parseSnapshotArgs` is metadata-driven (iterates `SNAPSHOT_FLAGS` instead of switch/case)
- `server.ts` imports command sets from `commands.ts` instead of declaring inline
- SKILL.md and browse/SKILL.md are now generated files (edit the `.tmpl` instead)

## 0.3.2 — 2026-03-13

### Fixed
- Cookie import picker now returns JSON instead of HTML — `jsonResponse()` referenced `url` out of scope, crashing every API call
- `help` command routed correctly (was unreachable due to META_COMMANDS dispatch ordering)
- Stale servers from global install no longer shadow local changes — removed legacy `~/.claude/skills/gstack` fallback from `resolveServerScript()`
- Crash log path references updated from `/tmp/` to `.gstack/`

### Added
- **Diff-aware QA mode** — `/qa` on a feature branch auto-analyzes `git diff`, identifies affected pages/routes, detects the running app on localhost, and tests only what changed. No URL needed.
- **Project-local browse state** — state file, logs, and all server state now live in `.gstack/` inside the project root (detected via `git rev-parse --show-toplevel`). No more `/tmp` state files.
- **Shared config module** (`browse/src/config.ts`) — centralizes path resolution for CLI and server, eliminates duplicated port/state logic
- **Random port selection** — server picks a random port 10000-60000 instead of scanning 9400-9409. No more CONDUCTOR_PORT magic offset. No more port collisions across workspaces.
- **Binary version tracking** — state file includes `binaryVersion` SHA; CLI auto-restarts the server when the binary is rebuilt
- **Legacy /tmp cleanup** — CLI scans for and removes old `/tmp/browse-server*.json` files, verifying PID ownership before sending signals
- **Greptile integration** — `/review` and `/ship` fetch and triage Greptile bot comments; `/retro` tracks Greptile batting average across weeks
- **Local dev mode** — `bin/dev-setup` symlinks skills from the repo for in-place development; `bin/dev-teardown` restores global install
- `help` command — agents can self-discover all commands and snapshot flags
- Version-aware `find-browse` with META signal protocol — detects stale binaries and prompts agents to update
- `browse/dist/find-browse` compiled binary with git SHA comparison against origin/main (4hr cached)
- `.version` file written at build time for binary version tracking
- Route-level tests for cookie picker (13 tests) and find-browse version check (10 tests)
- Config resolution tests (14 tests) covering git root detection, BROWSE_STATE_FILE override, ensureStateDir, readVersionHash, resolveServerScript, and version mismatch detection
- Browser interaction guidance in CLAUDE.md — prevents Claude from using mcp\_\_claude-in-chrome\_\_\* tools
- CONTRIBUTING.md with quick start, dev mode explanation, and instructions for testing branches in other repos

### Changed
- State file location: `.gstack/browse.json` (was `/tmp/browse-server.json`)
- Log files location: `.gstack/browse-{console,network,dialog}.log` (was `/tmp/browse-*.log`)
- Atomic state file writes: `.json.tmp` → rename (prevents partial reads)
- CLI passes `BROWSE_STATE_FILE` to spawned server (server derives all paths from it)
- SKILL.md setup checks parse META signals and handle `META:UPDATE_AVAILABLE`
- `/qa` SKILL.md now describes four modes (diff-aware, full, quick, regression) with diff-aware as the default on feature branches
- `jsonResponse`/`errorResponse` use options objects to prevent positional parameter confusion
- Build script compiles both `browse` and `find-browse` binaries, cleans up `.bun-build` temp files
- README updated with Greptile setup instructions, diff-aware QA examples, and revised demo transcript

### Removed
- `CONDUCTOR_PORT` magic offset (`browse_port = CONDUCTOR_PORT - 45600`)
- Port scan range 9400-9409
- Legacy fallback to `~/.claude/skills/gstack/browse/src/server.ts`
- `DEVELOPING_GSTACK.md` (renamed to CONTRIBUTING.md)

## 0.3.1 — 2026-03-12

### Phase 3.5: Browser cookie import

- `cookie-import-browser` command — decrypt and import cookies from real Chromium browsers (Comet, Chrome, Arc, Brave, Edge)
- Interactive cookie picker web UI served from the browse server (dark theme, two-panel layout, domain search, import/remove)
- Direct CLI import with `--domain` flag for non-interactive use
- `/setup-browser-cookies` skill for Claude Code integration
- macOS Keychain access with async 10s timeout (no event loop blocking)
- Per-browser AES key caching (one Keychain prompt per browser per session)
- DB lock fallback: copies locked cookie DB to /tmp for safe reads
- 18 unit tests with encrypted cookie fixtures

## 0.3.0 — 2026-03-12

### Phase 3: /qa skill — systematic QA testing

- New `/qa` skill with 6-phase workflow (Initialize, Authenticate, Orient, Explore, Document, Wrap up)
- Three modes: full (systematic, 5-10 issues), quick (30-second smoke test), regression (compare against baseline)
- Issue taxonomy: 7 categories, 4 severity levels, per-page exploration checklist
- Structured report template with health score (0-100, weighted across 7 categories)
- Framework detection guidance for Next.js, Rails, WordPress, and SPAs
- `browse/bin/find-browse` — DRY binary discovery using `git rev-parse --show-toplevel`

### Phase 2: Enhanced browser

- Dialog handling: auto-accept/dismiss, dialog buffer, prompt text support
- File upload: `upload <sel> <file1> [file2...]`
- Element state checks: `is visible|hidden|enabled|disabled|checked|editable|focused <sel>`
- Annotated screenshots with ref labels overlaid (`snapshot -a`)
- Snapshot diffing against previous snapshot (`snapshot -D`)
- Cursor-interactive element scan for non-ARIA clickables (`snapshot -C`)
- `wait --networkidle` / `--load` / `--domcontentloaded` flags
- `console --errors` filter (error + warning only)
- `cookie-import <json-file>` with auto-fill domain from page URL
- CircularBuffer O(1) ring buffer for console/network/dialog buffers
- Async buffer flush with Bun.write()
- Health check with page.evaluate + 2s timeout
- Playwright error wrapping — actionable messages for AI agents
- Context recreation preserves cookies/storage/URLs (useragent fix)
- SKILL.md rewritten as QA-oriented playbook with 10 workflow patterns
- 166 integration tests (was ~63)

## 0.0.2 — 2026-03-12

- Fix project-local `/browse` installs — compiled binary now resolves `server.ts` from its own directory instead of assuming a global install exists
- `setup` rebuilds stale binaries (not just missing ones) and exits non-zero if the build fails
- Fix `chain` command swallowing real errors from write commands (e.g. navigation timeout reported as "Unknown meta command")
- Fix unbounded restart loop in CLI when server crashes repeatedly on the same command
- Cap console/network buffers at 50k entries (ring buffer) instead of growing without bound
- Fix disk flush stopping silently after buffer hits the 50k cap
- Fix `ln -snf` in setup to avoid creating nested symlinks on upgrade
- Use `git fetch && git reset --hard` instead of `git pull` for upgrades (handles force-pushes)
- Simplify install: global-first with optional project copy (replaces submodule approach)
- Restructured README: hero, before/after, demo transcript, troubleshooting section
- Six skills (added `/retro`)

## 0.0.1 — 2026-03-11

Initial release.

- Five skills: `/plan-ceo-review`, `/plan-eng-review`, `/review`, `/ship`, `/browse`
- Headless browser CLI with 40+ commands, ref-based interaction, persistent Chromium daemon
- One-command install as Claude Code skills (submodule or global clone)
- `setup` script for binary compilation and skill symlinking
