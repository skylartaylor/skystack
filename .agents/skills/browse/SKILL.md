---
name: browse
description: |
  Headless Chromium CLI (~100ms/command). Navigate, click, screenshot, evaluate JavaScript, take responsive snapshots. Use when the user asks to "open in browser", "test a URL", "screenshot", "scrape", or wants to verify a deployment.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# Browse

Headless Chromium CLI built on Playwright. Each command is ~100ms.

## Resolve the binary

```bash
for _b in \
  "$HOME/.codex/skills/skystack/bin/browse" \
  "$HOME/.claude/skills/skystack/browse/dist/browse" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/browse/dist/browse"; do
  [ -x "$_b" ] && B="$_b" && break
done
[ -z "${B:-}" ] && { echo "skystack browse binary not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
```

After this, `$B` is the absolute path to the browse binary.

## Common commands

| Command | What it does |
|---------|--------------|
| `$B goto <url>` | Navigate to URL (creates a session if none) |
| `$B click <selector>` | Click an element |
| `$B fill <selector> <value>` | Fill an input |
| `$B screenshot <path>` | Save a PNG of the current viewport |
| `$B snapshot` | Print accessibility tree of current page |
| `$B js "<expression>"` | Eval JS in page context, print result |
| `$B url` | Print current URL |
| `$B back` / `$B forward` / `$B reload` | History nav |
| `$B close` | End the session |

Run `$B --help` for the full list. Sessions persist between commands until
`close`, which is what makes flows fast.

## Patterns

**Smoke-test a deployed page:**

```bash
$B goto https://example.com
$B js "document.title"
$B screenshot /tmp/example.png
$B close
```

**Authenticated testing:** run `$setup-browser-cookies` first to import a
real browser session, then `$B goto` will be logged in.

**Capture console errors:** `$B js "JSON.stringify(window.__errors || [])"`
after wiring an error listener.

## Notes

- The binary launches its own Playwright Chromium. No system Chrome required.
- For full QA flows (find bugs, file reports), use `$qa` instead — it
  composes multiple browse calls into a workflow.
