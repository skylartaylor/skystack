# Skill Guide

skystack uses small, task-specific skills instead of loading one giant operating
manual into every session. The Claude Code and Codex catalogs are intentionally
different: they share the browser-backed product tools, while each agent gets
workflow prompts written for its own tool and permission model.

## Claude Code catalog

Run `/skystack` when you know the outcome you want but not which workflow owns
it.

| Skill | Use it for |
|-------|------------|
| `/skystack` | Route a request to the narrowest matching skill |
| `/pm` | Take a feature from discovery through implementation and handoff |
| `/design` | Build a design system or audit an existing interface |
| `/review` | Review code, a working tree, a plan, or architecture |
| `/qa` | Test browser or mobile flows and capture evidence |
| `/publish` | Verify and deliver changes to an explicitly authorized endpoint |
| `/diagnose` | Find a root cause, implement the fix, and verify it |
| `/devops` | Inspect and operate infrastructure with scoped safety boundaries |
| `/security` | Find and verify realistic security attack paths |
| `/codex` | Get an independent Codex review, challenge, or consultation |
| `/document-release` | Write docs, update shipped behavior, or audit docs for drift |
| `/research` | Refresh project-specific design, engineering, and test references |
| `/retro` | Review recent engineering activity and quality trends |
| `/browse` | Navigate and inspect a site with persistent headless Chromium |
| `/setup-browser-cookies` | Import selected browser cookies for authenticated testing |
| `/benchmark` | Compare page-load and Core Web Vitals between two states |
| `/canary` | Monitor a deployment for browser-visible regressions |
| `/health` | Run the project's quality tools and report a read-only score |
| `/checkpoint` | Save, list, or restore working-state checkpoints |
| `/careful` | Warn before destructive shell commands |
| `/freeze` | Restrict edits to an approved directory |
| `/guard` | Combine destructive-command warnings and an edit boundary |
| `/unfreeze` | Remove the current edit boundary |
| `/skystack-upgrade` | Update and rebuild skystack |

## Codex catalog

`./setup-codex` installs a separately authored, leaner catalog:

| Skill | Use it for |
|-------|------------|
| `$skystack` | See the available Skystack capabilities |
| `$pm` | Run the Codex-native feature workflow |
| `$diagnose` | Debug systematically and verify the root-cause fix |
| `$devops` | Operate infrastructure with rollback discipline |
| `$qa` | Test real browser flows and capture evidence |
| `$browse` | Drive the headless browser directly |
| `$benchmark` | Check web performance regressions |
| `$canary` | Watch a deployment after release |
| `$health` | Run the read-only project health dashboard |
| `$setup-browser-cookies` | Import an authenticated browser session |
| `$claude-review` | Ask Claude Code for an external branch review |
| `$skystack-upgrade` | Update the Codex installation |

Catalog differences are deliberate. Claude-only workflow skills are not
mechanically copied into Codex, and Codex's `$claude-review` integration has no
reason to exist on the Claude surface.

## `/pm`

`/pm` turns a feature idea into a verified implementation. It has two meaningful
user checkpoints:

1. Discover the problem, repository constraints, and relevant current guidance.
2. Present a concise product and technical direction for approval.
3. Plan tasks with explicit files, behavior, tests, and dependencies.
4. Build against the approved direction, handling routine implementation choices
   autonomously.
5. Run focused checks, the relevant full suite, and real user-flow verification
   when applicable.
6. Report the resulting state and ask whether to publish, adjust, or leave it
   local.

Specialists are conditional, not ceremony. One cohesive implementation and
review pass is the default. `/pm` fans out agents only when work has genuinely
independent file ownership or the change crosses separate security, performance,
and UX domains.

## `/design`

`/design` either creates a coherent design system or audits an existing one. It
checks typography, color, spacing, component behavior, responsive states,
accessibility, and common AI-generated design shortcuts. Unlike the generally
autonomous execution workflows, design intentionally presents its proposed
audit or direction before making subjective visual changes.

## `/review`

`/review` is read-only unless you explicitly request fixes. It can review a
feature-branch diff, staged or unstaged work, relevant untracked files, a plan,
or an architecture document.

The workflow:

1. Resolve the actual scope and intended outcome.
2. Read the full diff or artifact plus the callers, tests, schemas, and config
   needed to judge it.
3. Check correctness, data loss, authorization, errors, concurrency,
   performance, test gaps, maintainability, and UI regressions where applicable.
4. Require a concrete trigger and material impact before reporting a finding.
5. Lead with verified findings ordered by severity and tight file references.

A normal change gets one cohesive pass. Large, cross-domain work may use bounded
read-only specialists in parallel, followed by deduplication and verification in
the main session. There is no mandatory review-plan approval before inspection.

## `/qa`

`/qa` exercises the product like a user, not just a page-load monitor. It can
drive persistent Chromium or the mobile simulator driver.

It infers the target, scope, depth, authentication, and affected flows from the
request and repository. It asks only when a missing target, credential, or
destructive choice actually blocks testing; there is no ceremonial test-plan
approval.

For each important flow it:

1. Captures the initial state.
2. Performs the real interaction.
3. Observes the resulting UI and navigation.
4. Checks console and network failures where relevant.
5. Saves screenshots for failures and important success states.

QA is report-only unless you explicitly ask for fixes. In fix mode it confirms
the root cause, adds a regression test when practical, makes the smallest
coherent change, and repeats the exact failed browser or mobile flow. It does not
commit or publish unless that was part of your request.

