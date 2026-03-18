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

It turns Claude Code into a small group of collaborators: a planner who figures out what to build, a designer who makes it look right, a dev who reviews the architecture, and a tester who breaks things before users do. They share context, give each other feedback, and work together. All slash commands, all Markdown, all free, MIT license.

**Who this is for:**
- **Solo developers and small teams** — especially if you're building mobile and web apps simultaneously
- **First-time Claude Code users** — skystack gives you structured collaborators instead of a blank prompt
- **Anyone who ships** — bring design feedback, code review, QA, and release automation to every PR

## Quick start: your first 10 minutes

1. Install skystack (30 seconds — see below)
2. Run `/pm "your feature idea"` to plan a feature
3. Run `/review` on any branch with changes
4. Run `/qa` on your staging URL
5. Stop there. You'll know if this is for you.

Expect first useful run in under 5 minutes on any repo with tests already set up.

**If you only read one more section, read this one.**

## Install — takes 30 seconds

**Requirements:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+

### Step 1: Install on your machine

Open Claude Code and paste this. Claude does the rest.

> Install skystack: run **`git clone https://github.com/xr843/skystack.git ~/.claude/skills/skystack && cd ~/.claude/skills/skystack && ./setup`** then add a "skystack" section to CLAUDE.md that says to use the /browse skill from skystack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, and lists the available skills: /pm, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /setup-browser-cookies, /retro, /document-release. Then ask the user if they also want to add skystack to the current project so teammates get it.

### Step 2: Add to your repo so teammates get it (optional)

> Add skystack to this project: run **`cp -Rf ~/.claude/skills/skystack .claude/skills/skystack && rm -rf .claude/skills/skystack/.git && cd .claude/skills/skystack && ./setup`** then add a "skystack" section to this project's CLAUDE.md that says to use the /browse skill from skystack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, lists the available skills: /pm, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /setup-browser-cookies, /retro, /document-release, and tells Claude that if skystack skills aren't working, run `cd .claude/skills/skystack && ./setup` to build the binary and register skills.

Real files get committed to your repo (not a submodule), so `git clone` just works. Everything lives inside `.claude/`. Nothing touches your PATH or runs in the background.

## See it work

```
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

You:    /ship
Claude: Tests: 42 → 51 (+9 new)
        Coverage: 14/14 code paths (100%)
        PR: github.com/you/app/pull/42
```

One feature. Three commands. The planner researched the problem, got design and architecture feedback, wrote the spec, built it, self-reviewed, and shipped. The tester opened a real browser and caught a bug. That's not a copilot — that's a crew.

## The crew

Four friends who collaborate on your projects:

| Skill | Your friend | What they do |
|-------|-------------|--------------|
| `/pm` | **The Planner** | Takes a feature from idea to shipped code. Does the research, writes the spec, coordinates the others, builds it, ships it. Auto-detects your stack. |
| `/review` | **The Dev** | Reads your diff and finds the bugs that pass CI but blow up in production. Auto-fixes the obvious ones. Catches what you missed. |
| `/qa` | **The Tester** | Opens a real browser, clicks through your app, finds bugs, fixes them, writes regression tests. Also available as `/qa-only` for report-only mode. |
| `/design-consultation` | **The Designer** | Builds a complete design system from scratch. Researches the landscape, proposes creative risks, generates mockups. Creates `DESIGN.md`. |

Plus skills for specific jobs:

| Skill | What it does |
|-------|-------------|
| `/plan-eng-review` | Think through architecture, data flow, edge cases, and tests before building |
| `/plan-design-review` | 80-item design audit with letter grades and AI slop detection (report only) |
| `/design-review` | Same design audit, then fixes what it finds with atomic commits |
| `/ship` | Sync main, run tests, push, open PR. One command. |
| `/browse` | Give the agent a real browser. Chromium, real clicks, real screenshots. ~100ms per command. |
| `/setup-browser-cookies` | Import cookies from your browser into the headless session for authenticated testing. |
| `/retro` | Weekly retro. Per-person breakdowns, shipping streaks, test health trends. |
| `/document-release` | Update all project docs to match what you just shipped. |

**[Deep dives with examples and philosophy for every skill →](docs/skills.md)**

## What's different from gstack

**No corporate hierarchy.** gstack frames everything as CEO reviews, eng manager gates, staff engineer audits. skystack uses a friend-group model — a planner, a designer, a dev, and a tester who collaborate and give each other feedback.

**Stack-aware.** skystack auto-detects your project's tech stack (Flutter, SwiftUI, React, Rails, etc.) and tailors all recommendations — accessibility APIs, chart libraries, design patterns, build commands — to match.

**`/pm` is the orchestrator.** One command takes a feature from idea to shipped code: research, spec, design feedback, architecture check, implementation, QA, ship.

**`/qa` gives the agent eyes.** It opens a real browser, clicks through your app, finds bugs, fixes them with atomic commits, and writes regression tests. That changed how I work.

**Test everything.** `/ship` bootstraps test frameworks from scratch if you don't have one. Every `/qa` bug fix generates a regression test. Tests make vibe coding safe instead of yolo coding.

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
