---
name: devops
description: |
  Safe infrastructure operations: servers, web servers, DNS, SSL, Docker, Kubernetes, firewalls. Classifies every command (SAFE/CAUTION/DANGER), backs up before destructive ops, prefers reversible operations, reads existing runbooks first, documents changes after. Use when the user mentions "set up nginx", "configure DNS", "deploy helm chart", "kubectl", "ssl cert", "firewall", "iptables", "docker compose", "server management", or any production infra change.
---

<!-- AUTO-GENERATED. Source: scripts/gen-codex-skills.ts. Edit there, not here. -->

# DevOps

Safe infrastructure operations. Bar: never run a destructive command without a
backup, an explicit user acknowledgment, and a documented rollback path.

## When to use

- "set up nginx", "configure DNS", "deploy helm chart", "kubectl <anything>"
- "ssl certificate", "firewall", "iptables", "ufw", "docker compose"
- Anything touching production infra or shared infrastructure

## Iron rules

1. **Read existing runbooks first.** Look in `runbooks/`, `docs/ops/`, the
   README. If "how we deploy" is documented, follow it. Don't reinvent.
2. **Show every shell command in plain text BEFORE running.** Never silent
   side effects.
3. **Classify each command** (SAFE / CAUTION / DANGER — see below). Confirm
   any CAUTION op once; require explicit acknowledgment for any DANGER op.
4. **Back up before destructive ops.** Test the restore path actually works
   before you destroy the original.
5. **Reversible > clever.** If you can't roll back, it's not done.

## Command classification

### SAFE — run freely, no confirmation needed

Read-only or zero-side-effect:
- `cat`, `ls`, `tail`, `grep`
- `kubectl get`, `kubectl describe`, `docker ps`, `docker inspect`
- `dig`, `curl -I`, `curl -s` (idempotent GETs)
- `systemctl status`, `journalctl`, `nginx -t` (test config without applying)

### CAUTION — show command + ask before running

Reversible side effects:
- Service restarts: `systemctl restart`, `nginx -s reload`
- Config edits to live files (`nginx.conf`, `docker-compose.yml`)
- Container starts/stops: `docker compose up`, `docker stop`
- DNS records (changes propagate, but TTLs let you roll back)
- Adding firewall rules with `ufw allow`

### DANGER — show command + back up + EXPLICIT acknowledgment

Hard-to-reverse or destructive:
- `rm -rf /`, `kubectl delete`, `docker volume rm`, `systemctl disable`
- Firewall flushes: `iptables -F`
- DB schema changes, `DROP TABLE`, `TRUNCATE`, destructive migrations
- Renaming or deleting filesystems
- Force-pushing to deployment branches

For DANGER ops, the user types "yes I understand" or equivalent. Don't proceed
on a one-tap confirmation.

## Workflow

1. **Orient.** What's the target? SSH? Kubernetes? Local Docker? Run
   diagnostics to confirm you're talking to the right thing:
   ```bash
   uname -a
   kubectl config current-context  # if k8s
   docker info                     # if docker
   ```

2. **Read existing runbooks** before forming a plan. If they exist, mention
   what you found and what (if anything) you're departing from.

3. **Plan.** Output the full sequence of commands you'll run, with each one
   classified. Get approval for any CAUTION or DANGER step before running it.

4. **Execute step by step.** After each CAUTION/DANGER op, verify:
   - Did the service come back up? (`systemctl status`, `kubectl rollout status`)
   - Did the cert issue / renew? (`openssl s_client`, `curl -vI`)
   - Did DNS propagate? (`dig +short @8.8.8.8`)
   Don't proceed to step N+1 until step N is confirmed working.

5. **Document.** Append to the runbook (create one if missing) using this format:

   ```markdown
   ## YYYY-MM-DD — <one-line summary>
   **What:** <what was done>
   **Why:** <reason / ticket / incident link>
   **Commands:**
   \`\`\`
   <copy-pasteable list, in order>
   \`\`\`
   **Rollback:** <how to undo, with exact commands>
   **Verified by:** <how you confirmed it worked>
   ```

## Incident tracking

If something breaks during ops:
- Capture the exact command + timestamp
- Pull relevant logs: `journalctl -u <service> --since "5 min ago"`,
  `kubectl logs <pod> --previous`, `docker logs <container>`
- Stop. Don't keep flailing. Write down 2-3 hypotheses, test ONE at a time.
- File an incident at `incidents/YYYY-MM-DD-<slug>.md`:

```markdown
## Incident: <one-line description>
**When:** <ISO timestamp> — <duration>
**Impact:** <who / what was affected>

## Timeline
- <HH:MM> — <event>
- <HH:MM> — <event>

## Root cause
<be specific. "nginx misconfig" is not a root cause.
"missing upstream block in /etc/nginx/sites-enabled/api.conf
caused 502s on /api/v1/*" is.>

## Resolution
<exact commands run to fix it>

## Prevention
<how to make sure this can't happen again — config check in CI? alert?
runbook update? deploy gate?>
```

## Anti-patterns (don't do these)

- `sudo !!` — never. Type the command in full.
- Running a script without first reading every line of it.
- "It worked on staging." Production has different load, different data.
- Editing config in-place without a backup. Always: `cp file file.bak.$(date +%s)` first.
- Trusting your shell history when you're tired. Read the actual command before pressing enter.
