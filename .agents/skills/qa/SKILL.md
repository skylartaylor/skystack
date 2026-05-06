---
name: qa
description: |
  Drive a real browser through user flows, find bugs, and capture evidence (screenshots, console errors, network failures). Optionally fixes the bugs found. Use when the user asks to "test", "QA", "find bugs", "check the site", or "dogfood".
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# QA

Drive a real browser through your app, find bugs, capture evidence.

## When to use

- User says: "test this", "QA this flow", "find bugs", "dogfood", "check the site"
- After a deploy, before merge, or when verifying a bug report

## Workflow

1. **Confirm the test target.** Ask the user for the URL and the flow to test
   if not provided. (Login? Checkout? Create-post? Be specific.)

2. **Resolve browse:**

```bash
for _b in \
  "$HOME/.codex/skills/skystack/bin/browse" \
  "$HOME/.claude/skills/skystack/browse/dist/browse" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/browse/dist/browse"; do
  [ -x "$_b" ] && B="$_b" && break
done
[ -z "${B:-}" ] && { echo "skystack browse binary not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
```


3. **If the flow needs auth:** run `$setup-browser-cookies` first to import
   the user's real browser session.

4. **Walk the flow:**
   - `$B goto <url>`
   - For each step: take a snapshot before, click/fill, snapshot after
   - After each interaction, eval `window.location.href` and check for
     unexpected redirects or 404 / error pages
   - Capture screenshots to `/tmp/qa-<step>.png` for evidence

5. **Capture failures:**
   - Console errors: install a listener via `$B js` before the flow
   - Network failures: same — listen for failed responses
   - Visual regressions: screenshot key states, diff against expected

6. **Report findings.** For each bug:
   - **What:** one-line description
   - **Steps:** exact reproduction
   - **Expected vs Actual**
   - **Evidence:** screenshot path or console error text
   - **Severity:** P1 (blocks user) / P2 (degrades) / P3 (cosmetic)

7. **Fix or report-only?** Default to report-only. If the user explicitly
   asks to fix, make minimal atomic edits via `apply_patch` and re-run the
   flow to verify each fix.

## Bug bar

Only file what a real user would notice. Skip:
- Console warnings that don't affect behavior
- Linter complaints
- Style nits not specified by design

## Wrap-up

Always `$B close` when done.
