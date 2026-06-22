#!/usr/bin/env python3
"""PreToolUse hook for /careful. Stdin JSON in, decision JSON out."""

import sys
import json
import re
import os
import datetime
import subprocess

SAFE_TARGETS = {
    "node_modules", ".next", "dist", "__pycache__",
    ".cache", "build", ".turbo", "coverage",
}

SEPARATORS = re.compile(r'(?:&&|\|\||;|\|)')


def parse_segments(cmd):
    for seg in SEPARATORS.split(cmd):
        seg = seg.strip()
        if not seg:
            continue
        tokens = seg.split()
        if not tokens:
            continue
        i = 0
        while i < len(tokens):
            t = tokens[i]
            if t in ("sudo", "time", "nice", "nohup"):
                i += 1
                continue
            if re.match(r'^[A-Z_][A-Z0-9_]*=', t):
                i += 1
                continue
            break
        if i >= len(tokens):
            continue
        yield tokens[i], tokens[i + 1:]


def has_recursive_flag(args):
    for a in args:
        if a == "--recursive":
            return True
        if a.startswith("--"):
            continue
        if a.startswith("-") and ("r" in a or "R" in a):
            return True
    return False


def rm_targets_all_safe(args):
    # Every non-flag arg must be a known build-artifact dir.
    saw_target = False
    for a in args:
        if a.startswith("-"):
            continue
        saw_target = True
        name = a.rstrip("/").rsplit("/", 1)[-1]
        if name not in SAFE_TARGETS:
            return False
    return saw_target


def check(cmd):
    cmd_lower = cmd.lower()

    rm_invocations = []
    for head, args in parse_segments(cmd):
        if head == "rm" and has_recursive_flag(args):
            rm_invocations.append(args)

    if rm_invocations:
        if not all(rm_targets_all_safe(args) for args in rm_invocations):
            return ("Destructive: recursive delete (rm -r). This permanently removes files.", "rm_recursive")
    elif re.search(r'\brm\s+(?:-[A-Za-z]*[rR]|--recursive)\b', cmd):
        # Recursive rm reached via find -exec / xargs / eval — catch broadly.
        return ("Destructive: recursive delete (rm -r). This permanently removes files.", "rm_recursive")

    if re.search(r'\bdrop\s+(table|database)\b', cmd_lower):
        return ("Destructive: SQL DROP detected. This permanently deletes database objects.", "drop_table")

    if re.search(r'\btruncate\s+(table\s+)?\w', cmd_lower):
        return ("Destructive: SQL TRUNCATE detected. This deletes all rows from a table.", "truncate")

    if re.search(r'\bdelete\s+from\b', cmd_lower) and not re.search(r'\bwhere\b', cmd_lower):
        return ("Destructive: SQL DELETE without WHERE deletes every row.", "delete_no_where")

    if re.search(r'\b(grant|revoke)\s+\w+\s+(on|to|from)\b', cmd_lower):
        return ("Destructive: SQL privilege change (GRANT/REVOKE). May alter access control.", "sql_privilege")

    if re.search(r'\bgit\s+push\b[^|;&]*?(?:--force(?:-with-lease)?\b|-[A-Za-z]*f\b)', cmd):
        return ("Destructive: git force-push rewrites remote history. Other contributors may lose work.", "git_force_push")

    if re.search(r'\bgit\s+reset\s+--hard\b', cmd):
        return ("Destructive: git reset --hard discards all uncommitted changes.", "git_reset_hard")

    if re.search(r'\bgit\s+(?:checkout|restore)\s+\.\s*$', cmd) or re.search(r'\bgit\s+(?:checkout|restore)\s+\.(?:\s|[;&|])', cmd):
        return ("Destructive: discards all uncommitted changes in the working tree.", "git_discard")

    if re.search(r'\bgit\s+clean\b[^|;&]*?-[A-Za-z]*[fd]', cmd):
        return ("Destructive: git clean removes untracked files. May delete unstaged work.", "git_clean")

    if re.search(r'\bfind\b[^|;&]*?-delete\b', cmd):
        return ("Destructive: find -delete removes files. Verify the path filter is correct.", "find_delete")

    if re.search(r'\bdd\b[^|;&]*?\bof=', cmd):
        return ("Destructive: dd write detected. May overwrite disks or device files.", "dd_write")

    if re.search(r'\bshred\b', cmd):
        return ("Destructive: shred permanently destroys file contents.", "shred")

    if re.search(r'\brsync\b[^|;&]*?--delete\b', cmd):
        return ("Destructive: rsync --delete removes files at the destination missing from the source.", "rsync_delete")

    if re.search(r'\bkubectl\s+delete\b', cmd):
        return ("Destructive: kubectl delete removes Kubernetes resources. May impact production.", "kubectl_delete")

    if re.search(r'\bdocker\s+(?:rm\s+-[A-Za-z]*f|system\s+prune)', cmd):
        return ("Destructive: Docker force-remove or prune. May delete running containers or cached images.", "docker_destructive")

    return None


def log_event(skill, pattern):
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
            "skill": skill,
            "pattern": pattern,
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
    cmd = (data.get("tool_input") or {}).get("command", "")
    if not isinstance(cmd, str) or not cmd:
        print("{}")
        return

    decision = check(cmd)
    if decision:
        msg, pattern = decision
        log_event("careful", pattern)
        print(json.dumps({
            "permissionDecision": "ask",
            "message": f"[careful] {msg}",
        }))
    else:
        print("{}")


if __name__ == "__main__":
    main()
