# skystack

**skystack** is a fork of [gstack](https://github.com/garrytan/gstack), an open-source Claude Code skill suite created by [Garry Tan](https://x.com/garrytan), President & CEO of [Y Combinator](https://www.ycombinator.com/). Credit where it's due: gstack is a genuinely compelling piece of work. The skill architecture, the structured review roles, the QA automation — it's well-designed and immediately useful.

Now, about Garry Tan.

### Why fork instead of contribute upstream?

Because I don't want my development workflow to be a billboard for a man whose political project is actively harmful to the Bay Area.

**The "die slow" incident.** In January 2024, Tan [posted on X](https://missionlocal.org/2024/01/garry-tan-death-wish-sf-supervisors/): *"Fuck Chan Peskin Preston Walton Melgar Ronen Safai ... Die slow motherfuckers"* — naming seven of eleven San Francisco Board of Supervisors members. Three supervisors subsequently [received death threat mailers](https://techcrunch.com/2024/01/31/san-francisco-supervisors-threats-yc-garry-tans-tweet/). Two filed police reports. He claimed it was a Tupac reference.

**Anti-labor politics.** Tan has [attacked public-sector unions](https://missionlocal.org/2026/02/sf-garry-tan-california-politics-garrys-list/) as "special interests," criticized striking teachers, and opposed ballot measures that would increase taxes on companies where executives earn 100x+ their median employee's salary. His organizations have actively opposed measures funded by SEIU Locals 1021 and 2015. The [New Republic](https://newrepublic.com/article/178675/garry-tan-tech-san-francisco) characterized the broader movement as "tech plutocrats dreaming of a right-wing San Francisco."

**Dark money in local politics.** Tan donated over [$100,000 to recall SF's progressive DA](https://missionlocal.org/2024/01/garry-tan-death-wish-sf-supervisors/) and $20,000 to recall school board members. In 2026, he launched ["Garry's List,"](https://missionlocal.org/2026/02/sf-garry-tan-california-politics-garrys-list/) a 501(c)(4) dark-money nonprofit that can spend on elections without disclosing donors. The moderate coalition he helped build [spent close to $20 million](https://missionlocal.org/2024/12/the-2024-election-is-over-what-will-san-franciscos-big-money-groups-do-next/) on the 2024 SF election cycle. [Ten interconnected groups raised $33 million since 2020, half of it dark money](https://48hills.org/2024/02/ten-groups-33-million-half-of-it-dark-money-behind-the-billionaire-attacks-on-sf-politics/). A TogetherSF ballot measure backed by millions in billionaire money lost to a progressive counter-measure funded on a shoestring.

**The YC pipeline.** Y Combinator has incubated some of big tech's most extractive companies. Tan's political spending extends the same philosophy beyond products and into governance: use concentrated wealth to reshape public institutions in favor of business interests, weaken worker protections, and undermine progressive policy.

I met him once. I did not care for him.

### So what is skystack?

The code is good. The politics are bad. So I forked it.

**skystack** takes gstack's skill architecture and adapts it for how I actually work — primarily Flutter mobile apps (iOS/Android) alongside web projects. It strips out the YC self-promotion and refocuses on being a useful tool rather than a founder-bro manifesto.

It turns Claude Code into a virtual engineering team: a reviewer who finds production bugs, a QA lead who tests your app, a designer who catches AI slop, and a release engineer who ships the PR. All slash commands, all Markdown, all free, MIT license.

**Who this is for:**
- **Solo developers and small teams** — especially if you're building mobile and web apps simultaneously
- **First-time Claude Code users** — skystack gives you structured roles instead of a blank prompt
- **Tech leads and staff engineers** — bring rigorous review, QA, and release automation to every PR

## Quick start: your first 10 minutes

1. Install skystack (30 seconds — see below)
2. Run `/plan-ceo-review` on any feature idea
3. Run `/review` on any branch with changes
4. Run `/qa` on your staging URL
5. Stop there. You'll know if this is for you.

Expect first useful run in under 5 minutes on any repo with tests already set up.

**If you only read one more section, read this one.**

## Install — takes 30 seconds

**Requirements:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+

### Step 1: Install on your machine

Open Claude Code and paste this. Claude does the rest.

> Install skystack: run **`git clone https://github.com/xr843/skystack.git ~/.claude/skills/skystack && cd ~/.claude/skills/skystack && ./setup`** then add a "skystack" section to CLAUDE.md that says to use the /browse skill from skystack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, and lists the available skills: /pm, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /qa-design-review, /setup-browser-cookies, /retro, /document-release. Then ask the user if they also want to add skystack to the current project so teammates get it.

### Step 2: Add to your repo so teammates get it (optional)

> Add skystack to this project: run **`cp -Rf ~/.claude/skills/skystack .claude/skills/skystack && rm -rf .claude/skills/skystack/.git && cd .claude/skills/skystack && ./setup`** then add a "skystack" section to this project's CLAUDE.md that says to use the /browse skill from skystack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, lists the available skills: /pm, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /qa-design-review, /setup-browser-cookies, /retro, /document-release, and tells Claude that if skystack skills aren't working, run `cd .claude/skills/skystack && ./setup` to build the binary and register skills.

Real files get committed to your repo (not a submodule), so `git clone` just works. Everything lives inside `.claude/`. Nothing touches your PATH or runs in the background.

## See it work

```
You:    I want to add photo upload for sellers.
You:    /plan-ceo-review
Claude: "Photo upload" is not the feature. The real job is helping
        sellers create listings that actually sell. What if we
        auto-identify the product, pull specs and comps from the
        web, and draft the listing automatically? That's 10 stars.
        "Upload a photo" is 3 stars. Which are we building?
        [8 expansion proposals, you cherry-pick 5, defer 3 to backlog]

You:    /plan-design-review
Claude: Design Score: B  |  AI Slop Score: C
        "Upload flow looks like a default Bootstrap form."
        [80-item audit, infers your design system, exports DESIGN.md]
        [flags 3 AI slop patterns: gradient hero, icon grid, uniform radius]

You:    /plan-eng-review
Claude: ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
        │ Upload  │───▶│ Classify │───▶│ Enrich   │───▶│ Draft   │
        │ (sync)  │    │ (async)  │    │ (async)  │    │ (async) │
        └─────────┘    └──────────┘    └──────────┘    └─────────┘
        [ASCII diagrams for every data flow, state machine, error path]
        [14-case test matrix, 6 failure modes mapped, 3 security concerns]

You:    Approve plan. Exit plan mode.
        [Claude writes 2,400 lines across 11 files — models, services,
         controllers, views, migrations, and tests. ~8 minutes.]

You:    /review
Claude: [AUTO-FIXED] Orphan S3 cleanup on failed upload
        [AUTO-FIXED] Missing index on listings.status
        [ASK] Race condition on hero image selection → You: yes
        [traces every new enum value through all switch statements]
        3 issues — 2 auto-fixed, 1 fixed.

You:    /qa https://staging.myapp.com
Claude: [opens real browser, logs in, uploads photos, clicks through flows]
        Upload → classify → enrich → draft: end to end ✓
        Mobile: ✓  |  Slow connection: ✓  |  Bad image: ✓
        [finds bug: preview doesn't clear on second upload — fixes it]
        Regression test generated.

You:    /ship
Claude: Tests: 42 → 51 (+9 new)
        Coverage: 14/14 code paths (100%)
        PR: github.com/you/app/pull/42
```

One feature. Seven commands. The agent reframed the product, ran an 80-item design audit, drew the architecture, wrote 2,400 lines of code, found a race condition I would have missed, auto-fixed two issues, opened a real browser to QA test, found and fixed a bug I didn't know about, wrote 9 tests, and generated a regression test. That is not a copilot. That is a team.

## The team

| Skill | Your specialist | What they do |
|-------|----------------|--------------|
| `/pm` | **Product Manager** | Feature from idea to shipped code. Competitive research, UX patterns, accessibility, spec, implement, review, ship. Auto-detects your stack. |
| `/plan-ceo-review` | **CEO / Founder** | Rethink the problem. Find the 10-star product hiding inside the request. Four modes: Expansion, Selective Expansion, Hold Scope, Reduction. |
| `/plan-eng-review` | **Eng Manager** | Lock in architecture, data flow, diagrams, edge cases, and tests. Forces hidden assumptions into the open. |
| `/plan-design-review` | **Senior Designer** | 80-item design audit with letter grades. AI Slop detection. Infers your design system. Report only — never touches code. |
| `/design-consultation` | **Design Partner** | Build a complete design system from scratch. Knows the landscape, proposes creative risks, generates realistic product mockups. Design at the heart of all other phases. |
| `/review` | **Staff Engineer** | Find the bugs that pass CI but blow up in production. Auto-fixes the obvious ones. Flags completeness gaps. |
| `/ship` | **Release Engineer** | Sync main, run tests, audit coverage, push, open PR. Bootstraps test frameworks if you don't have one. One command. |
| `/browse` | **QA Engineer** | Give the agent eyes. Real Chromium browser, real clicks, real screenshots. ~100ms per command. |
| `/qa` | **QA Lead** | Test your app, find bugs, fix them with atomic commits, re-verify. Auto-generates regression tests for every fix. |
| `/qa-only` | **QA Reporter** | Same methodology as /qa but report only. Use when you want a pure bug report without code changes. |
| `/design-review` | **Designer Who Codes** | Same audit as /plan-design-review, then fixes what it finds. Atomic commits, before/after screenshots. |
| `/setup-browser-cookies` | **Session Manager** | Import cookies from your real browser (Chrome, Arc, Brave, Edge) into the headless session. Test authenticated pages. |
| `/retro` | **Eng Manager** | Team-aware weekly retro. Per-person breakdowns, shipping streaks, test health trends, growth opportunities. |
| `/document-release` | **Technical Writer** | Update all project docs to match what you just shipped. Catches stale READMEs automatically. |

**[Deep dives with examples and philosophy for every skill →](docs/skills.md)**

## What's new and why it matters

**Design is at the heart.** `/design-consultation` doesn't just pick fonts. It researches what's out there in your space, proposes safe choices AND creative risks, generates realistic mockups of your actual product, and writes `DESIGN.md` — and then `/design-review` and `/plan-eng-review` read what you chose. Design decisions flow through the whole system.

**`/qa` was a massive unlock.** It let me go from 6 to 12 parallel workers. Claude Code saying *"I SEE THE ISSUE"* and then actually fixing it, generating a regression test, and verifying the fix — that changed how I work. The agent has eyes now.

**Smart review routing.** CEO doesn't have to look at infra bug fixes, design review isn't needed for backend changes. skystack tracks what reviews are run, figures out what's appropriate, and just does the smart thing. The Review Readiness Dashboard tells you where you stand before you ship.

**Test everything.** `/ship` bootstraps test frameworks from scratch if your project doesn't have one. Every `/ship` run produces a coverage audit. Every `/qa` bug fix generates a regression test. 100% test coverage is the goal — tests make vibe coding safe instead of yolo coding.

**`/document-release` is the engineer you never had.** It reads every doc file in your project, cross-references the diff, and updates everything that drifted. README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md, TODOS — all kept current automatically.

## Parallel sessions

skystack is powerful with one session. It is transformative with ten.

[Conductor](https://conductor.build) runs multiple Claude Code sessions in parallel — each in its own isolated workspace. One session running `/qa` on staging, another doing `/review` on a PR, a third implementing a feature, and seven more on other branches. All at the same time.

## License & upstream

MIT. Free forever. Go build something.

Based on [gstack](https://github.com/garrytan/gstack) by Garry Tan — MIT License.

## Docs

| Doc | What it covers |
|-----|---------------|
| [Skill Deep Dives](docs/skills.md) | Philosophy, examples, and workflow for every skill (includes Greptile integration) |
| [Architecture](ARCHITECTURE.md) | Design decisions and system internals |
| [Browser Reference](BROWSER.md) | Full command reference for `/browse` |
| [Contributing](CONTRIBUTING.md) | Dev setup, testing, contributor mode, and dev mode |
| [Changelog](CHANGELOG.md) | What's new in every version |

## Troubleshooting

**Skill not showing up?** `cd ~/.claude/skills/skystack && ./setup`

**`/browse` fails?** `cd ~/.claude/skills/skystack && bun install && bun run build`

**Claude says it can't see the skills?** Make sure your project's `CLAUDE.md` has a skystack section. Add this:

```
## skystack
Use /browse from skystack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /pm, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /review, /ship, /browse, /qa, /qa-only, /qa-design-review,
/setup-browser-cookies, /retro, /document-release.
```
