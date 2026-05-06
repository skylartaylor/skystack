---
name: health
description: |
  Read-only code quality dashboard. Runs the project's type checker, linter, tests, and dead-code detector, then produces a weighted 0-10 composite score. Tracks trend over time. Use when the user asks "how's the codebase", "health check", "code quality score".
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# Health

Read-only quality dashboard. Wraps the project's existing tools and produces a
weighted 0-10 composite score. Detects only — never fixes.

## Workflow

1. **Detect the project's tools.** Look for:
   - Type checker: `tsc`, `mypy`, `flow`, etc. (per project config)
   - Linter: `eslint`, `ruff`, `rubocop`, `golangci-lint`, etc.
   - Test runner: `bun test`, `vitest`, `pytest`, `go test`, `bundle exec`, etc.
   - Dead code: `knip`, `ts-prune`, `vulture`, `unused`, etc. (only if configured)

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

   Each category contributes `weight × (passing / total)`. Cap at 10.

4. **Report:**
   ```
   Health: 8.4 / 10
     ✓ Type check: 0 errors
     ✗ Tests: 142/144 passing (2 failing)
     ✓ Lint: 0 errors, 12 warnings
     ⚠ Dead code: 7 unused exports
     ✓ Format: clean
   ```

5. **Trend tracking** (optional). Append to `~/.skystack/projects/<slug>/health.jsonl`
   so the user can see drift over time.

## What this is NOT

- Not an auto-fixer. The point is detection.
- Not a substitute for code review. A 10/10 health score can still be a bad
  codebase (no tests = high score by trivially passing 0 of 0).
- Not opinionated about test coverage % — just whether existing tests pass.
