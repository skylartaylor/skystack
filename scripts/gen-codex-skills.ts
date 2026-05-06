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
 * Skills emitted here wrap binaries or scripts that genuinely add capability
 * to Codex. Pure-AI-workflow skills (pm, design, review, retro, etc.) are NOT
 * ported — Codex's skill-creator already covers those domains, and a verbose
 * Claude port would just burn context.
 */

import * as fs from 'fs';
import * as path from 'path';

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

skystack on Claude Code includes workflow skills like \`/pm\`, \`/design\`,
\`/review\`, \`/retro\` — these are not ported to Codex because Codex's own
skill-creator covers those domains better, and a mechanical port would burn
context with Claude-specific content.

For cross-model review from Codex, use \`$claude-review\`.
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
  'devops',
  'diagnose',
  'document-release',
  'pm',
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

function cleanObsolete(): void {
  for (const name of OBSOLETE) {
    const dir = path.join(OUT_ROOT, name);
    if (!fs.existsSync(dir)) continue;
    if (DRY_RUN) {
      console.log(`STALE-REMOVE ${path.relative(ROOT, dir)}`);
    } else {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`REMOVED ${path.relative(ROOT, dir)}`);
    }
  }
}

// Create bin/ chain symlinks inside the umbrella skystack skill so
// `~/.codex/skills/skystack/bin/browse` resolves all the way to <repo>/browse/dist/browse.
// Relative targets so the symlinks survive any install location.
function ensureBinSymlinks(): void {
  const umbrellaDir = path.join(OUT_ROOT, 'skystack');
  const binDir = path.join(umbrellaDir, 'bin');
  // From <repo>/.agents/skills/skystack/bin/<name>, three "../" land at <repo>.
  const links: Array<[string, string]> = [
    ['browse', '../../../../browse/dist/browse'],
    ['find-browse', '../../../../browse/dist/find-browse'],
    ['mobile', '../../../../mobile/dist/mobile'],
  ];
  if (DRY_RUN) {
    for (const [name] of links) {
      console.log(`STALE-LINK ${path.relative(ROOT, path.join(binDir, name))}`);
    }
    return;
  }
  fs.mkdirSync(binDir, { recursive: true });
  for (const [name, target] of links) {
    const linkPath = path.join(binDir, name);
    try {
      const existing = fs.readlinkSync(linkPath);
      if (existing === target) continue;
      fs.unlinkSync(linkPath);
    } catch {
      // Doesn't exist yet, or isn't a symlink
      if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { force: true });
    }
    fs.symlinkSync(target, linkPath);
    console.log(`LINKED ${path.relative(ROOT, linkPath)} -> ${target}`);
  }
}

function main(): void {
  if (!fs.existsSync(OUT_ROOT) && !DRY_RUN) {
    fs.mkdirSync(OUT_ROOT, { recursive: true });
  }

  cleanObsolete();

  let changed = false;
  for (const skill of SKILLS) {
    changed = writeSkill(skill) || changed;
  }

  ensureBinSymlinks();

  if (DRY_RUN && changed) process.exit(1);
}

main();
