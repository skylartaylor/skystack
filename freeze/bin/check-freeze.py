#!/usr/bin/env python3
"""PreToolUse hook for /freeze. Denies Edit/Write whose fully-resolved
path lies outside the freeze boundary. Resolves symlinks at every
component, basename included — a symlink inside the boundary cannot
point out and escape."""

import sys
import json
import os
import datetime
import subprocess
from pathlib import Path


def state_dir():
    # Ignore CLAUDE_PLUGIN_DATA on purpose — the template writes here, the
    # hook reads here, and a divergence would silently fail-open.
    return os.path.join(os.path.expanduser("~"), ".skystack")


def read_freeze_dir():
    path = os.path.join(state_dir(), "freeze-dir.txt")
    if not os.path.isfile(path):
        return ""
    try:
        with open(path) as f:
            # Preserve internal whitespace — paths with spaces are valid.
            return f.read().rstrip("\r\n").rstrip()
    except Exception:
        return ""


def resolve_fully(p):
    # strict=False so Write on a not-yet-created file inside the boundary works.
    if not p:
        return p
    if not p.startswith("/"):
        p = os.path.join(os.getcwd(), p)
    pp = Path(p)
    try:
        return str(pp.resolve(strict=False))
    except Exception:
        try:
            parent = pp.parent.resolve(strict=False)
            return str(parent / pp.name)
        except Exception:
            return os.path.normpath(p)


def log_event(file_path):
    try:
        analytics_dir = os.path.join(os.path.expanduser("~"), ".skystack", "analytics")
        os.makedirs(analytics_dir, exist_ok=True)
        try:
            repo = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                capture_output=True, text=True, timeout=2,
            )
            repo_name = os.path.basename(repo.stdout.strip()) if repo.returncode == 0 else "unknown"
        except Exception:
            repo_name = "unknown"
        event = {
            "event": "hook_fire",
            "skill": "freeze",
            "pattern": "boundary_deny",
            "ts": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "repo": repo_name,
        }
        with open(os.path.join(analytics_dir, "skill-usage.jsonl"), "a") as f:
            f.write(json.dumps(event) + "\n")
    except Exception:
        pass


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        print("{}")
        return
    try:
        data = json.loads(raw)
    except Exception:
        print("{}")
        return
    if not isinstance(data, dict):
        print("{}")
        return

    file_path = (data.get("tool_input") or {}).get("file_path", "")
    if not isinstance(file_path, str) or not file_path:
        print("{}")
        return

    freeze_dir = read_freeze_dir()
    if not freeze_dir:
        print("{}")
        return

    resolved_file = resolve_fully(file_path)
    resolved_freeze = resolve_fully(freeze_dir).rstrip("/")

    inside = (
        resolved_file == resolved_freeze
        or resolved_file.startswith(resolved_freeze + "/")
    )

    if inside:
        print("{}")
        return

    log_event(resolved_file)
    print(json.dumps({
        "permissionDecision": "deny",
        "message": (
            f"[freeze] Blocked: {resolved_file} is outside the freeze "
            f"boundary ({resolved_freeze}). Only edits within the frozen "
            f"directory are allowed."
        ),
    }))


if __name__ == "__main__":
    main()
