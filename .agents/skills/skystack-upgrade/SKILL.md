---
name: skystack-upgrade
description: |
  Pull the latest skystack release and rebuild the browse binary. Use when the user asks to "upgrade skystack", "update skystack", or sees a "new version available" notice.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# skystack Upgrade

Update skystack to the latest version.

## Workflow

1. **Find the install:**

```bash
for _d in "$(git rev-parse --show-toplevel 2>/dev/null)" \
         "$HOME/.codex/skills/skystack" \
         "$HOME/.agents/skills/skystack" \
         "$HOME/.claude/skills/skystack"; do
  [ -x "$_d/browse/dist/browse" ] && SKYSTACK_DIR="$_d" && break
done
[ -z "${SKYSTACK_DIR:-}" ] && { echo "skystack not installed" >&2; exit 1; }
```

2. **Pull and rebuild:**

   ```bash
   cd "$SKYSTACK_DIR"
   git fetch origin
   git pull --ff-only origin main
   ./setup-codex
   ```

3. **Restart Codex CLI** so it re-scans `~/.codex/skills/` for any new or
   renamed skills.

## If the install is read-only

If `$SKYSTACK_DIR` is owned by another user (e.g., system-wide install),
tell the user to upgrade manually:

```bash
cd <path-to-skystack> && git pull && ./setup-codex
```

Don't try to `sudo` automatically.
