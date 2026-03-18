---
name: research
version: 1.0.0
description: |
  Update the reference files that skystack's agents work from. Searches developer docs,
  forums, and best-practice guides for the project's detected stack, then updates
  .skystack/references/ with current, practical guidance.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - WebSearch
  - WebFetch
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/gstack/bin/gstack-update-check 2>/dev/null || .claude/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
```

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/gstack/gstack-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined). If `JUST_UPGRADED <from> <to>`: tell user "Running gstack v{to} (just updated!)" and continue.

If `LAKE_INTRO` is `no`: Before continuing, introduce the Completeness Principle.
Tell the user: "gstack follows the **Boil the Lake** principle — always do the complete
thing when AI makes the marginal cost near-zero. Read more: https://garryslist.org/posts/boil-the-ocean"
Then offer to open the essay in their default browser:

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

Only run `open` if the user says yes. Always run `touch` to mark as seen. This only happens once.

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

- If Option A is the complete implementation (full parity, all edge cases, 100% coverage) and Option B is a shortcut that saves modest effort — **always recommend A**. The delta between 80 lines and 150 lines is meaningless with CC+gstack. "Good enough" is the wrong instinct when "complete" costs minutes more.
- **Lake vs. ocean:** A "lake" is boilable — 100% test coverage for a module, full feature implementation, handling all edge cases, complete error paths. An "ocean" is not — rewriting an entire system from scratch, adding features to dependencies you don't control, multi-quarter platform migrations. Recommend boiling lakes. Flag oceans as out of scope.
- **When estimating effort**, always show both scales: human team time and CC+gstack time. The compression ratio varies by task type — use this reference:

| Task type | Human team | CC+gstack | Compression |
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

If `_CONTRIB` is `true`: you are in **contributor mode**. You're a gstack user who also helps make it better.

**At the end of each major workflow step** (not after every single command), reflect on the gstack tooling you used. Rate your experience 0 to 10. If it wasn't a 10, think about why. If there is an obvious, actionable bug OR an insightful, interesting thing that could have been done better by gstack code or skill markdown — file a field report. Maybe our contributor will help make us better!

**Calibration — this is the bar:** For example, `$B js "await fetch(...)"` used to fail with `SyntaxError: await is only valid in async functions` because gstack didn't wrap expressions in async context. Small, but the input was reasonable and gstack should have handled it — that's the kind of thing worth filing. Things less consequential than this, ignore.

**NOT worth filing:** user's app bugs, network errors to user's URL, auth failures on user's site, user's own JS logic bugs.

**To file:** write `~/.gstack/contributor-logs/{slug}.md` with **all sections below** (do not truncate — include every section through the Date/Version footer):

```
# {Title}

Hey gstack team — ran into this while using /{skill-name}:

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
{one sentence: what gstack should have done differently}

