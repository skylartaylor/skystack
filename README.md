# skystack

**skystack** is a fork of [gstack](https://github.com/garrytan/gstack), adapted for my work: primarily Flutter mobile apps (iOS/Android) alongside web projects.

It turns Claude Code into a small group of collaborators: a planner who figures out what to build, a designer who makes it look right, a dev who reviews the architecture, and a tester who breaks things before users do. They share context, give each other feedback, and work together. All slash commands, all Markdown.

skystack strips out the founder-tech-bro framing and refocuses the whole system on being a practical tool for shipping software.

## Who this is for

- **Solo developers and small teams** — especially if you're building mobile and web apps at the same time
- **Anyone who ships** — bring design feedback, code review, QA, and release automation into every PR

## Quick start: your first 10 minutes

1. Install skystack (30 seconds — see below)
2. Run `/pm "your feature idea"` to plan a feature
3. Run `/review` on any branch with changes
4. Run `/qa` on your staging URL
5. Stop there. You'll know if this is for you.

## Install

**Requirements:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+

### Step 1: Install on your machine

Open Claude Code and paste this. Claude does the rest.

> Install skystack: run **`git clone https://github.com/xr843/skystack.git ~/.claude/skills/skystack && cd ~/.claude/skills/skystack && ./setup`** then add a "skystack" section to CLAUDE.md that says to use the /browse skill from skystack for all web browsing, never use mcp__claude-in-chrome__* tools, and lists the available skills: /pm, /design, /review, /qa, /docs, /research, /publish, /browse, /setup-browser-cookies, /retro. Then ask the user if they also want to add skystack to the current project so teammates get it.

### Step 2: Add to your repo for collaborators (optional)

> Add skystack to this project: run **`cp -Rf ~/.claude/skills/skystack .claude/skills/skystack && rm -rf .claude/skills/skystack/.git && cd .claude/skills/skystack && ./setup`** then add a "skystack" section to this project's CLAUDE.md that says to use the /browse skill from skystack for all web browsing, never use mcp__claude-in-chrome__* tools, lists the available skills: /pm, /design, /review, /qa, /docs, /research, /publish, /browse, /setup-browser-cookies, /retro, and tells Claude that if skystack skills aren't working, run `cd .claude/skills/skystack && ./setup` to build the binary and register skills.

Real files get committed to your repo, not a submodule, so `git clone` just works. Everything lives inside `.claude/`. Nothing touches your PATH or runs in the background.

## See it work

```text
You:    /pm "add photo upload for sellers"
Claude: [researches competitor apps, checks your DESIGN.md, explores codebase]
        [asks the Designer for feedback on the upload flow]
        [asks the Dev to check the architecture]

        "Upload is table stakes — but auto-identifying the product and
        drafting the listing from photos is what makes it great. Designer
        says: use a bottom sheet upload flow, not a modal. Dev says: use
        the existing ImageService, add a ClassificationRepository.
        Here's the spec — approve it?"

You:    Looks good, build it.
        [Claude writes 2,400 lines across 11 files — models, services,
         controllers, views, and tests. ~8 minutes.]

        [self-reviews for correctness, accessibility, edge cases]

You:    /qa https://staging.myapp.com
Claude: [opens real browser, logs in, uploads photos, clicks through flows]
        Upload → classify → enrich → draft: end to end ✓
        Mobile: ✓  |  Slow connection: ✓  |  Bad image: ✓
        [finds bug: preview doesn't clear on second upload — fixes it]
        Regression test generated.

You:    /publish
Claude: Tests: 42 → 51 (+9 new)
        Coverage: 14/14 code paths (100%)
        PR: github.com/you/app/pull/42
```

One feature. Three commands. The planner researched the problem, got design and architecture feedback, wrote the spec, built it, self-reviewed, and shipped. The tester opened a real browser and caught a bug.

That's not a copilot. That's a crew.

## The crew

Four collaborators for your projects:

| Skill | Your friend | What they do |
|-------|-------------|--------------|
| `/pm` | **The Planner** | Takes a feature from idea to shipped code. Does the research, writes the spec, coordinates the Designer and Dev for feedback, builds it, publishes it. |
| `/design` | **The Designer** | Builds design systems or audits what you've built. Catches AI slop, proposes fixes, generates previews. |
| `/review` | **The Dev** | Reads your diff, presents a review plan, catches bugs that pass CI. Auto-fixes the obvious ones, asks about the rest. |
| `/qa` | **The Tester** | Opens a real browser, clicks through your app, presents a test plan, finds bugs. Fixes them or reports only — your choice. |

Plus tools:

| Skill | What it does |
|-------|-------------|
| `/docs` | Writes new docs, updates existing ones after shipping, audits for staleness. |
| `/research` | Searches developer docs and forums, updates the crew's reference files for your stack. |
| `/publish` | Sync main, run tests, push, open PR. One command. |
| `/browse` | Give the agent a real browser. Chromium, real clicks, real screenshots. ~100ms per command. |
| `/setup-browser-cookies` | Import cookies from your browser into the headless session for authenticated testing. |
| `/retro` | Weekly retro. Shipping streaks, test health trends. |

**[Deep dives with examples and philosophy for every skill →](docs/skills.md)**

## What's different from gstack

**No corporate hierarchy.** gstack frames everything as CEO reviews, eng manager gates, and staff engineer audits. skystack uses a friend-group model: a planner, a designer, a dev, and a tester who collaborate and give each other feedback.

**Stack-aware.** skystack auto-detects your project's tech stack — Flutter, SwiftUI, React, Rails, and more — and tailors recommendations to match.

**Every skill presents a plan first.** No agent goes off and does work without checking in. The Designer proposes what to audit, the Dev says what they'll review, and the Tester presents a test plan. You approve, adjust, or redirect before they start.

**`/pm` is the orchestrator.** One command takes a feature from idea to published code: research, spec, design feedback, architecture review, implementation, QA, and release.

**`/qa` gives the agent eyes.** It opens a real browser, clicks through your app, finds bugs, fixes them with atomic commits, and writes regression tests.

**`/research` keeps the crew sharp.** Each agent reads from reference files — design patterns, code review heuristics, QA checklists, and product thinking. `/research` updates those references with current best practices for your stack.

**Test everything.** `/publish` bootstraps test frameworks from scratch if you don't have one. Every `/qa` bug fix generates a regression test. Tests make vibe coding safer.

## Docs

| Doc | What it covers |
|-----|---------------|
| [Skill Deep Dives](docs/skills.md) | Philosophy, examples, and workflow for every skill |
| [Architecture](ARCHITECTURE.md) | Design decisions and system internals |
| [Browser Reference](BROWSER.md) | Full command reference for `/browse` |
| [Contributing](CONTRIBUTING.md) | Dev setup, testing, contributor mode, and dev mode |
| [Changelog](CHANGELOG.md) | What's new in every version |

## Troubleshooting

**Skill not showing up?** `cd ~/.claude/skills/skystack && ./setup`

**`/browse` fails?** `cd ~/.claude/skills/skystack && bun install && bun run build`

**Claude says it can't see the skills?** Make sure your project's `CLAUDE.md` has a skystack section. Add this:

```md
## skystack
Use /browse from skystack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /pm, /design, /review, /qa, /docs, /research, /publish, /browse,
/setup-browser-cookies, /retro, /document-release.
If skystack skills aren't working, run `cd .claude/skills/skystack && ./setup`.
```

## Why this exists

skystack started as a fork of [gstack](https://github.com/garrytan/gstack), which is a genuinely solid Claude Code skill suite. The skill architecture, structured review roles, and QA automation are good ideas. This project keeps the useful parts and adapts them for my workflow: mobile apps, web projects, and a less corporate, more collaborative model.

## About the upstream project

gstack was created by [Garry Tan](https://x.com/garrytan) of [Y Combinator](https://www.ycombinator.com/). I forked it because I found the tooling useful, but I don't want this project to function as a billboard for Garry or for the politics attached to his brand.

Some of that discomfort is personal taste. Some of it is political.

**The "die slow" incident.** In January 2024, Tan [posted on Twitter](https://missionlocal.org/2024/01/garry-tan-death-wish-sf-supervisors/): *"Fuck Chan Peskin Preston Walton Melgar Ronen Safai ... Die slow motherfuckers"* — naming seven San Francisco Board of Supervisors members. Three supervisors then [received death threat mailers](https://techcrunch.com/2024/01/31/san-francisco-supervisors-threats-yc-garry-tans-tweet/). Two filed police reports. He claimed it was a Tupac reference.

**Anti-labor politics.** He has [attacked public-sector unions](https://missionlocal.org/2026/02/sf-garry-tan-california-politics-garrys-list/) as "special interests," criticized striking teachers, and opposed ballot measures that would increase taxes on companies where executives earn 100x+ their median employee's salary. His organizations have actively opposed measures by SEIU Locals 1021 and 2015. The [New Republic](https://newrepublic.com/article/178675/garry-tan-tech-san-francisco) characterized it as "tech plutocrats dreaming of a right-wing San Francisco."

**Dark money in local politics.** Tan donated over [$100,000 to recall SF's progressive DA](https://missionlocal.org/2024/01/garry-tan-death-wish-sf-supervisors/) and $20,000 to recall school board members. In 2026, he launched ["Garry's List"](https://missionlocal.org/2026/02/sf-garry-tan-california-politics-garrys-list/), a 501(c)(4) dark-money nonprofit that can spend on elections without disclosing donors. The moderate coalition he helped build [spent close to $20 million](https://missionlocal.org/2024/12/the-2024-election-is-over-what-will-san-franciscos-big-money-groups-do-next/) on the 2024 SF election cycle. [Ten interconnected groups raised $33 million since 2020, half of it dark money](https://48hills.org/2024/02/ten-groups-33-million-half-of-it-dark-money-behind-the-billionaire-attacks-on-sf-politics/). A TogetherSF ballot measure backed by millions in billionaire money lost to a progressive counter-measure with basically no money.

**The YC pipeline.** Y Combinator has incubated some of big tech's most extractive companies. His political spending extends the same philosophy beyond products and into governance: use wealth to reshape public institutions in favor of business interests, weaken worker protections, and undermine progressive policy.

I met him once. I did not care for him.

None of that changes the fact that the original software had good ideas in it. skystack exists because I wanted those ideas without the surrounding ideology or personality cult.

## License & upstream

MIT. Based on [gstack](https://github.com/garrytan/gstack), which is also MIT-licensed.
