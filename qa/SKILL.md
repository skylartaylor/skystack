---
name: qa
description: |
  Drive a real browser or mobile simulator through user flows, find bugs, and
  capture evidence. Fix bugs only when requested. Use when asked to test, QA,
  dogfood, find bugs, check a site, test mobile, or produce a QA report.
argument-hint: "<url> [--report-only] [--quick|--exhaustive]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - Agent
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# QA

Test the product like a real user, capture evidence, and report only issues a
user would notice. If the user asked for fixes, make minimal fixes and rerun the
failing flow. Otherwise remain read-only.

## Set up

Use a project-local tester reference at `.skystack/references/tester.md` when it
exists. Otherwise use the bundled `references/tester.md` if available. Treat it
as additional issue taxonomy and heuristics, not a script to follow blindly.

## SETUP (run this check BEFORE any browse command)

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/skystack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/skystack/browse/dist/browse"
[ -z "$B" ] && B=~/.claude/skills/skystack/browse/dist/browse
if [ -x "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP"
fi
```

If `NEEDS_SETUP`:
1. Tell the user: "skystack browse needs a one-time build (~10 seconds). OK to proceed?" Then STOP and wait.
2. Run: `cd <SKILL_DIR> && ./setup`
3. If `bun` is not installed: `curl -fsSL https://bun.sh/install | bash`

For Flutter, iOS, or Android work, resolve the mobile driver:

## Mobile Setup (run BEFORE any `$M` command)

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
M=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/skystack/mobile/dist/mobile" ] && M="$_ROOT/.claude/skills/skystack/mobile/dist/mobile"
[ -z "$M" ] && [ -x ~/.claude/skills/skystack/mobile/dist/mobile ] && M=~/.claude/skills/skystack/mobile/dist/mobile
if [ -x "$M" ]; then
  echo "MOBILE_READY: $M"
else
  echo "MOBILE_NEEDS_SETUP"
fi
```

If `MOBILE_NEEDS_SETUP`:
1. Tell the user: "skystack mobile needs a one-time build (~10 seconds). OK to proceed?" Then STOP and wait.
2. Run: `cd ~/.claude/skills/skystack && ./setup`
3. If `bun` is not installed: `curl -fsSL https://bun.sh/install | bash`

Infer these from the request and repository:

- Target: supplied URL, affected route from the branch diff, or running local app
- Scope: named flow, diff-affected flows, or the whole small app
- Mode: report-only unless the user explicitly asked to fix
- Depth: quick smoke, standard flow coverage, or exhaustive exploration
- Authentication: existing imported session or user-provided environment variables

Ask one concise question only when a missing target, credential, or destructive
choice actually blocks testing. Do not add a ceremonial test-plan approval.

## Orient

For a URL:

```bash
$B goto <url>
$B snapshot -i -a -o /tmp/qa-initial.png
$B links
$B console
```

For a feature branch without a URL, inspect the diff and map changed routes,
views, APIs, and styles to user-visible flows. Check common local ports. Ask for
a URL only if no target can be found.

For mobile work, use `$M devices`, open the installed app, then use `$M snapshot`
and `$M screenshot`. If the app is not installed, use the repository's normal
simulator build and install flow. Do not substitute browser testing for a native
mobile scenario.

Briefly state the flows you will cover and proceed.

## Exercise each flow

For every important state:

1. Capture the initial state.
2. Perform the action a user would perform.
3. Verify the resulting UI and navigation.
4. Check console and network failures when applicable.
5. Capture a screenshot for failures or important success states.

Browser pattern:

```bash
$B snapshot -i
$B click @e3
$B snapshot -D
$B is visible ".expected-state"
$B console
$B network
```

Mobile pattern:

```bash
$M snapshot
$M click @e3
$M snapshot
$M screenshot /tmp/qa-after-action.png
```

Cover the normal path plus relevant empty, invalid, error, loading, overflow,
keyboard, and narrow-screen states. Do not mechanically enumerate irrelevant
states. On web UIs, check a phone-sized viewport when layout or interaction can
change materially.

After saving screenshots, read the PNGs so the user can see them.

## Findings

Verify a suspected bug before reporting it. For each confirmed issue include:

- Severity: critical, high, medium, or low
- What happened
- Exact reproduction steps
- Expected versus actual behavior
- Evidence: screenshot, console error, network failure, or state assertion
- A likely source area only when supported by evidence

Ignore harmless warnings, speculative code smells, and subjective polish that
does not conflict with the product's established design.

## Fixes

Only enter this section when the user requested fixes.

1. Inspect the narrow source path implicated by the evidence.
2. Confirm the root cause.
3. Add a regression test when practical.
4. Make the smallest coherent fix with `apply_patch`.
5. Run focused checks, then repeat the exact browser or mobile flow.
6. Preserve unrelated working-tree changes. Do not commit or publish unless the
   user requested that as part of the task.

Parallel agents are useful only for independent bugs with separate file
ownership. Give each writer an explicit area and isolated worktree; verify the
combined result in the main session.

## Report

End with:

- Target and flows tested
- Environment and viewport/device
- Confirmed issues by severity
- Fixes made, if any
- Evidence paths
- Checks and retests performed
- Anything genuinely blocked or untested

Do not report success based only on page load. A tested interactive flow must
include an action and an observed result.
