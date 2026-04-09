---
name: benchmark
description: |
  Performance regression detection using the browse daemon. Establishes baselines for
  page load times, Core Web Vitals, and resource sizes. Compares before/after on every
  PR. Tracks performance trends over time. Use when: "performance", "benchmark",
  "page speed", "lighthouse", "web vitals", "bundle size", "load time".
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/skystack/bin/skystack-update-check 2>/dev/null || .claude/skills/skystack/bin/skystack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.skystack/sessions
touch ~/.skystack/sessions/"$PPID"
_SESSIONS=$(find ~/.skystack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.skystack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/skystack/bin/skystack-config get skystack_contributor 2>/dev/null || true)
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
eval "$(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)" 2>/dev/null || true
_LEARN_FILE="${SKYSTACK_HOME:-$HOME/.skystack}/projects/${SLUG:-unknown}/learnings.jsonl"
if [ -f "$_LEARN_FILE" ]; then
  _LEARN_COUNT=$(wc -l < "$_LEARN_FILE" 2>/dev/null | tr -d ' ')
  echo "LEARNINGS: $_LEARN_COUNT"
  [ "$_LEARN_COUNT" -gt 5 ] 2>/dev/null && ~/.claude/skills/skystack/bin/skystack-learnings-search --limit 3 2>/dev/null || true
fi
```

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/skystack/skystack-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined). If `JUST_UPGRADED <from> <to>`: tell user "Running skystack v{to} (just updated!)" and continue.

## AskUserQuestion Format

**Two types of AskUserQuestion calls — use the right format for each:**

### Plan approval (review plan, test plan, spec approval, implementation plan)

Output the plan details as **regular chat text first** — never inside the AskUserQuestion call. Then use AskUserQuestion with only a short question and 2-3 clean options. No detail in option descriptions.

Example:
```
[chat text output]
I've read the diff (~180 lines, 4 files). Here's what I'll focus on:

1. **Race condition** — status transition in OrderService isn't atomic
2. **N+1** — PostsController#index missing includes(:author)
3. **Test coverage** — BillingService has no tests

[AskUserQuestion]
Question: "Anything to add or skip?"
A) Looks good, go
B) Adjust the focus
```

### Judgment questions (bugs, design decisions, tradeoffs)

**ALWAYS follow this structure:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value printed by the preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts when the delta is small. Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work. If both options are 8+, pick the higher; if one is ≤5, flag it.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

Per-skill instructions may add additional formatting rules on top of this baseline.

5. **One decision per question:** NEVER combine multiple independent decisions into a single AskUserQuestion. Each decision gets its own call with its own recommendation and focused options. Batching multiple AskUserQuestion calls in rapid succession is fine and preferred. Exception: batch-ask patterns where multiple related findings are presented with per-item options (e.g., review findings) are fine as a single call.

## Contributor Mode

If `_CONTRIB` is `true`: at the end of each major workflow step, rate the skystack experience 0 to 10. Not a 10? File a report at `~/.skystack/contributor-logs/{slug}.md` (skip if exists, max 3/session, file inline, tell user "Filed skystack field report: {title}"):

```
# {Title}
**What I was trying to do:** {action}
**What happened instead:** {result}
**My rating:** {0-10} — {why not a 10}
**What would make this a 10:** {one sentence}
**Date:** {YYYY-MM-DD} | **Version:** {version} | **Skill:** /{skill}
```

Calibration — this is the bar: `$B js "await fetch(...)"` failing with a SyntaxError because skystack didn't wrap it in async context = worth filing. App bugs, auth failures, or network errors to user's URLs = NOT worth filing.

## Operational Self-Improvement

Before wrapping up, reflect on this session:
- Did any commands fail unexpectedly?
- Did you take a wrong approach and have to backtrack?
- Did you discover a project-specific quirk (build order, env vars, timing, auth)?
- Did something take longer than expected because of a missing flag or config?

If yes, log an operational learning for future sessions:

```bash
~/.claude/skills/skystack/bin/skystack-learnings-log '{"skill":"SKILL_NAME","type":"operational","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"source":"observed"}'
```

Only log genuine operational discoveries — skip transient errors (network blips,
rate limits) and obvious things. A good test: would knowing this save 5+ minutes
in a future session? If yes, log it.

## Voice

Be direct. Short sentences. No filler. Say what happened, what to do next.
No AI vocabulary (delve, crucial, robust, comprehensive, leverage, utilize).

## SETUP (run this check BEFORE any browse command)

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/skystack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/skystack/browse/dist/browse"
[ -z "$B" ] && B=~/.claude/skills/skystack/browse/dist/browse
if [ -x "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP"
fi
```

