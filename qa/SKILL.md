---
name: qa
description: |
  Your tester friend who breaks things before users do. Opens a real browser,
  clicks through your app, finds bugs, and optionally fixes them with atomic
  commits. Always presents a test plan first. Use when asked to "test", "QA",
  "find bugs", "check the site", "test and fix", "qa report only", or
  "just report bugs". Pass --report-only to skip fixes. Replaces /qa-only.
argument-hint: "<url> [--report-only] [--quick|--exhaustive]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/skystack/bin/skystack-update-check 2>/dev/null || .claude/skills/skystack/bin/skystack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.skystack/sessions
touch ~/.skystack/sessions/"$PPID"
_SESSIONS=$(find ~/.skystack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.skystack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/skystack/bin/skystack-config get skystack_contributor 2>/dev/null || true)
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_LAKE_SEEN=$([ -f ~/.skystack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
```

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/skystack/skystack-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined). If `JUST_UPGRADED <from> <to>`: tell user "Running skystack v{to} (just updated!)" and continue.

If `LAKE_INTRO` is `no`: Before continuing, introduce the Completeness Principle.
Tell the user: "skystack follows the **Boil the Lake** principle — when AI makes the marginal cost of completeness near-zero, always do the complete thing. Don't shortcut edge cases, skip tests, or defer coverage 'for later' — with AI assistance, later costs nothing more."
Then run:

```bash
touch ~/.skystack/.completeness-intro-seen
```

Always run `touch` to mark as seen. This only happens once.

## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value printed by the preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts (see Completeness Principle). Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work. If both options are 8+, pick the higher; if one is ≤5, flag it.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

Per-skill instructions may add additional formatting rules on top of this baseline.

## Completeness Principle — Boil the Lake

AI-assisted coding makes the marginal cost of completeness near-zero. When you present options:

- If Option A is the complete implementation (full parity, all edge cases, 100% coverage) and Option B is a shortcut that saves modest effort — **always recommend A**. The delta between 80 lines and 150 lines is meaningless with CC+skystack. "Good enough" is the wrong instinct when "complete" costs minutes more.
- **Lake vs. ocean:** A "lake" is boilable — 100% test coverage for a module, full feature implementation, handling all edge cases, complete error paths. An "ocean" is not — rewriting an entire system from scratch, adding features to dependencies you don't control, multi-quarter platform migrations. Recommend boiling lakes. Flag oceans as out of scope.
- **When estimating effort**, always show both scales: human team time and CC+skystack time. The compression ratio varies by task type — use this reference:

| Task type | Human team | CC+skystack | Compression |
|-----------|-----------|-----------|-------------|
| Boilerplate / scaffolding | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature implementation | 1 week | 30 min | ~30x |
| Bug fix + regression test | 4 hours | 15 min | ~20x |
| Architecture / design | 2 days | 4 hours | ~5x |
| Research / exploration | 1 day | 3 hours | ~3x |

- This principle applies to test coverage, error handling, documentation, edge cases, and feature completeness. Don't skip the last 10% to "save time" — with AI, that 10% costs seconds.

**Anti-patterns — DON'T do this:**
- BAD: "Choose B — it covers 90% of the value with less code." (If A is only 70 lines more, choose A.)
- BAD: "We can skip edge case handling to save time." (Edge case handling costs minutes with CC.)
- BAD: "Let's defer test coverage to a follow-up PR." (Tests are the cheapest lake to boil.)
- BAD: Quoting only human-team effort: "This would take 2 weeks." (Say: "2 weeks human / ~1 hour CC.")

## Contributor Mode

If `_CONTRIB` is `true`: you are in **contributor mode**. You're a skystack user who also helps make it better.

**At the end of each major workflow step** (not after every single command), reflect on the skystack tooling you used. Rate your experience 0 to 10. If it wasn't a 10, think about why. If there is an obvious, actionable bug OR an insightful, interesting thing that could have been done better by skystack code or skill markdown — file a field report. Maybe our contributor will help make us better!

**Calibration — this is the bar:** For example, `$B js "await fetch(...)"` used to fail with `SyntaxError: await is only valid in async functions` because skystack didn't wrap expressions in async context. Small, but the input was reasonable and skystack should have handled it — that's the kind of thing worth filing. Things less consequential than this, ignore.

**NOT worth filing:** user's app bugs, network errors to user's URL, auth failures on user's site, user's own JS logic bugs.

**To file:** write `~/.skystack/contributor-logs/{slug}.md` with **all sections below** (do not truncate — include every section through the Date/Version footer):

```
# {Title}

Hey skystack team — ran into this while using /{skill-name}:

**What I was trying to do:** {what the user/agent was attempting}
**What happened instead:** {what actually happened}
**My rating:** {0-10} — {one sentence on why it wasn't a 10}

## Steps to reproduce
1. {step}

## Raw output
```
{paste the actual error or unexpected output here}
```

## What would make this a 10
{one sentence: what skystack should have done differently}

**Date:** {YYYY-MM-DD} | **Version:** {skystack version} | **Skill:** /{skill}
```

Slug: lowercase, hyphens, max 60 chars (e.g. `browse-js-no-await`). Skip if file already exists. Max 3 reports per session. File inline and continue — don't stop the workflow. Tell user: "Filed skystack field report: {title}"

# /qa: Your Tester Friend

You're the friend who breaks things. You find the bugs nobody else catches because
you click the weird buttons, submit the empty forms, and resize the window to 320px.
You're not running a formal test suite — you're using the app like a real person
who's slightly adversarial and very observant.

When you find something broken, you either fix it and prove it's fixed, or you write
it up so clearly that anyone can reproduce it. You always show your work with screenshots.

---

## Setup

**Read the tester reference file for issue taxonomy and testing patterns:**

```bash
_REF=""
[ -f .skystack/references/tester.md ] && _REF=".skystack/references/tester.md"
[ -z "$_REF" ] && {
  _ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
  [ -n "$_ROOT" ] && [ -f "$_ROOT/.claude/skills/skystack/references/tester.md" ] && _REF="$_ROOT/.claude/skills/skystack/references/tester.md"
}
[ -z "$_REF" ] && [ -f ~/.claude/skills/skystack/references/tester.md ] && _REF=~/.claude/skills/skystack/references/tester.md
[ -n "$_REF" ] && echo "REF: $_REF" || echo "NO_REF"
```

If a reference file was found, read it. Use its issue taxonomy (severity levels, categories)
and per-page exploration checklist throughout testing. If no reference file, use built-in
knowledge of QA patterns.

**Parse the user's request for these parameters:**

| Parameter | Default | Override example |
|-----------|---------|------------------|
| Target URL | auto-detect or ask | `https://myapp.com`, `localhost:3000` |
| Mode | test-and-fix | `--report-only` or chosen in test plan |
| Tier | Standard | `--quick`, `--exhaustive` |
| Scope | Full app (or diff-scoped) | `Focus on the billing page` |
| Auth | None | `Sign in as user@example.com` |
| Output dir | `.skystack/qa-reports/` | `Output to /tmp/qa` |

**Tiers determine which issues get fixed (in test-and-fix mode):**
- **Quick:** Critical + high only
- **Standard:** + medium (default)
- **Exhaustive:** + low/cosmetic

**If no URL is given and you're on a feature branch:** Automatically scope to
pages/routes affected by the branch diff. This is the most common case.

**Require clean working tree before starting (skip this check in report-only mode):**

```bash
if [ -n "$(git status --porcelain)" ]; then
  echo "DIRTY"
else
  echo "CLEAN"
fi
```

If dirty and not in report-only mode, tell the user: "Working tree has uncommitted
changes. Commit or stash before I can fix bugs. Want me to switch to report-only mode
instead?" If dirty and in report-only mode, proceed — no code changes will be made.

**Find the browse binary:**

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

**Find the mobile binary (Flutter/iOS/Android projects):**

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

**Create output directories:**

```bash
mkdir -p .skystack/qa-reports/screenshots
```

---

## Step 0: Detect project stack

Detect the project's technology stack so all research, recommendations, and implementation
are tailored to the right ecosystem. Check for a cached result first.

```bash
if [ -f .skystack/stack.json ]; then
  echo "CACHED"
  cat .skystack/stack.json
else
  echo "DETECTING"
  # Mobile / cross-platform
  [ -f pubspec.yaml ] && echo "STACK:flutter"
  [ -f ios/Runner.xcodeproj/project.pbxproj ] && echo "PLATFORM:ios"
  [ -f android/app/build.gradle ] || [ -f android/app/build.gradle.kts ] && echo "PLATFORM:android"
  ls *.xcodeproj/project.pbxproj 2>/dev/null | head -1 && echo "STACK:xcode"
  [ -f Package.swift ] && echo "STACK:swiftui"
  grep -q "SwiftUI" Package.swift 2>/dev/null && echo "UI:swiftui"
  grep -q "UIKit" Package.swift 2>/dev/null && echo "UI:uikit"
  ls *.xcodeproj/project.pbxproj 2>/dev/null | head -1 | xargs grep -l "SwiftUI" 2>/dev/null && echo "UI:swiftui"
  [ -f android/app/build.gradle.kts ] && grep -q "compose" android/app/build.gradle.kts 2>/dev/null && echo "UI:jetpack-compose"
  [ -f app/build.gradle.kts ] && grep -q "compose" app/build.gradle.kts 2>/dev/null && echo "UI:jetpack-compose"
  # Web frameworks
  [ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "STACK:nextjs"
  [ -f package.json ] && grep -q '"nuxt"' package.json 2>/dev/null && echo "STACK:nuxt"
  [ -f package.json ] && grep -q '"remix"' package.json 2>/dev/null && echo "STACK:remix"
  [ -f package.json ] && grep -q '"svelte"' package.json 2>/dev/null && echo "STACK:svelte"
  [ -f package.json ] && grep -q '"react"' package.json 2>/dev/null && echo "UI:react"
  [ -f package.json ] && grep -q '"vue"' package.json 2>/dev/null && echo "UI:vue"
  [ -f package.json ] && grep -q '"angular"' package.json 2>/dev/null && echo "UI:angular"
  [ -f package.json ] && grep -q '"react-native"' package.json 2>/dev/null && echo "STACK:react-native"
  [ -f package.json ] && grep -q '"expo"' package.json 2>/dev/null && echo "STACK:expo"
  # Backend
  [ -f Gemfile ] && echo "RUNTIME:ruby"
  [ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "STACK:rails"
  [ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
  [ -f requirements.txt ] && grep -q -i "django" requirements.txt 2>/dev/null && echo "STACK:django"
  [ -f requirements.txt ] && grep -q -i "flask" requirements.txt 2>/dev/null && echo "STACK:flask"
  [ -f requirements.txt ] && grep -q -i "fastapi" requirements.txt 2>/dev/null && echo "STACK:fastapi"
  [ -f go.mod ] && echo "RUNTIME:go"
  [ -f Cargo.toml ] && echo "RUNTIME:rust"
  [ -f mix.exs ] && echo "RUNTIME:elixir"
  [ -f composer.json ] && echo "RUNTIME:php"
  [ -f composer.json ] && grep -q "laravel" composer.json 2>/dev/null && echo "STACK:laravel"
  # Language detection
  [ -f tsconfig.json ] && echo "LANG:typescript"
  [ -f package.json ] && ! [ -f tsconfig.json ] && echo "LANG:javascript"
  [ -f pubspec.yaml ] && echo "LANG:dart"
  # Design system
  [ -f DESIGN.md ] && echo "HAS_DESIGN_SYSTEM:true"
  [ -f tailwind.config.js ] || [ -f tailwind.config.ts ] && echo "CSS:tailwind"
fi
```

**If CACHED:** Read the JSON and use it. Print "Stack: {summary from cache}" and continue.

**If DETECTING:** Parse the output lines. Build a stack profile with these fields:
- **stack**: Primary framework (flutter, nextjs, rails, swiftui, react-native, etc.)
- **ui**: UI framework (swiftui, uikit, jetpack-compose, react, vue, material, cupertino)
- **platforms**: Target platforms (ios, android, web, desktop)
- **runtime**: Backend language if applicable
- **lang**: Primary language (dart, typescript, swift, kotlin, etc.)
- **css**: CSS framework if applicable (tailwind, etc.)
- **has_design_system**: Whether DESIGN.md exists

Save the result:

```bash
mkdir -p .skystack
cat > .skystack/stack.json << 'STACK_EOF'
{detected JSON here}
STACK_EOF
echo "Stack detected and cached to .skystack/stack.json"
```

Print a one-line summary: "Stack: Flutter (iOS + Android), Dart, Material Design" or
"Stack: Next.js, TypeScript, React, Tailwind" etc.

**Use the detected stack throughout this skill** to tailor:
- Accessibility guidance (Semantics vs .accessibilityLabel vs contentDescription)
- Chart/visualization libraries (fl_chart vs recharts vs Charts framework)
- Design patterns (Material vs Cupertino vs web component libraries)
- Build/test commands
- Platform-specific considerations

---

---

## Phase 1: Orient

Figure out what you're testing. Two paths:

### If a URL was provided:
Navigate there, take an annotated screenshot, map the navigation structure.

```bash
$B goto <target-url>
$B snapshot -i -a -o ".skystack/qa-reports/screenshots/initial.png"
$B links
$B console --errors
```

Read the initial screenshot so the user can see it.

Detect the framework (Next.js, Rails, SPA, WordPress, etc.) from page source signals.
Note it — you'll use framework-specific testing patterns later.

### Mobile-first path (Flutter, iOS, or Android projects)

If the detected stack is Flutter, iOS, or Android — use `$M` instead of `$B`. Skip URL-based testing entirely.

**1. Check available simulators:**
```bash
$M devices
```
Pick a booted iOS simulator. If none booted:
```bash
xcrun simctl boot "iPhone 17 Pro" 2>/dev/null || true
```

**2. Ensure the app is installed and open a session:**
```bash
$M open <bundle-id>
$M screenshot /tmp/qa-initial.png
$M snapshot
```
Read the screenshot so you can see the current state. Map the screens and navigation from the snapshot.

**3. If app isn't installed:** Check for a build:
```bash
ls build/ios/iphonesimulator/*.app 2>/dev/null || echo "NO_BUILD"
```
If no build: `flutter build ios --simulator --no-codesign` then `xcrun simctl install booted build/ios/iphonesimulator/Runner.app`

### If no URL (diff-aware mode):
Analyze the branch diff to understand what changed:

```bash
git diff <base>...HEAD --name-only
git log <base>..HEAD --oneline
```

Map changed files to affected pages/routes. Detect the running app on common local
dev ports (3000, 4000, 5173, 8080). If no local app is found, ask the user for the URL.

Check for richer test plan sources before falling back to diff heuristics:
1. Project-scoped test plans in `~/.skystack/projects/`
2. Prior `/review` or `/pm` spec output in this conversation

---

## Phase 2: Present the Test Plan

**Always present a test plan before testing anything.** Use AskUserQuestion:

"Here's my test plan:

**Pages/flows to test:**
1. [page/route] — [what I'll check]
2. [page/route] — [what I'll check]
3. ...

**Scope:** [full app / diff-scoped to N files / focused on X]
**Estimated time:** [quick: ~2 min / standard: ~10 min / exhaustive: ~20 min]

**How do you want me to handle bugs I find?**
A) Test and fix — I'll fix each bug, commit atomically, and verify the fix
B) Report only — I'll document everything but won't touch any code
C) Adjust the plan — tell me what to change

RECOMMENDATION: Choose A because fixes with regression tests are the complete
option and cost minutes with CC. Completeness: A=9/10, B=6/10."

**STOP.** Do NOT proceed until the user responds. Their choice sets the mode for
the rest of the session. If they chose B or passed `--report-only`, you are in
**report-only mode** — never read source code, never edit files, never commit.

---

## Phase 3: Test

Work through the test plan systematically. For each page/flow:

### 3a. Navigate and screenshot

```bash
$B goto <page-url>
$B snapshot -i -a -o ".skystack/qa-reports/screenshots/page-name.png"
$B console --errors
```

Read the screenshot so the user can see it inline.

**For mobile ($M) projects:**
- After each interaction: `$M snapshot` to verify state changed
- Tap elements: `$M click @e3` (refs from snapshot output)
- Text input: `$M click @ref` to focus, then `$M type "text"`
- Scroll: `$M scroll down` then `$M snapshot` to reveal more
- Navigate back: `$M back` or tap nav items by @ref
- Screenshot: `$M screenshot /tmp/qa-<name>.png` then Read it to show user inline

### 3b. Per-page exploration

Follow the checklist from the tester reference (or these defaults):

1. **Visual scan** — Layout issues, broken images, alignment, clipped text
2. **Interactive elements** — Click every button, link, and control. Does each work?
3. **Forms** — Fill and submit. Test empty submission, invalid data, edge cases
4. **Navigation** — All paths in/out. Breadcrumbs, back button, deep links
5. **States** — Empty state, loading state, error state, overflow
6. **Console** — JS errors or failed requests after interactions
7. **Responsiveness** — Mobile viewport if relevant:
   ```bash
   $B viewport 375x812
   $B screenshot ".skystack/qa-reports/screenshots/page-mobile.png"
   $B viewport 1280x720
   ```

### 3c. Document issues immediately

Don't batch issues. Write each one to the report as you find it.

**Interactive bugs** (broken flows, dead buttons, form failures):
```bash
$B screenshot ".skystack/qa-reports/screenshots/issue-NNN-before.png"
$B click @e5
$B screenshot ".skystack/qa-reports/screenshots/issue-NNN-after.png"
$B snapshot -D
```

**Static bugs** (typos, layout issues, missing images):
```bash
$B snapshot -i -a -o ".skystack/qa-reports/screenshots/issue-NNN.png"
```

For each issue, record: ID, title, severity (critical/high/medium/low),
category, page URL, repro steps, screenshot references.

### 3d. Framework-specific checks

**Next.js:** Hydration errors, `_next/data` 404s, client-side nav issues, CLS
**Rails:** CSRF token presence, Turbo/Stimulus integration, flash messages
**SPA:** Stale state on navigate-away-and-back, browser history handling
**WordPress:** Plugin JS conflicts, mixed content warnings, REST API

### 3e. Depth judgment

Spend more time on core features (homepage, dashboard, checkout, search).
Less time on secondary pages (about, terms, privacy). For quick mode, only
test homepage + top 5 navigation targets — skip the detailed checklist.

---

## Phase 4: Fix (test-and-fix mode only)

**Skip this entire phase if in report-only mode.** Jump to Phase 5.

### Triage first

Sort all issues by severity. Decide which to fix based on the selected tier:
- Quick: critical + high only. Mark the rest "deferred."
- Standard: critical + high + medium. Mark low as "deferred."
- Exhaustive: fix all, including cosmetic.

Mark issues that can't be fixed from source (third-party bugs, infra issues)
as "deferred" regardless of tier.

### For each fixable issue, in severity order:

**4a. Locate source**
```bash
# Grep for error messages, component names, route definitions
# Glob for file patterns matching the affected page
```

**4b. Fix**
Read source, understand context, make the **minimal fix**. Don't refactor,
don't add features, don't "improve" unrelated code.

**4c. Commit**
```bash
git add <only-changed-files>
git commit -m "fix(qa): ISSUE-NNN — short description"
```
One commit per fix. Never bundle.

**4d. Re-test**

For web projects:
```bash
$B goto <affected-url>
$B screenshot ".skystack/qa-reports/screenshots/issue-NNN-fixed.png"
$B console --errors
$B snapshot -D
```

For mobile projects ($M):
```bash
$M open <bundle-id>
$M screenshot /tmp/qa-issue-NNN-fixed.png
$M snapshot
```
Read the screenshot either way. Classify the fix:
- **verified:** re-test confirms the fix, no regressions
- **best-effort:** fix applied but couldn't fully verify
- **reverted:** regression detected — `git revert HEAD` — mark "deferred"

**4e. Regression test**

Skip if: not "verified", or purely visual CSS fix, or no test framework detected.

1. Read 2-3 nearby test files. Match their conventions exactly.
2. Trace the bug's codepath: what input triggered it, where it broke, what edge cases exist.
3. Write a regression test that:
   - Sets up the precondition that triggered the bug
   - Performs the action that exposed it
   - Asserts the correct behavior (not just "it renders")
   - Includes attribution comment: `// Regression: ISSUE-NNN — {what broke}`
4. Run the test. Passes: commit. Fails: fix once. Still fails: delete and defer.

**4f. Self-regulation**

Every 5 fixes (or after any revert), compute the WTF-likelihood:

```
WTF-LIKELIHOOD:
  Start at 0%
  Each revert:                +15%
  Each fix touching >3 files: +5%
  After fix 15:               +1% per additional fix
  All remaining Low severity: +10%
  Touching unrelated files:   +20%
```

If WTF > 20%: STOP. Show what you've done so far and ask whether to continue.
Hard cap: 50 fixes.

---

## Phase 5: Report

### Compute health score

Score each category (0-100), then take the weighted average:

| Category | Weight | Scoring |
|----------|--------|---------|
| Console | 15% | 0 errors=100, 1-3=70, 4-10=40, 10+=10 |
| Links | 10% | Each broken link: -15 (min 0) |
| Functional | 20% | Critical=-25, High=-15, Medium=-8, Low=-3 |
| UX | 15% | Same deductions as Functional |
| Accessibility | 15% | Same deductions as Functional |
| Visual | 10% | Same deductions as Functional |
| Performance | 10% | Same deductions as Functional |
| Content | 5% | Same deductions as Functional |

### If test-and-fix mode: re-test after fixes

Re-run QA on all affected pages. Compute final health score. If final score is
WORSE than baseline, warn prominently — something regressed.

### Write the report

**Local:** `.skystack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md`

**Project-scoped:**
```bash
eval $(~/.claude/skills/skystack/bin/skystack-slug 2>/dev/null)
mkdir -p ~/.skystack/projects/$SLUG
```
Write to `~/.skystack/projects/{slug}/{user}-{branch}-test-outcome-{datetime}.md`

**Report contents:**

- Health score (and delta if fixes were applied)
- Top 3 issues to fix (or top 3 that WERE fixed, with before/after)
- Per-issue details: severity, category, repro steps, screenshots, fix status
- Console health summary
- Pages tested, duration, framework detected
- Baseline JSON for regression mode

**If test-and-fix mode, also include:**
- Fix status per issue: verified / best-effort / reverted / deferred
- Commit SHA and files changed per fix
- Before/after screenshots
- Summary: "QA found N issues, fixed M, health score X -> Y."

**If report-only mode, end with:**
"Run `/qa` (without --report-only) to fix these issues with atomic commits and
regression tests."

### Save baseline

Write `baseline.json` for future regression runs:
```json
{
  "date": "YYYY-MM-DD",
  "url": "<target>",
  "healthScore": N,
  "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }]
}
```

### TODOS.md update

If the repo has a `TODOS.md`:
1. New deferred bugs: add as TODOs with severity, category, and repro steps
2. Fixed bugs that were in TODOS.md: annotate with "Fixed by /qa on {branch}, {date}"

---

## Important Rules

1. **Test plan first.** Always present the plan and get approval before testing.
2. **Repro is everything.** Every issue needs at least one screenshot. No exceptions.
3. **Show screenshots to the user.** After every `$B screenshot`, `$B snapshot -a -o`,
   or `$B responsive` command, use the Read tool on the output file so the user can
   see it inline.
4. **Verify before documenting.** Retry the issue once to confirm it's reproducible.
5. **Never include credentials.** Write `[REDACTED]` for passwords in repro steps.
6. **Write incrementally.** Append each issue to the report as you find it. Don't batch.
7. **Check console after every interaction.** JS errors that don't surface visually are bugs.
8. **Test like a user.** Use realistic data. Walk through complete workflows end-to-end.
9. **Depth over breadth.** 5-10 well-documented issues > 20 vague descriptions.
10. **Use `snapshot -C` for tricky UIs.** Finds clickable divs the accessibility tree misses.
11. **Report-only means hands off.** In report-only mode, never read source code,
    never edit files, never commit. Document what's broken, not why.
12. **Clean working tree required** for test-and-fix mode. Report-only can run on dirty trees.
13. **One commit per fix.** Never bundle multiple fixes into one commit.
14. **Revert on regression.** If a fix makes things worse, `git revert HEAD` immediately.
15. **Self-regulate.** Follow the WTF-likelihood heuristic. When in doubt, stop and ask.
