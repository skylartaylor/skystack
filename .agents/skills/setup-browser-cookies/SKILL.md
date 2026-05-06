---
name: setup-browser-cookies
description: |
  Import cookies from your real browser (Chrome, Arc, Brave, Edge, Comet) into the headless browse session so the next $browse call is logged in. Opens an interactive picker UI for domain selection. Use before authenticated QA testing.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# Setup Browser Cookies

Import cookies from your real browser into the headless `$browse` session
so authenticated pages just work.

## When to use

- Before `$qa` if the flow requires login
- Before `$browse goto` on any auth-gated URL
- User says: "log into the site", "import my cookies", "authenticate the browser"

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

2. **Run the cookie import command:**

   ```bash
   $B cookies-import
   ```

   This opens an interactive picker showing detected browsers and the cookie
   domains they have. The user selects which domains to import.

3. **Verify.** After import:

   ```bash
   $B goto <auth-protected-url>
   $B js "document.title"  # should show authed page, not login
   ```

## Notes

- Cookies are imported per-domain. Don't import every cookie the user has —
  pick the specific domain(s) the test target needs.
- Imported cookies persist for the browse session. `$B close` clears them.
- Some sites (Google, Apple) bind cookies to user agent / device fingerprint;
  imports may not survive. Fall back to a manual login flow there.