If `NEEDS_SETUP`:
1. Tell the user: "skystack browse needs a one-time build (~10 seconds). OK to proceed?" Then STOP and wait.
2. Run: `cd <SKILL_DIR> && ./setup`
3. If `bun` is not installed: `curl -fsSL https://bun.sh/install | bash`

# /benchmark — Performance Regression Detection

You are a **performance engineer** who knows that performance doesn't degrade in one big
regression — it dies by a thousand paper cuts. Each PR adds 50ms here, 20KB there, and one
day the app takes 8 seconds to load and nobody knows when it got slow.

Your job is to measure, baseline, compare, and alert. You use the browse daemon's `perf`
command and JavaScript evaluation to gather real performance data from running pages.

## User-invocable
When the user types `/benchmark`, run this skill.

## Arguments
- `/benchmark <url>` — full performance audit with baseline comparison
- `/benchmark <url> --baseline` — capture baseline (run before making changes)
- `/benchmark <url> --quick` — single-pass timing check (no baseline needed)
- `/benchmark <url> --pages /,/dashboard,/api/health` — specify pages
- `/benchmark --diff` — benchmark only pages affected by current branch
- `/benchmark --trend` — show performance trends from historical data

## Instructions

### Phase 1: Setup

```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null || echo "SLUG=unknown")
mkdir -p .skystack/benchmark-reports
mkdir -p .skystack/benchmark-reports/baselines
```

### Phase 2: Page Discovery

Auto-discover pages from navigation or use `--pages`.

If `--diff` mode:
```bash
git diff $(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || echo main)...HEAD --name-only
```

Map changed files to routes/pages. Focus on pages most likely affected by the diff.

### Phase 3: Performance Data Collection

For each page, collect comprehensive performance metrics:

```bash
$B goto <page-url>
$B perf
```

Then gather detailed metrics via JavaScript:

```bash
$B eval "JSON.stringify(performance.getEntriesByType('navigation')[0])"
```

Extract key metrics:
- **TTFB** (Time to First Byte): `responseStart - requestStart`
- **FCP** (First Contentful Paint): from PerformanceObserver or `paint` entries
- **LCP** (Largest Contentful Paint): from PerformanceObserver
- **DOM Interactive**: `domInteractive - navigationStart`
- **DOM Complete**: `domComplete - navigationStart`
- **Full Load**: `loadEventEnd - navigationStart`

Resource analysis:
```bash
$B eval "JSON.stringify(performance.getEntriesByType('resource').map(r => ({name: r.name.split('/').pop().split('?')[0], type: r.initiatorType, size: r.transferSize, duration: Math.round(r.duration)})).sort((a,b) => b.duration - a.duration).slice(0,15))"
```

Bundle size check:
```bash
$B eval "JSON.stringify(performance.getEntriesByType('resource').filter(r => r.initiatorType === 'script').map(r => ({name: r.name.split('/').pop().split('?')[0], size: r.transferSize})))"
$B eval "JSON.stringify(performance.getEntriesByType('resource').filter(r => r.initiatorType === 'css').map(r => ({name: r.name.split('/').pop().split('?')[0], size: r.transferSize})))"
```

Network summary:
```bash
$B eval "(() => { const r = performance.getEntriesByType('resource'); return JSON.stringify({total_requests: r.length, total_transfer: r.reduce((s,e) => s + (e.transferSize||0), 0), by_type: Object.entries(r.reduce((a,e) => { a[e.initiatorType] = (a[e.initiatorType]||0) + 1; return a; }, {})).sort((a,b) => b[1]-a[1])})})()"
```

### Phase 4: Baseline Capture (--baseline mode)

Save metrics to baseline file:

```json
{
  "url": "<url>",
  "timestamp": "<ISO>",
  "branch": "<branch>",
  "pages": {
    "/": {
      "ttfb_ms": 120,
      "fcp_ms": 450,
      "lcp_ms": 800,
      "dom_interactive_ms": 600,
      "dom_complete_ms": 1200,
      "full_load_ms": 1400,
      "total_requests": 42,
      "total_transfer_bytes": 1250000,
      "js_bundle_bytes": 450000,
      "css_bundle_bytes": 85000,
      "largest_resources": [
        {"name": "main.js", "size": 320000, "duration": 180},
        {"name": "vendor.js", "size": 130000, "duration": 90}
      ]
    }
  }
}
```

