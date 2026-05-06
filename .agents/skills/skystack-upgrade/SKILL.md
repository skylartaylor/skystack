---
name: skystack-upgrade
description: |
  Pull the latest skystack release and rebuild the browse binary. Use when the user asks to "upgrade skystack", "update skystack", or sees a "new version available" notice.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# skystack Upgrade

Update skystack to the latest version.

## Workflow

1. **Find the repo root.** The browse binary resolver works backward — given
   the binary path, two parents up is the skystack repo root:

```bash
for _b in \
  "$HOME/.codex/skills/skystack/bin/browse" \
  "$HOME/.claude/skills/skystack/browse/dist/browse" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/browse/dist/browse"; do
  [ -x "$_b" ] && B="$_b" && break
done
[ -z "${B:-}" ] && { echo "skystack browse binary not found — run ./setup-codex from the skystack repo" >&2; exit 1; }
```

   ```bash
   REPO=$(dirname "$(dirname "$(dirname "$(readlink -f "$B" 2>/dev/null || realpath "$B")")")")
   ```

2. **Pull and rebuild:**

   ```bash
   cd "$REPO"
   git fetch origin
   git pull --ff-only origin main
   ./setup-codex
   ```

3. **Restart Codex CLI** so it re-scans `~/.codex/skills/` for any new or
   renamed skills.

## If the install is read-only

If `$REPO` is owned by another user (e.g., system-wide install), tell the
user to upgrade manually:

```bash
cd <path-to-skystack> && git pull && ./setup-codex
```

Don't try to `sudo` automatically.
