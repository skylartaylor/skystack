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
| `$browse` | Headless Chromium CLI: navigate, click, screenshot, eval JS |
| `$qa` | Drive the app in a real browser, find bugs, capture evidence |
| `$benchmark` | Compare page-load + Core Web Vitals between two refs |
| `$canary` | Watch a deployment for console errors / regressions post-deploy |
| `$health` | Run project tests + linters, score 0-10 with trend tracking |
| `$setup-browser-cookies` | Import auth cookies from a real browser |
| `$skystack-upgrade` | Update skystack to the latest version |

## Resolving the install path

If you need to invoke a binary directly:

```bash
for _d in "$(git rev-parse --show-toplevel 2>/dev/null)" \
         "$HOME/.codex/skills/skystack" \
         "$HOME/.agents/skills/skystack" \
         "$HOME/.claude/skills/skystack"; do
  [ -x "$_d/browse/dist/browse" ] && SKYSTACK_DIR="$_d" && break
done
[ -z "${SKYSTACK_DIR:-}" ] && { echo "skystack not installed" >&2; exit 1; }
```

After this, `$SKYSTACK_DIR/browse/dist/browse` is the browse binary. The
sub-skills above already include this resolution inline.

## What's NOT here (intentionally)

skystack on Claude Code includes workflow skills like `/pm`, `/design`,
`/review`, `/retro` — these are not ported to Codex because Codex's own
skill-creator covers those domains better, and a mechanical port would burn
context with Claude-specific content.

For cross-model review from Codex, use `$claude-review`.