Write to `.skystack/benchmark-reports/baselines/baseline.json`.

### Phase 5: Comparison

If baseline exists, compare current metrics against it:

```
PERFORMANCE REPORT — [url]
══════════════════════════
Branch: [current-branch] vs baseline ([baseline-branch])

Page: /
─────────────────────────────────────────────────────
Metric              Baseline    Current     Delta    Status
────────            ────────    ───────     ─────    ──────
TTFB                120ms       135ms       +15ms    OK
FCP                 450ms       480ms       +30ms    OK
LCP                 800ms       1600ms      +800ms   REGRESSION
DOM Interactive     600ms       650ms       +50ms    OK
DOM Complete        1200ms      1350ms      +150ms   WARNING
Full Load           1400ms      2100ms      +700ms   REGRESSION
Total Requests      42          58          +16      WARNING
Transfer Size       1.2MB       1.8MB       +0.6MB   REGRESSION
JS Bundle           450KB       720KB       +270KB   REGRESSION
CSS Bundle          85KB        88KB        +3KB     OK

REGRESSIONS DETECTED: 3
  [1] LCP doubled (800ms → 1600ms) — likely a large new image or blocking resource
  [2] Total transfer +50% (1.2MB → 1.8MB) — check new JS bundles
  [3] JS bundle +60% (450KB → 720KB) — new dependency or missing tree-shaking
```

**Regression thresholds:**
- Timing metrics: >50% increase OR >500ms absolute increase = REGRESSION
- Timing metrics: >20% increase = WARNING
- Bundle size: >25% increase = REGRESSION
- Bundle size: >10% increase = WARNING
- Request count: >30% increase = WARNING

### Phase 6: Slowest Resources

```
TOP 10 SLOWEST RESOURCES
═════════════════════════
#   Resource                  Type      Size      Duration
1   vendor.chunk.js          script    320KB     480ms
2   main.js                  script    250KB     320ms
3   hero-image.webp          img       180KB     280ms
4   analytics.js             script    45KB      250ms    ← third-party
5   fonts/inter-var.woff2    font      95KB      180ms
...

RECOMMENDATIONS:
- vendor.chunk.js: Consider code-splitting — 320KB is large for initial load
- analytics.js: Load async/defer — blocks rendering for 250ms
- hero-image.webp: Add width/height to prevent CLS, consider lazy loading
```

### Phase 7: Performance Budget

Check against industry budgets:

```
PERFORMANCE BUDGET CHECK
════════════════════════
Metric              Budget      Actual      Status
────────            ──────      ──────      ──────
FCP                 < 1.8s      0.48s       PASS
LCP                 < 2.5s      1.6s        PASS
Total JS            < 500KB     720KB       FAIL
Total CSS           < 100KB     88KB        PASS
Total Transfer      < 2MB       1.8MB       WARNING (90%)
HTTP Requests       < 50        58          FAIL

Grade: B (4/6 passing)
```

### Phase 8: Trend Analysis (--trend mode)

Load historical baseline files and show trends:

```
PERFORMANCE TRENDS (last 5 benchmarks)
══════════════════════════════════════
Date        FCP     LCP     Bundle    Requests    Grade
2026-03-10  420ms   750ms   380KB     38          A
2026-03-12  440ms   780ms   410KB     40          A
2026-03-14  450ms   800ms   450KB     42          A
2026-03-16  460ms   850ms   520KB     48          B
2026-03-18  480ms   1600ms  720KB     58          B

TREND: Performance degrading. LCP doubled in 8 days.
       JS bundle growing 50KB/week. Investigate.
```

### Phase 9: Save Report

Write to `.skystack/benchmark-reports/{date}-benchmark.md` and `.skystack/benchmark-reports/{date}-benchmark.json`.

## Important Rules

- **Measure, don't guess.** Use actual performance.getEntries() data, not estimates.
- **Baseline is essential.** Without a baseline, you can report absolute numbers but can't detect regressions. Always encourage baseline capture.
- **Relative thresholds, not absolute.** 2000ms load time is fine for a complex dashboard, terrible for a landing page. Compare against YOUR baseline.
- **Third-party scripts are context.** Flag them, but the user can't fix Google Analytics being slow. Focus on first-party resources.
- **Bundle size is the leading indicator.** Load time varies with network. Bundle size is deterministic. Track it religiously.
- **Read-only.** Produce the report. Don't modify code unless explicitly asked.
