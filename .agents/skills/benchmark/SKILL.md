---
name: benchmark
description: |
  Performance regression detection. Loads pages with the browse daemon, measures Core Web Vitals (LCP, FID, CLS), bundle sizes, and resource counts. Compares before/after on every PR. Use when the user asks about "performance", "page speed", "lighthouse-like check", "bundle size", or "regression".
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# Benchmark

Detect performance regressions by comparing page load metrics between two
git refs (typically base branch vs current).

## When to use

- User says: "is this slower?", "benchmark", "perf check", "did bundle size grow?"
- Before merging a PR that touches frontend code

## Workflow

1. **Resolve browse:**

```bash
for _d in "$(git rev-parse --show-toplevel 2>/dev/null)" \
         "$HOME/.codex/skills/skystack" \
         "$HOME/.agents/skills/skystack" \
         "$HOME/.claude/skills/skystack"; do
  [ -x "$_d/browse/dist/browse" ] && SKYSTACK_DIR="$_d" && break
done
[ -z "${SKYSTACK_DIR:-}" ] && { echo "skystack not installed" >&2; exit 1; }
```

   ```bash
   B="$SKYSTACK_DIR/browse/dist/browse"
   ```

2. **Identify the URL(s) to benchmark.** Ask the user for the deployed URL
   on each ref (preview deploys are common; or run a local dev server twice).

3. **For each ref / URL pair, capture metrics:**

   ```bash
   $B goto <url>
   $B js "JSON.stringify({
     lcp: performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]?.startTime,
     ttfb: performance.timing.responseStart - performance.timing.requestStart,
     transferred: performance.getEntriesByType('resource').reduce((a,r)=>a+r.transferSize,0),
     resourceCount: performance.getEntriesByType('resource').length
   })"
   ```

   Run each URL 3 times, take the median.

4. **Compare and report.** For each metric:
   - Old → New (delta, % change)
   - Flag regressions > 10% as warnings, > 25% as failures

5. **Bundle size:** if you have local builds, `du -sh dist/` or equivalent
   on each ref tells the story without touching the browser.

## Bar for filing a regression

A single noisy run isn't a regression. Require:
- Median of 3 runs is > 10% worse on at least one Core Web Vital, OR
- Bundle transferSize grew > 25KB and isn't explained by a feature

Below that bar, just report numbers and let the user decide.
