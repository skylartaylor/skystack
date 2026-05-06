---
name: skystack
description: |
  Umbrella skill for skystack tooling: headless Chromium CLI, browser-based QA, performance benchmarking, post-deploy monitoring, code-quality scoring. Use when the user mentions skystack, asks what skystack does, or needs an overview before invoking a specific sub-skill.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# skystack

skystack bundles a headless Chromium CLI (`browse`) and a few QA / monitoring
helpers. Each capability is its own skill — invoke them by name.

## Sub-skills

| Skill | Purpose |
|-------|---------|
| `$pm` | Idea → spec → build → ship; structured feature workflow |
| `$diagnose` | Systematic debugging — root cause first, fix second |
| `$devops` | Safe infra ops with command classification + rollback discipline |
| `$browse` | Headless Chromium CLI: navigate, click, screenshot, eval JS |
| `$qa` | Drive the app in a real browser, find bugs, capture evidence |
| `$benchmark` | Compare page-load + Core Web Vitals between two refs |
| `$canary` | Watch a deployment for console errors / regressions post-deploy |
| `$health` | Run project tests + linters, score 0-10 with trend tracking |
| `$setup-browser-cookies` | Import auth cookies from a real browser |
| `$skystack-upgrade` | Update skystack to the latest version |

## Resolving the browse binary

If you need to invoke the headless browser binary directly:

```bash
for _b in \
  "$HOME/.codex/skills/skystack/bin/browse" \
  "$HOME/.claude/skills/skystack/browse/dist/browse" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/browse/dist/browse"; do
  [ -x "$_b" ] && B="$_b" && break
done
[ -z "${B:-}" ] && { echo "skystack browse binary not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
```

After this, `$B` is the absolute path to the browse binary. Each sub-skill
includes this resolver inline so they remain self-contained.

## What's NOT here (intentionally)

skystack on Claude Code includes workflow skills like `/pm`, `/design`,
`/review`, `/retro` — these are not ported to Codex because Codex's own
skill-creator covers those domains better, and a mechanical port would burn
context with Claude-specific content.

For cross-model review from Codex, use `$claude-review`.