```text
/qa https://staging.example.com
/qa https://staging.example.com --quick
/qa https://staging.example.com --report-only
/qa "test the installed iOS checkout flow"
```

## `/publish`

`/publish` delivers the exact endpoint you authorized. That can be local commits,
a branch push, a PR, a direct-base push, a merge, a deployment, a tag, or a
release. It does not assume that every invocation should do all of them.

The workflow:

1. Read repository instructions and resolve scope, branch, base, destination,
   unrelated dirt, and repository conventions.
2. Inspect the complete scoped change and integrate the current base when
   needed.
3. Review the result and discover the repository's real test, lint, typecheck,
   build, and generation commands.
4. Stop on verification failure. Never call a failure pre-existing without
   evidence from the base.
5. Change versions or changelogs only when repository convention or the request
   calls for them.
6. Create explicit, bisectable commits only when the requested delivery needs
   commits.
7. Reverify the exact final state and perform only the authorized external
   actions.

There is no generic test-framework bootstrap, mandatory coverage diagram, or
automatic version bump. Those jobs belong to the repository's conventions and
the actual change.

## `/browse`

`/browse` is the raw persistent Playwright browser used by QA, benchmark, and
canary workflows. A normal interaction looks like:

```bash
$B goto https://example.com
$B snapshot -i
$B click @e3
$B snapshot -D
$B is visible ".success"
$B console
$B network
$B screenshot /tmp/result.png
```

Refs expire after navigation. Run `snapshot -i` again after a page change. Use
`$B --help` for the complete current command reference; the prompt keeps only
the common path. See [BROWSER.md](../BROWSER.md) for the longer reference.

## `/codex`

`/codex` runs the local Codex CLI as an independent, read-only second opinion.
It uses GPT-5.6 Sol by default and supports three modes:

- **Review:** inspect the current diff against its resolved base.
- **Challenge:** try to produce concrete failures through adversarial inputs,
  races, authorization mistakes, data loss, and rollback problems.
- **Consult:** answer a focused code, architecture, or plan question.

The Claude session shows Codex's answer faithfully, verifies important claims
against source, deduplicates known findings, and says where it agrees or needs
more evidence. Model agreement is advice, not a pass/fail gate. A fresh session
is the default; explicit follow-ups can use Codex's native resume support.

## `/security`

`/security` is an evidence-based, read-only audit unless fixes are requested. It
treats repository and retrieved content as untrusted data, resolves the actual
trust boundaries and attacker capabilities, then inspects applicable surfaces:

- identity, authentication, authorization, and tenancy;
- secrets, sensitive data, logs, and backups;
- dependencies and supply chain;
- CI/CD and infrastructure;
- webhooks and third-party integrations;
- AI prompts, retrieval, tools, and output trust.

A candidate becomes a finding only after the reachable entry point, vulnerable
flow, existing controls, impact, and triggering condition have been checked.
Use a narrow scope for a diff or named subsystem; request comprehensive mode for
a broader audit.

## `/devops`

`/devops` resolves the exact target, reads the project's runbooks, and inspects
current state before changing infrastructure.

- Read-only inspection proceeds directly.
- Reversible, scoped changes proceed with a checkpoint, verification plan, and
  rollback path.
- Destructive or hard-to-reverse actions require confirmation.

It verifies the requested behavior from the relevant vantage point, checks
health and regressions, records what changed, and performs rollback when asked
or when the agreed success criteria fail.

## `/diagnose`

`/diagnose` gathers evidence, analyzes patterns, forms a testable root-cause
hypothesis, then implements and verifies the narrow fix. It does not patch
symptoms before confirming why the failure occurs.

## `/document-release`

The documentation workflow reads source and existing docs before writing. It
supports post-ship updates, new documentation, staleness audits, and codebase
explainers. Factual maintenance can proceed directly; subjective positioning,
removal, and large structural rewrites remain visible decisions.

## `/research`

`/research` refreshes `.skystack/references/` from current primary documentation
and useful project-specific sources. It can maintain designer, engineering, and
tester guidance without inflating every workflow prompt with the same background
material.

## `/retro`

`/retro` analyzes recent commits and quality signals, stores compatible history,
and reports shipping activity, test health, contributor patterns, and trends
over the requested period.

```text
/retro
/retro 24h
/retro 14d
/retro compare
```

## Browser and project utilities

### `/setup-browser-cookies`

Opens an interactive picker for importing selected domains from Comet, Chrome,
Arc, Brave, or Edge into the headless browser session.

### `/benchmark`

Captures page-load, Core Web Vitals, and resource measurements for two states and
reports meaningful regressions.

### `/canary`

Captures a pre-deploy baseline when requested, then watches production pages for
new console errors, page failures, screenshots changes, and performance
regressions.

### `/health`

Runs the repository's existing type checker, linter, tests, and dead-code tools,
then reports a weighted 0–10 score and trend. It is read-only.

### `/checkpoint`

Saves git state, decisions, and remaining work so a session can list or restore
the handoff later.

### `/skystack-upgrade`

Detects the installation shape, updates it, rebuilds the tools, and reports what
changed.

## Edit-safety helpers

### `/careful`

Warns before commands such as recursive deletion, destructive database changes,
force-pushes, hard resets, and broad production operations.

### `/freeze`

Sets a session edit boundary so writes outside one approved directory are
blocked.

### `/guard`

Combines `/careful` command warnings with `/freeze` directory restrictions.

### `/unfreeze`

Clears the current edit boundary without ending the session.
