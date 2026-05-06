---
name: canary
description: |
  Post-deploy canary monitoring. Loads production URLs in the browse daemon, captures console errors, takes periodic screenshots, alerts on anomalies. Use when the user says "monitor deploy", "watch production", "post-deploy check", or "canary".
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# Canary

Watch a fresh deploy for live errors, console noise, and visual regressions.
This is reactive monitoring — not a replacement for proper observability.

## When to use

- Right after `/publish` or a deploy
- User says: "watch the deploy", "is prod healthy?", "canary"

## Workflow

1. **Pre-deploy baseline.** Before the deploy lands, capture the current
   state of the URL(s) being shipped:
   - Screenshot each key page
   - Snapshot DOM
   - Save `window.__errors` if instrumented

2. **Resolve browse and post-deploy URLs:**

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

3. **Polling loop.** Every 60-120s for the first 10-30 minutes:
   - `$B goto <url>`
   - Capture: HTTP status (via `$B js "performance.timing"`), console
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
