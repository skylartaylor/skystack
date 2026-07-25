#!/usr/bin/env bun
/**
 * Generate Codex-native skill folders for skystack's binary-wrapping skills.
 *
 * Codex CLI loads user skills from $CODEX_HOME/skills (defaults to ~/.codex/skills).
 * setup-codex symlinks each generated folder there.
 *
 * Authored, not transformed. Each skill body below is hand-written for Codex
 * per Codex's own skill-creator guidance ("Concise is Key — only add context
 * Codex doesn't already have"). The Claude SKILL.md files are NOT mechanically
 * ported — too much of that content is Claude-specific (AskUserQuestion,
 * parallel subagents, plan mode) and Codex has its own conventions.
 *
 * Claude and Codex skills are separately authored because their tool and
 * interaction surfaces differ. The canonical product inventory lives in
 * scripts/skill-catalog.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CODEX_SKILLS } from './skill-catalog';

const ROOT = path.resolve(import.meta.dir, '..');
const OUT_ROOT = path.join(ROOT, '.agents', 'skills');
const DRY_RUN = process.argv.includes('--dry-run');

type Skill = {
  name: string;
  displayName: string;
  shortDescription: string;
  defaultPrompt: string;
  description: string;
  body: string;
};

// Reusable resolver — finds the browse binary across install scenarios:
// 1. Codex install: ~/.codex/skills/skystack/bin/browse (chain symlink)
// 2. Claude Code install: ~/.claude/skills/skystack/browse/dist/browse
// 3. Skystack dev checkout: <repo>/browse/dist/browse via git toplevel
// Inlined into each skill body so a single skill is self-contained.
const RESOLVER = `\
\`\`\`bash
for _b in \\
  "$HOME/.codex/skills/skystack/bin/browse" \\
  "$HOME/.claude/skills/skystack/browse/dist/browse" \\
  "$(git rev-parse --show-toplevel 2>/dev/null)/browse/dist/browse"; do
  [ -x "$_b" ] && B="$_b" && break
done
[ -z "\${B:-}" ] && { echo "skystack browse binary not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
\`\`\``;

const SKILLS: Skill[] = [
  {
    name: 'skystack',
    displayName: 'skystack',
    shortDescription: 'Headless browser + QA tooling for Codex',
    defaultPrompt: 'Use $skystack to see what tooling is available.',
    description:
      'Umbrella skill for skystack tooling: headless Chromium CLI, browser-based QA, performance benchmarking, post-deploy monitoring, code-quality scoring. Use when the user mentions skystack, asks what skystack does, or needs an overview before invoking a specific sub-skill.',
    body: `# skystack

skystack bundles a headless Chromium CLI (\`browse\`) and a few QA / monitoring
helpers. Each capability is its own skill — invoke them by name.

## Sub-skills

| Skill | Purpose |
|-------|---------|
| \`$pm\` | Idea → spec → build → ship; structured feature workflow |
| \`$diagnose\` | Systematic debugging — root cause first, fix second |
| \`$devops\` | Safe infra ops with command classification + rollback discipline |
| \`$browse\` | Headless Chromium CLI: navigate, click, screenshot, eval JS |
| \`$qa\` | Drive the app in a real browser, find bugs, capture evidence |
| \`$benchmark\` | Compare page-load + Core Web Vitals between two refs |
| \`$canary\` | Watch a deployment for console errors / regressions post-deploy |
| \`$health\` | Run project tests + linters, score 0-10 with trend tracking |
| \`$setup-browser-cookies\` | Import auth cookies from a real browser |
| \`$skystack-upgrade\` | Update skystack to the latest version |

## Resolving the browse binary

If you need to invoke the headless browser binary directly:

${RESOLVER}

After this, \`$B\` is the absolute path to the browse binary. Each sub-skill
includes this resolver inline so they remain self-contained.

## What's NOT here (intentionally)

Some Claude-specific workflows — \`/design\`, \`/publish\`, \`/review\`,
\`/retro\`, and \`/security\` — are intentionally not ported to Codex because
Codex's own tools cover those domains better, and a mechanical port would burn
context with Claude-specific content.

For cross-model review from Codex, use \`$claude-review\`.
`,
  },

  {
    name: 'claude-review',
    displayName: 'Claude Review',
    shortDescription: 'External Claude Code branch review',
    defaultPrompt: 'Use $claude-review to get an external Claude Code review of this branch diff.',
    description:
      'Run a structured external code review through the Claude Code CLI from Codex. Use when the user asks for a Claude review, Claude Code review, external reviewer, cross-model review, or second opinion on a branch diff. This skill uses local Claude Code only with a structured prompt, Claude Opus 5 by default, max effort and read-only repo tools by default, and does not use ultrareview.',
    body: `# Claude Review

Run Claude Code as an external, read-only reviewer of the current branch diff.
Do not use \`claude ultrareview\` for this skill.

## Workflow

1. Check that \`claude\` is available:

\`\`\`bash
command -v claude >/dev/null && claude --version
\`\`\`

If it is missing, tell the user to install or authenticate Claude Code before retrying.

2. Resolve the bundled wrapper from the installed skill, then run it from the
   repository root you want reviewed. In Codex, run this as a long-running shell
   command with at least a 15 minute timeout (for example, \`timeout_ms: 900000\`);
   the default shell timeout is often too short for external model review.

\`\`\`bash
CLAUDE_REVIEW=""
for _s in \\
  "\${CODEX_HOME:-$HOME/.codex}/skills/claude-review/scripts/claude_review.sh" \\
  "$HOME/.codex/skills/claude-review/scripts/claude_review.sh" \\
  "$(git rev-parse --show-toplevel 2>/dev/null)/.agents/skills/claude-review/scripts/claude_review.sh"; do
  [ -x "$_s" ] && CLAUDE_REVIEW="$_s" && break
done
[ -z "\${CLAUDE_REVIEW:-}" ] && { echo "claude-review wrapper not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
"$CLAUDE_REVIEW"
\`\`\`

The wrapper:

- Detects the PR base branch with \`gh\` when available, then falls back to the repo default branch or \`main\`.
- Builds a diff from the base branch to the working tree, including staged, unstaged, and untracked file changes.
- Calls Claude Code with \`--model claude-opus-5\` and \`--effort max\`.
- Supports named review profiles: \`--opus\` for Claude Opus 5 review (default) and \`--fable\` for Claude Fable 5 review.
- Uses \`--disable-slash-commands\`, \`--no-session-persistence\`, read-only repo tools by default, and a structured review prompt.
- Refuses oversized diffs before calling Claude so Codex gets a clear error instead of a silent timeout. Use \`--max-diff-bytes N\` to raise the limit when intentional.
- Prints Claude's review text only.

3. If the user supplied review focus, resolve the wrapper the same way and pass
   the focus through:

\`\`\`bash
CLAUDE_REVIEW=""
for _s in \\
  "\${CODEX_HOME:-$HOME/.codex}/skills/claude-review/scripts/claude_review.sh" \\
  "$HOME/.codex/skills/claude-review/scripts/claude_review.sh" \\
  "$(git rev-parse --show-toplevel 2>/dev/null)/.agents/skills/claude-review/scripts/claude_review.sh"; do
  [ -x "$_s" ] && CLAUDE_REVIEW="$_s" && break
done
[ -z "\${CLAUDE_REVIEW:-}" ] && { echo "claude-review wrapper not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
"$CLAUDE_REVIEW" --focus "security and data-loss risks"
\`\`\`

4. Present Claude's output faithfully. If you disagree with a finding, verify it against the code before saying so.

## Options

If the user asks for a "fable review", pass \`--fable\`. If they ask for an
"opus review", pass \`--opus\` or rely on the default. Use \`--model MODEL\`
only for exact Claude Code model aliases or full model names.

\`\`\`bash
CLAUDE_REVIEW=""
for _s in \\
  "\${CODEX_HOME:-$HOME/.codex}/skills/claude-review/scripts/claude_review.sh" \\
  "$HOME/.codex/skills/claude-review/scripts/claude_review.sh" \\
  "$(git rev-parse --show-toplevel 2>/dev/null)/.agents/skills/claude-review/scripts/claude_review.sh"; do
  [ -x "$_s" ] && CLAUDE_REVIEW="$_s" && break
done
[ -z "\${CLAUDE_REVIEW:-}" ] && { echo "claude-review wrapper not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
"$CLAUDE_REVIEW" \\
  --base main \\
  --fable \\
  --effort max \\
  --focus "race conditions"
\`\`\`

Read-only repo tools are enabled by default so Claude can verify findings against
the surrounding code. Use \`--no-tools\` for a strict diff-only pass. Use
\`--with-tools\` to override \`CLAUDE_REVIEW_WITH_TOOLS=0\`.

When tools are enabled, Claude should prefer \`rtk summary\` for tests/builds,
\`rtk log\` for logs, \`rtk find\`/\`rtk grep\` for broad inspection, and
\`rtk git diff/log/status\` for git output. Use raw commands only when exact full
output is needed.

Use a different model or effort only when the user asks. The intended default is Claude Opus 5 with max effort.

## Failure Handling

- If Claude authentication fails, tell the user to run \`claude auth login\`.
- If \`claude-opus-5\` or \`claude-fable-5\` is unavailable for the account, report the exact error and suggest retrying with the rolling \`opus\` or \`fable\` alias.
- If the diff is empty, say there are no changes to review.
- If the diff is too large, report the byte count and suggest narrowing generated/untracked files or retrying with \`--model sonnet --effort high\`.
- If the wrapper exits nonzero, show the useful stderr/stdout context and do not invent findings.
`,
  },

  {
    name: 'browse',
    displayName: 'Browse',
    shortDescription: 'Headless Chromium CLI for navigation and inspection',
    defaultPrompt: 'Use $browse to open and inspect a page.',
    description:
      'Headless Chromium CLI (~100ms/command). Navigate, click, screenshot, evaluate JavaScript, take responsive snapshots. Use when the user asks to "open in browser", "test a URL", "screenshot", "scrape", or wants to verify a deployment.',
    body: `# Browse

Headless Chromium CLI built on Playwright. Each command is ~100ms.

## Resolve the binary

${RESOLVER}

After this, \`$B\` is the absolute path to the browse binary.

## Common commands

| Command | What it does |
|---------|--------------|
| \`$B goto <url>\` | Navigate to URL (creates a session if none) |
| \`$B click <selector>\` | Click an element |
| \`$B fill <selector> <value>\` | Fill an input |
| \`$B screenshot <path>\` | Save a PNG of the current viewport |
| \`$B snapshot\` | Print accessibility tree of current page |
| \`$B js "<expression>"\` | Eval JS in page context, print result |
| \`$B url\` | Print current URL |
| \`$B back\` / \`$B forward\` / \`$B reload\` | History nav |
| \`$B close\` | End the session |

Run \`$B --help\` for the full list. Sessions persist between commands until
\`close\`, which is what makes flows fast.

## Patterns

**Smoke-test a deployed page:**

\`\`\`bash
$B goto https://example.com
$B js "document.title"
$B screenshot /tmp/example.png
$B close
\`\`\`

**Authenticated testing:** run \`$setup-browser-cookies\` first to import a
real browser session, then \`$B goto\` will be logged in.

**Capture console errors:** \`$B js "JSON.stringify(window.__errors || [])"\`
after wiring an error listener.

## Notes

- The binary launches its own Playwright Chromium. No system Chrome required.
- For full QA flows (find bugs, file reports), use \`$qa\` instead — it
  composes multiple browse calls into a workflow.
`,
  },

  {
    name: 'qa',
    displayName: 'QA',
    shortDescription: 'Real-browser QA testing and evidence capture',
    defaultPrompt: 'Use $qa to test this user flow in a real browser.',
    description:
      'Drive a real browser through user flows, find bugs, and capture evidence (screenshots, console errors, network failures). Optionally fixes the bugs found. Use when the user asks to "test", "QA", "find bugs", "check the site", or "dogfood".',
    body: `# QA

Drive a real browser through your app, find bugs, capture evidence.

## When to use

- User says: "test this", "QA this flow", "find bugs", "dogfood", "check the site"
- After a deploy, before merge, or when verifying a bug report

## Workflow

1. **Confirm the test target.** Ask the user for the URL and the flow to test
   if not provided. (Login? Checkout? Create-post? Be specific.)

2. **Resolve browse:**

${RESOLVER}


3. **If the flow needs auth:** run \`$setup-browser-cookies\` first to import
   the user's real browser session.

4. **Walk the flow:**
   - \`$B goto <url>\`
   - For each step: take a snapshot before, click/fill, snapshot after
   - After each interaction, eval \`window.location.href\` and check for
     unexpected redirects or 404 / error pages
   - Capture screenshots to \`/tmp/qa-<step>.png\` for evidence

5. **Capture failures:**
   - Console errors: install a listener via \`$B js\` before the flow
   - Network failures: same — listen for failed responses
   - Visual regressions: screenshot key states, diff against expected

6. **Report findings.** For each bug:
   - **What:** one-line description
   - **Steps:** exact reproduction
   - **Expected vs Actual**
   - **Evidence:** screenshot path or console error text
   - **Severity:** P1 (blocks user) / P2 (degrades) / P3 (cosmetic)

7. **Fix or report-only?** Default to report-only. If the user explicitly
   asks to fix, make minimal atomic edits via \`apply_patch\` and re-run the
   flow to verify each fix.

## Bug bar

Only file what a real user would notice. Skip:
- Console warnings that don't affect behavior
- Linter complaints
- Style nits not specified by design

## Wrap-up

Always \`$B close\` when done.
`,
  },

  {
    name: 'benchmark',
    displayName: 'Benchmark',
    shortDescription: 'Compare page-load + Core Web Vitals across refs',
    defaultPrompt: 'Use $benchmark to compare this branch against the base branch.',
    description:
      'Performance regression detection. Loads pages with the browse daemon, measures Core Web Vitals (LCP, FID, CLS), bundle sizes, and resource counts. Compares before/after on every PR. Use when the user asks about "performance", "page speed", "lighthouse-like check", "bundle size", or "regression".',
    body: `# Benchmark

Detect performance regressions by comparing page load metrics between two
git refs (typically base branch vs current).

## When to use

- User says: "is this slower?", "benchmark", "perf check", "did bundle size grow?"
- Before merging a PR that touches frontend code

## Workflow

1. **Resolve browse:**

${RESOLVER}


2. **Identify the URL(s) to benchmark.** Ask the user for the deployed URL
   on each ref (preview deploys are common; or run a local dev server twice).

3. **For each ref / URL pair, capture metrics:**

   \`\`\`bash
   $B goto <url>
   $B js "JSON.stringify({
     lcp: performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]?.startTime,
     ttfb: performance.timing.responseStart - performance.timing.requestStart,
     transferred: performance.getEntriesByType('resource').reduce((a,r)=>a+r.transferSize,0),
     resourceCount: performance.getEntriesByType('resource').length
   })"
   \`\`\`

   Run each URL 3 times, take the median.

4. **Compare and report.** For each metric:
   - Old → New (delta, % change)
   - Flag regressions > 10% as warnings, > 25% as failures

5. **Bundle size:** if you have local builds, \`du -sh dist/\` or equivalent
   on each ref tells the story without touching the browser.

## Bar for filing a regression

A single noisy run isn't a regression. Require:
- Median of 3 runs is > 10% worse on at least one Core Web Vital, OR
- Bundle transferSize grew > 25KB and isn't explained by a feature

Below that bar, just report numbers and let the user decide.
`,
  },

  {
    name: 'canary',
    displayName: 'Canary',
    shortDescription: 'Post-deploy monitoring for live regressions',
    defaultPrompt: 'Use $canary to watch this deployment for issues.',
    description:
      'Post-deploy canary monitoring. Loads production URLs in the browse daemon, captures console errors, takes periodic screenshots, alerts on anomalies. Use when the user says "monitor deploy", "watch production", "post-deploy check", or "canary".',
    body: `# Canary

Watch a fresh deploy for live errors, console noise, and visual regressions.
This is reactive monitoring — not a replacement for proper observability.

## When to use

- Right after \`/publish\` or a deploy
- User says: "watch the deploy", "is prod healthy?", "canary"

## Workflow

1. **Pre-deploy baseline.** Before the deploy lands, capture the current
   state of the URL(s) being shipped:
   - Screenshot each key page
   - Snapshot DOM
   - Save \`window.__errors\` if instrumented

2. **Resolve browse and post-deploy URLs:**

${RESOLVER}


3. **Polling loop.** Every 60-120s for the first 10-30 minutes:
   - \`$B goto <url>\`
   - Capture: HTTP status (via \`$B js "performance.timing"\`), console
     errors, current screenshot
   - Compare against baseline

4. **Alert criteria.** Tell the user immediately if any of:
   - Console errors appearing that weren't in baseline
   - HTTP 5xx on any monitored URL
   - Critical UI elements missing (login button, primary CTA)
   - Visual regression > 30% pixel diff on key pages

5. **All-clear after 30 min.** If no anomalies, report "Canary clean — no
   regressions detected over 30 minutes."

## What canary is NOT

- Not a replacement for Sentry / Datadog / proper observability
- Not for slow-burn issues (memory leaks, gradual degradation)
- Not for backend-only changes — use the right monitoring tool there
`,
  },

  {
    name: 'health',
    displayName: 'Health',
    shortDescription: 'Code quality dashboard with weighted 0-10 score',
    defaultPrompt: 'Use $health to score this repository\'s code quality.',
    description:
      'Read-only code quality dashboard. Runs the project\'s type checker, linter, tests, and dead-code detector, then produces a weighted 0-10 composite score. Tracks trend over time. Use when the user asks "how\'s the codebase", "health check", "code quality score".',
    body: `# Health

Read-only quality dashboard. Wraps the project's existing tools and produces a
weighted 0-10 composite score. Detects only — never fixes.

## Workflow

1. **Detect the project's tools.** Look for:
   - Type checker: \`tsc\`, \`mypy\`, \`flow\`, etc. (per project config)
   - Linter: \`eslint\`, \`ruff\`, \`rubocop\`, \`golangci-lint\`, etc.
   - Test runner: \`bun test\`, \`vitest\`, \`pytest\`, \`go test\`, \`bundle exec\`, etc.
   - Dead code: \`knip\`, \`ts-prune\`, \`vulture\`, \`unused\`, etc. (only if configured)

2. **Run each tool, capture exit code + counts.** Don't fail on the first
   issue — collect everything.

3. **Score (weights below):**

   | Signal | Weight | Pass criteria |
   |--------|--------|---------------|
   | Type check | 3.0 | 0 errors |
   | Tests | 3.0 | 100% pass |
   | Lint | 2.0 | 0 errors (warnings allowed) |
   | Dead code | 1.0 | < 5% of files unused |
   | Format | 1.0 | clean |

   Each category contributes \`weight × (passing / total)\`. Cap at 10.

4. **Report:**
   \`\`\`
   Health: 8.4 / 10
     ✓ Type check: 0 errors
     ✗ Tests: 142/144 passing (2 failing)
     ✓ Lint: 0 errors, 12 warnings
     ⚠ Dead code: 7 unused exports
     ✓ Format: clean
   \`\`\`

5. **Trend tracking** (optional). Append to \`~/.skystack/projects/<slug>/health.jsonl\`
   so the user can see drift over time.

## What this is NOT

- Not an auto-fixer. The point is detection.
- Not a substitute for code review. A 10/10 health score can still be a bad
  codebase (no tests = high score by trivially passing 0 of 0).
- Not opinionated about test coverage % — just whether existing tests pass.
`,
  },

  {
    name: 'setup-browser-cookies',
    displayName: 'Setup Browser Cookies',
    shortDescription: 'Import auth cookies from a real browser into browse',
    defaultPrompt: 'Use $setup-browser-cookies to authenticate the headless browser.',
    description:
      'Import cookies from your real browser (Chrome, Arc, Brave, Edge, Comet) into the headless browse session so the next $browse call is logged in. Opens an interactive picker UI for domain selection. Use before authenticated QA testing.',
    body: `# Setup Browser Cookies

Import cookies from your real browser into the headless \`$browse\` session
so authenticated pages just work.

## When to use

- Before \`$qa\` if the flow requires login
- Before \`$browse goto\` on any auth-gated URL
- User says: "log into the site", "import my cookies", "authenticate the browser"

## Workflow

1. **Resolve browse:**

${RESOLVER}


2. **Run the cookie import command:**

   \`\`\`bash
   $B cookies-import
   \`\`\`

   This opens an interactive picker showing detected browsers and the cookie
   domains they have. The user selects which domains to import.

3. **Verify.** After import:

   \`\`\`bash
   $B goto <auth-protected-url>
   $B js "document.title"  # should show authed page, not login
   \`\`\`

## Notes

- Cookies are imported per-domain. Don't import every cookie the user has —
  pick the specific domain(s) the test target needs.
- Imported cookies persist for the browse session. \`$B close\` clears them.
- Some sites (Google, Apple) bind cookies to user agent / device fingerprint;
  imports may not survive. Fall back to a manual login flow there.
`,
  },

  {
    name: 'pm',
    displayName: 'PM',
    shortDescription: 'Idea to shipped feature: spec, plan, build, verify, ship',
    defaultPrompt: 'Use $pm to spec and build this feature.',
    description:
      'End-to-end feature workflow: research the problem, write the spec with user approval, plan TDD tasks, build task-by-task with commits, verify, and present for publish. Two checkpoints with the user (spec approval, publish decision); everything else runs autonomously. Use when the user says "PM this", "build feature X", "spec it out", or wants structured feature work instead of ad-hoc coding.',
    body: `# PM

Idea → spec → build → ship. Two checkpoints with the user (spec approval and
publish decision). Everything else runs autonomously.

## When to use

- User says: "PM this", "build feature X", "let's add Y", "spec it out"
- A new feature or non-trivial change that needs structured thinking before code

## Phase 1: Discovery (autonomous)

Before writing any code, understand:

1. **Existing context.** Read \`TODOS.md\` if present. Look at recent commits
   in the relevant area (\`git log --oneline -20\` then narrow). Skim the 3-5
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

After approval, save the spec to \`~/.skystack/projects/<slug>/pm-specs/<date>-<slug>.md\`
so future \`$qa\` and design audits can verify against it.

## Phase 3: Plan

1. **File map.** List every file with one-line responsibility:
   \`\`\`
   Create: path/to/new_file.ts        # data model
   Modify: path/to/router.ts          # route registration
   Test:   path/to/new_file.test.ts   # validates X, Y, Z
   \`\`\`
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

If \`$claude-review\` is available, run it on the feature diff. Surface any
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
`,
  },

  {
    name: 'diagnose',
    displayName: 'Diagnose',
    shortDescription: 'Systematic debugging — root cause first, fix second',
    defaultPrompt: 'Use $diagnose to find the root cause before changing code.',
    description:
      'Systematic debugging with strict root-cause discipline. Five phases: investigate, pattern-match, hypothesize, fix, verify. Iron Law: no fixes without confirmed root cause. Use when the user says "debug", "diagnose", "fix this bug", "figure out why X is broken", "something is wrong with", or describes a symptom they don\'t understand yet.',
    body: `# Diagnose

Systematic debugging. Find root cause, then fix.

## Iron law

**NO FIXES WITHOUT CONFIRMED ROOT CAUSE.**

Fixing symptoms creates whack-a-mole. Every fix that doesn't address root cause
makes the next bug harder to find. Trace it, prove it, then fix it.

## Phase 1: Investigate

Gather context before forming any hypothesis.

1. **Collect symptoms.** Read error messages, stack traces, repro steps. If
   the user hasn't given enough context, ask ONE question at a time.
2. **Read the code.** Trace from symptom back toward potential causes. Use
   \`grep\` for references, read source for logic.
3. **Check recent changes:**
   \`\`\`bash
   git log --oneline -20 -- <affected-files>
   \`\`\`
   Was this working before? A regression means the cause is in the diff.
4. **Reproduce.** Can you trigger the bug deterministically? If not, gather
   more evidence before proceeding — don't theorize on a single observation.

Output: **"Root cause hypothesis: …"** — a specific, testable claim about
what is wrong and why.

## Phase 2: Pattern match

Check if this matches a known shape:

| Pattern | Signature | Where to look |
|---------|-----------|---------------|
| Race condition | Intermittent, timing-dependent | Concurrent access to shared state |
| Nil/null propagation | NoMethodError, TypeError | Missing guards on optional values |
| State corruption | Inconsistent data, partial updates | Transactions, callbacks, hooks |
| Integration failure | Timeout, unexpected response | External API calls, service boundaries |
| Config drift | Works locally, fails in staging/prod | Env vars, feature flags, DB state |
| Stale cache | Shows old data, fixes on cache clear | Redis, CDN, browser cache |

Also check:
- \`TODOS.md\` for related known issues
- \`git log\` for prior fixes in the same area — **recurring bugs in the same
  files are an architectural smell**, not coincidence

If the bug doesn't fit a known pattern, search the web for
"{framework} {generic error type}" — but **sanitize first**: strip hostnames,
IPs, file paths, SQL fragments, customer data. Search the category, not the
raw message.

**Scope advisory.** Identify the narrowest directory containing affected
files. Tell the user: "Focusing edits on \`<dir>/\`." Avoid touching files
outside that scope unless the root cause genuinely spans modules.

## Phase 3: Test the hypothesis

Before writing ANY fix, verify the hypothesis.

1. **Confirm.** Add a temporary log line, assertion, or debug print at the
   suspected root cause. Run the repro. Does the evidence match?
2. **If wrong:** sanitize the error, search if useful, then return to Phase 1.
   Don't guess. Gather more evidence.
3. **3-strike rule.** If 3 hypotheses fail, STOP. Tell the user:
   "I've tested 3 hypotheses, none match. This may be architectural rather
   than a simple bug. Options: A) keep investigating with hypothesis #4,
   B) add logging and catch it next time, C) escalate / fresh eyes."

**Red flags** — slow down if you see any of these:
- "Quick fix for now" — there is no "for now." Fix it right or escalate.
- Proposing a fix before tracing data flow — you're guessing.
- Each fix reveals a new problem elsewhere — wrong layer, not wrong code.

## Phase 4: Fix

Once root cause is confirmed:

1. **Fix the root cause, not the symptom.** The smallest change that
   eliminates the actual problem.
2. **Minimal diff.** Fewest files, fewest lines. Resist refactoring adjacent
   code "while you're in there."
3. **Write a regression test** that fails without the fix and passes with
   it — proves the test is meaningful AND the fix works.
4. **Run the full test suite.** No regressions allowed.
5. **If the fix touches >5 files**, ask the user first:
   "This touches N files — large blast radius for a bug fix. Proceed / split
   / rethink?"

## Phase 5: Verify and report

Reproduce the original bug scenario and confirm it's fixed. Not optional —
"should be fixed" without verification ships bugs.

Output a structured debug report:

\`\`\`
DEBUG REPORT
══════════════════════════════════════════════
Symptom:          <what you observed>
Root cause:       <what was actually wrong>
Fix:              <what changed, with file:line refs>
Evidence:         <test output / repro showing fix works>
Regression test:  <file:line of the new test>
Related:          <TODOS items, prior bugs in same area, arch notes>
Status:           DONE | DONE_WITH_CONCERNS | BLOCKED
══════════════════════════════════════════════
\`\`\`

Status meanings:
- **DONE** — root cause confirmed, fix verified, regression test added
- **DONE_WITH_CONCERNS** — fixed but couldn't fully verify (intermittent,
  needs staging env, etc.)
- **BLOCKED** — root cause unclear after investigation. Escalate, don't guess.

## Rules

- No fix without confirmed root cause. Guessing wastes time.
- 3+ failed hypotheses → question the architecture, not the code.
- Never say "this should fix it." Verify and prove it.
- Fix touches >5 files → ask first.
- If you can't reproduce, don't ship.
`,
  },

  {
    name: 'devops',
    displayName: 'DevOps',
    shortDescription: 'Safe infrastructure operations with rollback discipline',
    defaultPrompt: 'Use $devops to do this infrastructure task safely.',
    description:
      'Safe infrastructure operations: servers, web servers, DNS, SSL, Docker, Kubernetes, firewalls. Classifies every command (SAFE/CAUTION/DANGER), backs up before destructive ops, prefers reversible operations, reads existing runbooks first, documents changes after. Use when the user mentions "set up nginx", "configure DNS", "deploy helm chart", "kubectl", "ssl cert", "firewall", "iptables", "docker compose", "server management", or any production infra change.',
    body: `# DevOps

Safe infrastructure operations. Bar: never run a destructive command without a
backup, an explicit user acknowledgment, and a documented rollback path.

## When to use

- "set up nginx", "configure DNS", "deploy helm chart", "kubectl <anything>"
- "ssl certificate", "firewall", "iptables", "ufw", "docker compose"
- Anything touching production infra or shared infrastructure

## Iron rules

1. **Read existing runbooks first.** Look in \`runbooks/\`, \`docs/ops/\`, the
   README. If "how we deploy" is documented, follow it. Don't reinvent.
2. **Show every shell command in plain text BEFORE running.** Never silent
   side effects.
3. **Classify each command** (SAFE / CAUTION / DANGER — see below). Confirm
   any CAUTION op once; require explicit acknowledgment for any DANGER op.
4. **Back up before destructive ops.** Test the restore path actually works
   before you destroy the original.
5. **Reversible > clever.** If you can't roll back, it's not done.

## Command classification

### SAFE — run freely, no confirmation needed

Read-only or zero-side-effect:
- \`cat\`, \`ls\`, \`tail\`, \`grep\`
- \`kubectl get\`, \`kubectl describe\`, \`docker ps\`, \`docker inspect\`
- \`dig\`, \`curl -I\`, \`curl -s\` (idempotent GETs)
- \`systemctl status\`, \`journalctl\`, \`nginx -t\` (test config without applying)

### CAUTION — show command + ask before running

Reversible side effects:
- Service restarts: \`systemctl restart\`, \`nginx -s reload\`
- Config edits to live files (\`nginx.conf\`, \`docker-compose.yml\`)
- Container starts/stops: \`docker compose up\`, \`docker stop\`
- DNS records (changes propagate, but TTLs let you roll back)
- Adding firewall rules with \`ufw allow\`

### DANGER — show command + back up + EXPLICIT acknowledgment

Hard-to-reverse or destructive:
- \`rm -rf /\`, \`kubectl delete\`, \`docker volume rm\`, \`systemctl disable\`
- Firewall flushes: \`iptables -F\`
- DB schema changes, \`DROP TABLE\`, \`TRUNCATE\`, destructive migrations
- Renaming or deleting filesystems
- Force-pushing to deployment branches

For DANGER ops, the user types "yes I understand" or equivalent. Don't proceed
on a one-tap confirmation.

## Workflow

1. **Orient.** What's the target? SSH? Kubernetes? Local Docker? Run
   diagnostics to confirm you're talking to the right thing:
   \`\`\`bash
   uname -a
   kubectl config current-context  # if k8s
   docker info                     # if docker
   \`\`\`

2. **Read existing runbooks** before forming a plan. If they exist, mention
   what you found and what (if anything) you're departing from.

3. **Plan.** Output the full sequence of commands you'll run, with each one
   classified. Get approval for any CAUTION or DANGER step before running it.

4. **Execute step by step.** After each CAUTION/DANGER op, verify:
   - Did the service come back up? (\`systemctl status\`, \`kubectl rollout status\`)
   - Did the cert issue / renew? (\`openssl s_client\`, \`curl -vI\`)
   - Did DNS propagate? (\`dig +short @8.8.8.8\`)
   Don't proceed to step N+1 until step N is confirmed working.

5. **Document.** Append to the runbook (create one if missing) using this format:

   \`\`\`markdown
   ## YYYY-MM-DD — <one-line summary>
   **What:** <what was done>
   **Why:** <reason / ticket / incident link>
   **Commands:**
   \\\`\\\`\\\`
   <copy-pasteable list, in order>
   \\\`\\\`\\\`
   **Rollback:** <how to undo, with exact commands>
   **Verified by:** <how you confirmed it worked>
   \`\`\`

## Incident tracking

If something breaks during ops:
- Capture the exact command + timestamp
- Pull relevant logs: \`journalctl -u <service> --since "5 min ago"\`,
  \`kubectl logs <pod> --previous\`, \`docker logs <container>\`
- Stop. Don't keep flailing. Write down 2-3 hypotheses, test ONE at a time.
- File an incident at \`incidents/YYYY-MM-DD-<slug>.md\`:

\`\`\`markdown
## Incident: <one-line description>
**When:** <ISO timestamp> — <duration>
**Impact:** <who / what was affected>

## Timeline
- <HH:MM> — <event>
- <HH:MM> — <event>

## Root cause
<be specific. "nginx misconfig" is not a root cause.
"missing upstream block in /etc/nginx/sites-enabled/api.conf
caused 502s on /api/v1/*" is.>

## Resolution
<exact commands run to fix it>

## Prevention
<how to make sure this can't happen again — config check in CI? alert?
runbook update? deploy gate?>
\`\`\`

## Anti-patterns (don't do these)

- \`sudo !!\` — never. Type the command in full.
- Running a script without first reading every line of it.
- "It worked on staging." Production has different load, different data.
- Editing config in-place without a backup. Always: \`cp file file.bak.\$(date +%s)\` first.
- Trusting your shell history when you're tired. Read the actual command before pressing enter.
`,
  },

  {
    name: 'skystack-upgrade',
    displayName: 'skystack Upgrade',
    shortDescription: 'Update skystack to the latest version',
    defaultPrompt: 'Use $skystack-upgrade to update skystack.',
    description:
      'Pull the latest skystack release and rebuild the browse binary. Use when the user asks to "upgrade skystack", "update skystack", or sees a "new version available" notice.',
    body: `# skystack Upgrade

Update skystack to the latest version.

## Workflow

1. **Find the repo root.** The browse binary resolver works backward — given
   the binary path, two parents up is the skystack repo root:

${RESOLVER}

   \`\`\`bash
   REPO=$(dirname "$(dirname "$(dirname "$(readlink -f "$B" 2>/dev/null || realpath "$B")")")")
   \`\`\`

2. **Pull and rebuild:**

   \`\`\`bash
   cd "$REPO"
   git fetch origin
   git pull --ff-only origin main
   ./setup-codex
   \`\`\`

3. **Restart Codex CLI** so it re-scans \`~/.codex/skills/\` for any new or
   renamed skills.

## If the install is read-only

If \`$REPO\` is owned by another user (e.g., system-wide install), tell the
user to upgrade manually:

\`\`\`bash
cd <path-to-skystack> && git pull && ./setup-codex
\`\`\`

Don't try to \`sudo\` automatically.
`,
  },
];

// Skills the previous generator emitted but the new lean pipeline does not.
// setup-codex / this generator clean these up so .agents/skills/ matches
// the canonical list above.
const OBSOLETE = [
  'checkpoint',
  'codex',
  'design',
  'document-release',
  'publish',
  'research',
  'retro',
  'review',
  'security',
];

function yamlBlock(value: string): string {
  return value
    .trim()
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function writeSkill(skill: Skill): boolean {
  const outDir = path.join(OUT_ROOT, skill.name);
  const skillPath = path.join(outDir, 'SKILL.md');
  const openaiPath = path.join(outDir, 'agents', 'openai.yaml');

  const skillContent = `---\nname: ${skill.name}\ndescription: |\n${yamlBlock(skill.description)}\n---\n\n<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->\n\n${skill.body.trim()}\n`;

  const openaiContent = `interface:\n  display_name: ${yamlQuote(skill.displayName)}\n  short_description: ${yamlQuote(skill.shortDescription)}\n  default_prompt: ${yamlQuote(skill.defaultPrompt)}\n\npolicy:\n  allow_implicit_invocation: true\n`;

  let changed = false;
  for (const [file, next] of [
    [skillPath, skillContent],
    [openaiPath, openaiContent],
  ] as const) {
    const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (prev !== next) {
      changed = true;
      if (DRY_RUN) {
        console.log(`STALE ${path.relative(ROOT, file)}`);
      } else {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, next);
        console.log(`WROTE ${path.relative(ROOT, file)}`);
      }
    }
  }
  return changed;
}

function cleanObsolete(): boolean {
  let changed = false;
  for (const name of OBSOLETE) {
    const dir = path.join(OUT_ROOT, name);
    if (!fs.existsSync(dir)) continue;
    changed = true;
    if (DRY_RUN) {
      console.log(`STALE-REMOVE ${path.relative(ROOT, dir)}`);
    } else {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`REMOVED ${path.relative(ROOT, dir)}`);
    }
  }
  return changed;
}

// Create bin/ chain symlinks inside the umbrella skystack skill so
// `~/.codex/skills/skystack/bin/browse` resolves all the way to <repo>/browse/dist/browse.
// Relative targets so the symlinks survive any install location.
function ensureBinSymlinks(): boolean {
  const umbrellaDir = path.join(OUT_ROOT, 'skystack');
  const binDir = path.join(umbrellaDir, 'bin');
  // From <repo>/.agents/skills/skystack/bin/<name>, three "../" land at <repo>.
  const links: Array<[string, string]> = [
    ['browse', '../../../../browse/dist/browse'],
    ['find-browse', '../../../../browse/dist/find-browse'],
    ['mobile', '../../../../mobile/dist/mobile'],
    ['skystack-redact', '../../../../bin/skystack-redact'],
  ];
  let changed = false;
  for (const [name, target] of links) {
    const linkPath = path.join(binDir, name);
    let currentTarget: string | null = null;
    try {
      currentTarget = fs.readlinkSync(linkPath);
    } catch {
      // Missing or not a symlink.
    }
    if (currentTarget === target) continue;

    changed = true;
    if (DRY_RUN) {
      console.log(`STALE-LINK ${path.relative(ROOT, linkPath)}`);
      continue;
    }

    fs.mkdirSync(binDir, { recursive: true });
    fs.rmSync(linkPath, { recursive: true, force: true });
    fs.symlinkSync(target, linkPath);
    console.log(`LINKED ${path.relative(ROOT, linkPath)} -> ${target}`);
  }
  return changed;
}

function assertCatalogMatchesDefinitions(): void {
  const catalogNames = CODEX_SKILLS.map((skill) => skill.name).sort();
  const definitionNames = SKILLS.map((skill) => skill.name).sort();
  if (catalogNames.join('\n') !== definitionNames.join('\n')) {
    throw new Error(
      'Codex generator definitions do not match scripts/skill-catalog.ts.\n' +
      `Catalog: ${catalogNames.join(', ')}\n` +
      `Generator: ${definitionNames.join(', ')}`,
    );
  }
}

function main(): void {
  if (!fs.existsSync(OUT_ROOT) && !DRY_RUN) {
    fs.mkdirSync(OUT_ROOT, { recursive: true });
  }

  assertCatalogMatchesDefinitions();

  let changed = cleanObsolete();
  for (const skill of SKILLS) {
    changed = writeSkill(skill) || changed;
  }

  changed = ensureBinSymlinks() || changed;

  if (DRY_RUN && changed) process.exit(1);
}

main();