**Date:** {YYYY-MM-DD} | **Version:** {gstack version} | **Skill:** /{skill}
```

Slug: lowercase, hyphens, max 60 chars (e.g. `browse-js-no-await`). Skip if file already exists. Max 3 reports per session. File inline and continue — don't stop the workflow. Tell user: "Filed gstack field report: {title}"

# /research: Keep the Crew's Knowledge Current

You are the librarian. Your job is to research best practices, patterns, and gotchas
for the project's tech stack, then update the reference files that the other agents
(Planner, Designer, Dev, Tester) read when they work.

**Your sources:** Official framework docs, developer blogs, Reddit (r/FlutterDev,
r/SwiftUI, r/reactjs, etc.), Stack Overflow, GitHub discussions, and release notes.
Prefer primary sources (official docs, framework authors) over aggregator content.

**Your output:** Updated markdown files in `.skystack/references/` that are practical,
opinionated, and specific to this project's stack.

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

## Phase 1: Understand what needs updating

### 1a. Check current references

```bash
ls .skystack/references/ 2>/dev/null || echo "NO_REFS"
```

**If NO_REFS:** This is a first run. Copy the starter references from skystack:

```bash
mkdir -p .skystack/references
_SKILL_DIR=$(dirname "$(readlink -f "$0" 2>/dev/null || echo ".")")
```

Look for the starter references in the skystack install directory. The shipped defaults
live at `~/.claude/skills/skystack/references/` or `.claude/skills/skystack/references/`.
Copy all four files (designer.md, dev.md, tester.md, planner.md) to `.skystack/references/`.

If the starter files can't be found, create empty reference files with just the headings.

**If refs exist:** Read each one. Note what sections exist and when they were last updated
(check git log or file modification time).

### 1b. Determine research focus

Based on the detected stack from Step 0, decide what to research:

**Always research (for any stack):**
- Latest accessibility guidelines (WCAG 2.2, platform-specific)
- Current best practices for the detected UI framework
- Common security gotchas for the stack

**Stack-specific research:**
- **Flutter:** Latest Material Design 3 patterns, new widgets in recent Flutter releases,
  Dart 3 patterns, popular packages and their status
- **SwiftUI:** Latest iOS/macOS SDK additions, new view modifiers, Swift concurrency patterns,
  Charts framework updates
- **React/Next.js:** App Router patterns, Server Components best practices, React 19 features,
  popular library ecosystem changes
- **Vue/Nuxt:** Composition API patterns, Nuxt 3 conventions, Pinia state management
- **Rails:** Hotwire/Turbo patterns, Rails 8 features, ActiveRecord best practices
- **Kotlin/Compose:** Compose Multiplatform, Material 3 Compose, coroutine patterns

### 1c. Ask what to focus on (optional)

If the user provided arguments (e.g., `/research accessibility` or `/research charts`),
focus research on that specific topic. Otherwise, do a general update.

Use AskUserQuestion if no arguments were provided:

"I'll update your reference files based on your {detected stack} stack. Want me to:
A) General update — refresh everything with latest best practices
B) Focus on a specific area — [tell me what]
C) Just accessibility — update all a11y guidance across all reference files"

RECOMMENDATION: Choose A for first run, or if it's been a while since the last update.

---

## Phase 2: Research

Run web searches tailored to the detected stack and focus area. For each reference file,
search for current best practices.

### Research patterns

For each topic, run 2-3 targeted searches:

```
"{framework} best practices {year}"
"{framework} common mistakes production"
"{framework} accessibility {year}"
"site:reddit.com r/{framework-subreddit} tips"
```

**Prioritize:**
1. Official documentation and migration guides
2. Framework core team blog posts
3. Well-known community experts (look for authors with framework contributions)
4. Reddit/forum posts with high engagement and practical advice
5. Conference talks from the current year

**Avoid:**
- Generic "10 tips for..." listicles
- AI-generated blog content (look for specific code examples and real-world experience)
- Outdated advice (check dates — framework best practices change fast)

### What to extract

For each finding, extract:
- The specific pattern or anti-pattern
- Why it matters (performance? accessibility? maintainability?)
- A concrete example if available
- The source (so the user can dig deeper)

---

## Phase 3: Update reference files

Write updated reference files to `.skystack/references/`. For each file:

1. Read the current version
2. **Preserve the existing structure** — don't reorganize sections the user may have customized
3. **Add new findings** under the appropriate section
4. **Update outdated guidance** — if a framework version changed best practices, update them
5. **Mark framework-specific sections** clearly so they're easy to scan
6. **Add a "Last updated" line** at the top with the current date

### Which files to update

Based on the detected stack, update the relevant files:

| Reference file | Update when stack includes |
|---|---|
| `designer.md` | Any UI framework (always relevant) |
| `dev.md` | Any backend or fullstack framework |
| `tester.md` | Always (testing is universal) |
| `planner.md` | Always (product thinking is universal) |

### Writing style

- **Practical over theoretical.** "Don't use `setState` in `initState`" beats "Consider lifecycle implications."
- **Opinionated.** "Use `fl_chart` for simple charts, `syncfusion` if you need advanced features" beats "There are many chart libraries available."
- **Specific to the stack.** Don't include React advice in a Flutter project's references.
- **Concise.** Each bullet point should be one actionable guideline. No paragraphs.

---

## Phase 4: Summary

After updating, present a summary:

```
Updated .skystack/references/:
- designer.md: Added 8 items (Material 3 color tokens, Flutter Semantics patterns)
- dev.md: Updated 3 items (Dart 3 pattern matching, Riverpod 2.0 migration)
- tester.md: Added 5 items (Flutter integration test patterns, golden test workflow)
- planner.md: No changes needed

Sources consulted: [list 3-5 key sources]
```

---

## Important Rules

1. **Don't overwrite custom content.** If the user has added their own notes to a reference file, preserve them.
2. **Date everything.** Add "Last updated: YYYY-MM-DD" so stale guidance is visible.
3. **Stack-specific only.** Don't add React guidance to a Flutter project's references. The detected stack determines what's relevant.
4. **Primary sources first.** Official docs > framework team blogs > community posts > generic articles.
5. **Test your advice.** If you're not confident a pattern is correct for the detected framework version, say so or skip it.
6. **Keep it scannable.** Bullet points, not paragraphs. Headings for navigation. Code examples for non-obvious patterns.
