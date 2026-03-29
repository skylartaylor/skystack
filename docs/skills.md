# Skill Deep Dives

Detailed guides for every skystack skill — philosophy, workflow, and examples.

| Skill | Your friend | What they do |
|-------|------------|--------------|
| [`/pm`](#pm) | **The Planner** | Takes a feature from idea to shipped code. Researches, specs, coordinates the Designer and Dev, builds, and publishes. |
| [`/design`](#design) | **The Designer** | Builds design systems from scratch or audits what you've built. Catches AI slop, proposes fixes, generates previews. |
| [`/review`](#review) | **The Dev** | Reads your diff, presents a review plan, catches bugs that pass CI. Auto-fixes the obvious ones, asks about the rest. |
| [`/qa`](#qa) | **The Tester** | Opens a real browser, clicks through your app, presents a test plan, finds bugs. Fixes them or reports only — your choice. |
| [`/docs`](#docs) | **The Writer** | Writes new docs, updates existing ones after shipping, audits for staleness. |
| [`/research`](#research) | **The Researcher** | Keeps the crew's reference files current. Searches dev docs and forums, updates guidance for your stack. |
| [`/publish`](#publish) | **Release** | Sync main, run tests, audit coverage, bump version, push, open PR. One command. |
| [`/browse`](#browse) | **Browser** | Give the agent a real browser. Chromium, real clicks, screenshots. ~100ms per command. |
| [`/retro`](#retro) | **Retrospective** | Weekly retro. Shipping streaks, test health trends, per-person breakdowns. |
| [`/codex`](#codex) | **Second Opinion** | Independent code review from OpenAI's Codex CLI. Review, challenge, or consult mode. |
| [`/security`](#security) | **Security Auditor** | Infrastructure-first security audit. Secrets, supply chain, CI/CD, OWASP, STRIDE. |
| [`/diagnose`](#diagnose) | **Debugger** | Systematic root-cause debugging. Iron Law: no fixes without root cause. |

---

## `/pm`

**The Planner.** Takes a feature from idea to shipped code.

### Philosophy

`/pm` is the orchestrator. It's not a ticket writer or a scaffolding tool — it's an end-to-end collaborator that does the research a product manager would do, writes the spec an engineer actually wants, coordinates design and architecture feedback, builds the thing, and ships it.

Two checkpoints where you're involved. Between them, it runs autonomously.

### What it does

1. **Discovery** — checks TODOS.md and prior specs, explores the codebase to understand patterns, researches competitor apps and UX patterns, defines accessibility requirements for your stack
2. **Crew feedback** — dispatches the Designer and Dev as subagents in parallel. Designer reviews the UX approach, Dev reviews the architecture. Their feedback gets woven into the spec.
3. **Spec → your approval** — presents the full spec (problem statement, proposed solution, design recommendations, architecture notes, edge cases, non-goals). You approve, adjust, or redirect.
4. **Build** — implements task by task, TDD, atomic commits
5. **Self-review** — checks its own work for correctness, consistency, accessibility, and test coverage before presenting
6. **Publish decision → your approval** — presents what was built and asks whether to `/publish`

### The crew

`/pm` dispatches two subagents automatically:

- **Designer** — reviews the spec for display patterns, accessibility gaps, and AI slop risk. Are the proposed UI patterns right for this feature? What do users expect?
- **Dev** — reviews the spec for architectural soundness, performance, and test strategy. Does it fit existing patterns? What breaks in production?

You don't invoke these yourself. `/pm` coordinates them.

### Stack awareness

Stack detection runs first. Every recommendation is tailored to your project:
- Flutter → `fl_chart`, Material widgets, Semantics wrappers
- SwiftUI → Charts framework, `.accessibilityLabel()`
- React/Next.js → recharts, semantic HTML, ARIA

### Example

```text
You:    /pm "add a weekly summary email"
Claude: [reads TODOS.md, finds related deferred work]
        [explores codebase: finds existing EmailService, mailer patterns]
        [researches: Mailchimp, Substack, GitHub Digest — what makes digests useful]
        [asks Designer: layout, content hierarchy, mobile email patterns]
        [asks Dev: scheduling approach, idempotency, unsubscribe handling]

        "The stated feature is a weekly email. The real opportunity is a digest
        that surfaces what actually changed — not a summary you wrote, but the
        3 things users missed. Designer says: single-column, heavy on data viz.
        Dev says: use the existing job queue, add an idempotency key.
        Here's the spec — approve it?"

You:    Build it.
        [implements 8 tasks, TDD, atomic commits]
        [self-reviews for correctness, tests edge cases]
        "Built it. 6 files, 47 tests added. Ready to publish?"
```

---

## `/design`

**The Designer.** Builds design systems or audits what you've built.

### Philosophy

`/design` is a collaborator, not a report generator. It proposes concrete systems, explains its reasoning, and welcomes pushback. It never hedges or presents menus of options unprompted.

Two things it actively guards against:
- **AI slop** — generic card grids, purple gradients, hollow hero sections, "Unlock the power of..." copy. It flags these by name and replaces them with intentional choices.
- **Vagueness** — "clean, modern UI" is not a design decision. Every recommendation is specific and justified.

### Two modes

**Build a design system** — If you don't have a `DESIGN.md`, it researches your space, proposes a complete coherent visual system (typography, color, spacing, component patterns), generates a color preview page, and writes `DESIGN.md`. One session.

**Audit what you've built** — If `DESIGN.md` exists, it checks your implementation against it. Finds gaps between what the design system says and what the code actually does.

### What it checks

- Typography consistency (font scale, weight pairings, line height)
- Color usage (contrast ratios, semantic meaning, palette discipline)
- Spacing system (do you have one? is it followed?)
- Component patterns (is the button always a button? are cards consistent?)
- AI slop patterns (gradient abuse, empty hero sections, corporate filler copy)
- Accessibility (touch targets, contrast, never color-alone)

### Example

```text
You:    /design
Claude: [reads DESIGN.md — finds your color system and type scale]
        [scans component files — finds 3 inline colors that bypass the system]
        [finds button with outline: none and no focus-visible replacement]

        "Here's what I'll check: palette discipline, type consistency, spacing,
        AI slop patterns, and accessibility. Ready?"

You:    Go.
        [AUTO-FIXED] src/Button.tsx:14 — outline: none → added focus-visible ring
        [AUTO-FIXED] src/Card.tsx:8 — hardcoded #1a1a2e → var(--color-surface)
        [ASK] src/HeroSection.tsx — generic gradient + "Unlock your workflow"
              → Replace with content-first hero? A) Yes  B) Skip
```

---

## `/review`

**The Dev.** Catches the bug before it hits production.

### Philosophy

`/review` is your friend who reads the diff, spots what's off, fixes the obvious stuff, and flags the rest. It presents a review plan before doing anything and lets you adjust what to focus on.

It's opinionated about what to flag. If it's fine, it skips it. No five-paragraph explanations for style preferences.

### Two modes

**Code review** — there's a diff to read. Auto-detected from your current branch.
**Architecture review** — you're asked to review a plan or design doc.

### Code review workflow

1. Detects mode: feature branch diff, local changes on main, or architecture
2. Reads the checklist and skims the diff
3. **Presents a review plan** — specific to what it actually saw ("Race condition in status transition" not "Concurrency concerns")
4. You approve, adjust, or redirect
5. Two-pass review: Critical first (SQL, race conditions, LLM trust), Informational second
6. Auto-fixes the obvious ones (dead code, N+1, stale comments, magic numbers)
7. Batches ASK items into one question

### Auto-fix vs ask

```
AUTO-FIX:                            ASK:
├─ Dead code / unused variables      ├─ Security (auth, XSS, injection)
├─ N+1 queries (missing includes)   ├─ Race conditions
├─ Stale comments                    ├─ Design decisions
├─ Magic numbers → named constants   ├─ Large fixes (>20 lines)
└─ Missing LLM output validation     └─ Anything user-visible
```

### Works on main too

No feature branch needed. If you're on `main` with staged or unstaged changes, `/review` detects local changes mode and reviews against your last commit.

### Example

```text
You:    /review
Claude: [reads diff — 180 lines, 4 files]

        "I've read the diff. Here's what I'll focus on:
        1. Race condition — status transition in OrderService isn't atomic
        2. N+1 — PostsController#index missing includes(:author)
        3. Test coverage — new BillingService has no tests
        Anything to add or skip?"

You:    Go.
        [AUTO-FIXED] app/controllers/posts_controller.rb:12 — N+1 → added includes(:author)
        [AUTO-FIXED] app/models/order.rb:88 — magic number 3 → MAX_RETRIES = 3

        "1 item needs your input:
        [CRITICAL] app/services/order_service.rb:44 — race condition in status transition
        Fix: Add WHERE status = 'pending' to the UPDATE
        → A) Fix  B) Skip"
```

---

## `/qa`

**The Tester.** Breaks things before users do.

### Philosophy

`/qa` uses the app like a real person who's slightly adversarial and very observant. It clicks the weird buttons, submits the empty forms, resizes to 320px. It finds the bugs nobody else catches because nobody else tested that path.

When it finds something broken, it either fixes it and proves it's fixed, or writes it up clearly enough that anyone can reproduce it.

### Parameters

| Parameter | Default | Example |
|-----------|---------|---------|
| URL | auto-detect or ask | `https://staging.myapp.com`, `localhost:3000` |
| Mode | test-and-fix | `--report-only` |
| Tier | Standard | `--quick`, `--exhaustive` |
| Scope | Full app | `Focus on the checkout flow` |

### Tiers

- **Quick** — Critical and High issues only. Fast pass, deploy-blocker focus.
- **Standard** — + Medium issues. Default. Catches most real bugs.
- **Exhaustive** — + Low/cosmetic. Full audit, use before major releases.

### What it does

1. Reads the tester reference file (issue taxonomy, patterns for your app)
2. **Presents a test plan** — pages to cover, edge cases to probe, what to skip and why
3. You approve the plan
4. Opens a real Chromium browser via `/browse`, clicks through the app
5. Documents every bug with screenshots, reproduction steps, severity
6. In test-and-fix mode: creates an atomic commit per fix, writes a regression test, re-verifies
7. Presents a final report

### Report-only mode

`/qa --report-only` — finds and documents bugs but makes no code changes. Use when you want a clean bug report without automated fixes.

### Example

```text
You:    /qa https://staging.myapp.com
Claude: [reads tester reference: your app's issue taxonomy]

        "Test plan for staging.myapp.com:
        Pages: Home, Login, Dashboard, Settings, Checkout
        Edge cases: Empty cart, expired session, slow network, mobile (390px)
        Skipping: Admin panel (out of scope)
        Ready?"

You:    Go.
        [opens browser, clicks through all flows]
        [finds: checkout total doesn't update when promo code applied]
        [takes screenshot, documents steps to reproduce]
        [fixes: app/javascript/checkout.js:88 — event listener missing on promo input]
        [commits: fix: checkout total updates on promo code entry]
        [re-verifies: ✓]

        "Found 1 bug. Fixed it. Regression test added. 43 → 44 tests."
```

---

## `/docs`

**The Writer.** Keeps docs accurate and writes new ones when needed.

### Philosophy

`/docs` reads source code before writing anything, and reads existing docs before touching them. It never writes docs without understanding what the code actually does, and it always presents a plan before starting.

### Four modes

1. **Post-ship update** — You just ran `/publish`. Cross-reference the diff against existing docs and update what drifted. Auto-updates paths, counts, commands, table entries. Asks before rewriting introductions or removing sections.
2. **Write new docs** — Point it at a module, API, or feature. It reads the code, understands the public interface and data flow, and writes docs a new developer can follow.
3. **Audit** — "Check if docs are stale." Reads everything, maps content to code, flags what's wrong or missing.
4. **Codebase explainer** — "Explain the codebase." Maps the project, identifies entry points, writes navigational docs for new contributors.

### Works on main too

When run after pushing directly to main (no PR), falls back to recent commit history to understand what changed — `git log -20` instead of `git diff origin/main..HEAD`.

### What it updates automatically

- Paths, commands, table entries, counts — anything clearly factual from the diff
- Stale cross-references between doc files
- New items that belong in existing lists

### What it asks about first

- Rewriting introductions or philosophy sections
- Removing sections
- Large rewrites (>10 lines in one section)

---

## `/research`

**The Researcher.** Keeps the crew sharp.

### Philosophy

The crew (Designer, Dev, Tester) each read reference files before working: design patterns, code review heuristics, QA checklists, product thinking. These references shape their feedback. If the references are stale, the feedback suffers.

`/research` updates those references with current best practices for your stack.

### What it does

1. Detects your stack (Flutter, SwiftUI, React, Rails, etc.)
2. Searches developer docs, GitHub discussions, and technical forums for current guidance
3. Updates `.skystack/references/` with findings:
   - `designer.md` — design patterns, component conventions, accessibility requirements for your stack
   - `dev.md` — architecture patterns, performance gotchas, security considerations
   - `tester.md` — testing patterns, common bug taxonomy, automation approaches

### When to run it

- When starting a new project (populate references for your stack)
- When upgrading a major dependency (patterns may have changed)
- When the crew's suggestions feel generic or off (references may be stale)
- Periodically on long-running projects

---

## `/publish`

**Release.** Full ship workflow in one command.

### Philosophy

You say `/publish`. The next thing you see is a PR URL. Everything in between is automated: merge, test, coverage audit, version bump, changelog, commit, push.

It only stops for things that actually need a human: test failures, merge conflicts, MINOR/MAJOR version bumps, or a pre-landing review finding that needs judgment.

### What it does (feature branch)

1. **Trust ladder** — first run walks you through everything (teacher mode). After that, runs efficiently. Re-validates when config changes.
2. **Pre-flight** — checks review readiness, detects base branch
3. **Merge base branch** — fetches and merges before tests run
4. **Test bootstrap** — if no test framework exists, sets one up
5. **Run tests** — stops on failure
6. **Coverage audit** — traces every code path changed, maps to existing tests, generates tests for gaps
7. **Coverage gate** — if CLAUDE.md defines `## Test Coverage` with Minimum/Target thresholds, enforces them
8. **Pre-landing review** — applies the review checklist one more time, auto-fixes anything obvious
9. **Plan completion audit** — cross-references your plan file against the diff (DONE/PARTIAL/NOT DONE/CHANGED)
10. **Version bump** — auto-decides MICRO/PATCH based on diff size; asks for MINOR/MAJOR
11. **CHANGELOG** — auto-generates from diff and commit history
12. **TODOS.md** — marks completed items, moves them to Completed section
13. **Commit** — bisectable chunks (model + tests together, controller + views together, VERSION + CHANGELOG last)
14. **Push + PR**

### Direct push mode (main branch)

If you're on `main` with unpushed commits or local changes, `/publish` enters direct push mode: skip the merge and PR steps, push directly, output the commit SHAs.

### Test bootstrap

If your project has no test framework, `/publish` sets one up:
- Detects your runtime (Node, Ruby, Python, Go, etc.)
- Recommends the right framework (vitest for Node, pytest for Python, etc.)
- Installs, configures, writes 3-5 real tests for existing code
- Creates `.github/workflows/test.yml`
- Writes `TESTING.md`

---

## `/browse`

**Browser.** Give the agent a real browser.

The raw browser tool that `/qa` is built on. ~100ms per command. Real Chromium, real clicks, real screenshots.

Use directly when you need browser automation that `/qa` doesn't cover — checking a URL, scraping content, testing a specific interaction, verifying a deployment.

### Commands

```bash
$B goto https://example.com          # navigate
$B click "Submit"                    # click by text/selector
$B fill "#email" "user@example.com"  # fill inputs
$B snapshot                          # text snapshot of page state
$B screenshot                        # take a screenshot
$B js "document.title"               # run JavaScript
$B wait-for "#loaded"                # wait for element
```

See [BROWSER.md](../BROWSER.md) for the full command reference.

---

## `/setup-browser-cookies`

**Session Manager.** Import cookies from your real browser into the headless session.

Opens an interactive picker UI where you select which cookie domains to import. Use before `/qa` testing pages that require authentication.

Supports: Chrome, Arc, Brave, Edge.

---

## `/retro`

**Retrospective.** Weekly engineering retro, team-aware.

### What it does

Analyzes commit history, work patterns, and code quality metrics with persistent history so trends show up over time. Identifies every contributor and generates per-person praise and growth opportunities.

### Output

- **Shipping velocity** — commits, features, PRs merged
- **Code health** — test coverage trends, types of changes (feat vs fix vs chore)
- **Per-person breakdown** — what each contributor shipped, specific praise, one growth observation
- **Trends** — compares against prior weeks if history exists

### Arguments

```bash
/retro          # last 7 days (default)
/retro 24h      # last 24 hours
/retro 14d      # last 2 weeks
/retro 30d      # last month
/retro compare  # compare current period against previous
```

---

## `/codex`

**Second Opinion.** Independent code review from a different AI.

### Philosophy

`/codex` wraps the OpenAI Codex CLI to get a second opinion from a completely different model. Two AI systems reading the same diff catch more than one. Where they agree, you can be confident. Where they disagree, you know where to look.

### Three modes

**Review** — `codex review` with a pass/fail gate. Compares findings against Claude's own `/review` if it ran earlier. Shows agreement rate and unique findings from each model.

**Challenge** — adversarial mode. Codex tries to break your code: edge cases, race conditions, security holes, failure modes. No compliments, just problems.

**Consult** — ask Codex anything about the codebase. Supports session continuity for follow-up questions.

### Cross-model analysis

When both `/review` and `/codex review` have run, you get a comparison:
- Findings both models caught
- Findings only Codex found
- Findings only Claude found
- Agreement rate

When both models agree your approach should change, it's presented as a structured "User Challenge" — what you said, what they recommend, why, what they might be missing. You always decide.

### Filesystem boundary

Codex prompts include a directive to stay focused on your code and ignore skystack skill files. If Codex gets distracted anyway, a rabbit-hole detector warns you.

---

## `/security`

**Security Auditor.** Infrastructure-first security audit.

### Philosophy

Most security tools scan for known patterns. `/security` starts with your infrastructure — where secrets live, how dependencies flow, what your CI/CD pipeline exposes — then works inward to code-level issues.

### What it covers

1. **Secrets archaeology** — git history for leaked credentials, API keys, tokens
2. **Dependency supply chain** — outdated packages, known CVEs, typosquatting risk
3. **CI/CD pipeline security** — exposed secrets, missing pinning, overpermissioned workflows
4. **LLM/AI security** — prompt injection vectors, output trust boundaries
5. **OWASP Top 10** — injection, broken auth, misconfig, and the rest
6. **STRIDE threat modeling** — spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege

### Two modes

**Daily** — 8/10 confidence gate. Only surfaces findings the audit is sure about. Zero noise.

**Comprehensive** — 2/10 bar. Surfaces everything, including speculative concerns. Use before major releases.

---

## `/diagnose`

**Debugger.** Systematic root-cause debugging.

### Iron Law

No fixes without root cause. `/diagnose` doesn't guess — it investigates, forms hypotheses, tests them, and only recommends a fix when the root cause is proven.

### Four phases

1. **Investigate** — gather evidence. Read logs, reproduce the bug, trace the execution path.
2. **Analyze** — what does the evidence tell us? What's the simplest explanation?
3. **Hypothesize** — form a specific, testable hypothesis about the root cause.
4. **Implement** — fix the root cause (not the symptom) and verify the fix.
