# skystack

**skystack** is a fork of [gstack](https://github.com/garrytan/gstack), adapted for my work: flutter mobile apps (iOS/Android) alongside web projects.

It turns Claude Code into a small group of collaborators: a planner, a designer, a dev who reviews your code, and a tester who breaks things before users do. All slash commands, all Markdown.

skystack strips out the founder-tech-bro framing from gstack and makes it work for solo devs.

## get started

1. Install skystack (30 seconds — see below)
2. Run `/pm "your feature idea"` to plan a feature
3. Run `/review` on any branch with changes
4. Run `/qa` on your staging URL
5. Stop there. You'll know if this is for you.

## install

**requirements:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+

### step 1: install on your machine

Open Claude Code and paste this. Claude does the rest.

> Install skystack: run **`git clone https://github.com/skylartaylor/skystack.git ~/.claude/skills/skystack && cd ~/.claude/skills/skystack && ./setup`** then add a "skystack" section to CLAUDE.md that says to use the /browse skill from skystack for all web browsing, never use mcp__claude-in-chrome__* tools, and lists the available skills: /pm, /design, /review, /qa, /debug, /docs, /research, /publish, /browse, /setup-browser-cookies, /retro. Then ask the user if they also want to add skystack to the current project so teammates get it.

### step 2: add to your repo for collaborators (optional)

> Add skystack to this project: run **`cp -Rf ~/.claude/skills/skystack .claude/skills/skystack && rm -rf .claude/skills/skystack/.git && cd .claude/skills/skystack && ./setup`** then add a "skystack" section to this project's CLAUDE.md that says to use the /browse skill from skystack for all web browsing, never use mcp__claude-in-chrome__* tools, lists the available skills: /pm, /design, /review, /qa, /debug, /docs, /research, /publish, /browse, /setup-browser-cookies, /retro, and tells Claude that if skystack skills aren't working, run `cd .claude/skills/skystack && ./setup` to build the binary and register skills.

Real files get committed to your repo, not a submodule, so `git clone` just works. Everything lives inside `.claude/`. Nothing touches your PATH or runs in the background.

## the team

Four collaborators:

| Skill | | What they do |
|-------|--|--------------|
| `/pm` | **the planner** | Takes a feature from idea to shipped code. Does the research, writes the spec, coordinates the designer and dev for feedback, builds it, publishes it. |
| `/design` | **the designer** | Builds design systems or audits what you've built. Catches AI slop, proposes fixes, generates previews. |
| `/review` | **the dev** | Reads your diff, presents a review plan, catches bugs that pass CI. Auto-fixes the obvious ones, asks about the rest. |
| `/qa` | **the tester** | Opens a real browser, clicks through your app, presents a test plan, finds bugs. Fixes them or reports only — your choice. |

tools:

| Skill | What it does |
|-------|-------------|
| `/docs` | Writes new docs, updates existing ones after shipping, audits for staleness. |
| `/research` | Searches developer docs and forums, updates reference files for your stack. |
| `/publish` | Sync main, run tests, push, open PR. One command. |
| `/browse` | Give the agent a real browser. Chromium, real clicks, real screenshots. ~100ms per command. |
| `/setup-browser-cookies` | Import cookies from your browser into the headless session for authenticated testing. |
| `/retro` | Weekly retro. Shipping streaks, test health trends. |
| `/debug` | Systematic root-cause debugging. Iron Law: no fixes without root cause. |

**[Deep dives with examples and philosophy for every skill →](docs/skills.md)**

## differences from gstack

**No corporate hierarchy.** gstack frames everything as CEO reviews, eng manager gates, and staff engineer audits. skystack uses a friend-group model: a planner, a designer, a dev, and a tester who collaborate and give each other feedback.

**Stack-aware.** skystack auto-detects your project's tech stack — Flutter, SwiftUI, React, Rails, and more — and tailors recommendations to match.

**Every skill presents a plan first.** No agent goes off and does work without checking in. The Designer proposes what to audit, the Dev says what they'll review, and the Tester presents a test plan. You approve, adjust, or redirect before they start.

**`/pm` is the orchestrator.** One command takes a feature from idea to published code: research, spec, design feedback, architecture review, implementation, QA, and release.

**`/qa` gives the agent eyes.** It opens a real browser, clicks through your app, finds bugs, fixes them with atomic commits, and writes regression tests.

**`/research` keeps everyone sharp.** Each agent works from a reference file for your stack. `/research` updates those with current best practices.

**test everything.** `/publish` bootstraps test frameworks from scratch if you don't have one. Every `/qa` bug fix generates a regression test. Tests make vibe coding safer.

**works the way you actually work.** No feature branch required. `/review` works on `main` with staged or unstaged changes. `/publish` pushes directly when you're already on the base branch. `/docs` uses recent commit history when there's no PR to diff against. Working on main is fine.

## documentation

| Doc | What it covers |
|-----|---------------|
| [Skill Deep Dives](docs/skills.md) | Philosophy, examples, and workflow for every skill |
| [Architecture](ARCHITECTURE.md) | Design decisions and system internals |
| [Browser Reference](BROWSER.md) | Full command reference for `/browse` |
| [Contributing](CONTRIBUTING.md) | Dev setup, testing, contributor mode, and dev mode |
| [Changelog](CHANGELOG.md) | What's new in every version |

## troubleshooting

**Skill not showing up?** `cd ~/.claude/skills/skystack && ./setup`

**`/browse` fails?** `cd ~/.claude/skills/skystack && bun install && bun run build`

**Claude says it can't see the skills?** Make sure your project's `CLAUDE.md` has a skystack section. Add this:

```md
## skystack
Use /browse from skystack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /pm, /design, /review, /qa, /debug, /docs, /research, /publish, /browse,
/setup-browser-cookies, /retro.
If skystack skills aren't working, run `cd .claude/skills/skystack && ./setup`.
```

## why i made this

skystack started as a fork of [gstack](https://github.com/garrytan/gstack), which is an impressive Claude Code skill suite. The skill architecture, structured review roles, and QA automation are good ideas. This project keeps the useful parts and adapts them for my workflow: mobile apps, web projects, and a less corporate, more collaborative model.

## about garry...

gstack was created by [Garry Tan](https://x.com/garrytan) of [Y Combinator](https://www.ycombinator.com/). I forked it because I found the tooling useful, but I hated its use as a billboard for Garry or for the politics attached to his brand. What politics?

**The "die slow" incident.** In January 2024, Tan [posted on Twitter](https://missionlocal.org/2024/01/garry-tan-death-wish-sf-supervisors/): *"Fuck Chan Peskin Preston Walton Melgar Ronen Safai ... Die slow motherfuckers"* — naming seven San Francisco Board of Supervisors members. Three supervisors then [received death threat mailers](https://techcrunch.com/2024/01/31/san-francisco-supervisors-threats-yc-garry-tans-tweet/). Two filed police reports. He claimed it was a Tupac reference.

**Anti-labor politics.** He has [attacked public-sector unions](https://missionlocal.org/2026/02/sf-garry-tan-california-politics-garrys-list/) as "special interests," criticized striking teachers, and opposed ballot measures that would increase taxes on companies where executives earn 100x+ their median employee's salary. His organizations have actively opposed measures by SEIU Locals 1021 and 2015. The [New Republic](https://newrepublic.com/article/178675/garry-tan-tech-san-francisco) characterized it as "tech plutocrats dreaming of a right-wing San Francisco."

**Dark money in local politics.** Tan donated over [$100,000 to recall SF's progressive DA](https://missionlocal.org/2024/01/garry-tan-death-wish-sf-supervisors/) and $20,000 to recall school board members. In 2026, he launched ["Garry's List"](https://missionlocal.org/2026/02/sf-garry-tan-california-politics-garrys-list/), a 501(c)(4) dark-money nonprofit that can spend on elections without disclosing donors. The moderate coalition he helped build [spent close to $20 million](https://missionlocal.org/2024/12/the-2024-election-is-over-what-will-san-franciscos-big-money-groups-do-next/) on the 2024 SF election cycle. [Ten interconnected groups raised $33 million since 2020, half of it dark money](https://48hills.org/2024/02/ten-groups-33-million-half-of-it-dark-money-behind-the-billionaire-attacks-on-sf-politics/). A TogetherSF ballot measure backed by millions in billionaire money lost to a progressive counter-measure with basically no money.

**The YC pipeline.** Y Combinator has incubated some of big tech's most extractive companies. His political spending extends the same philosophy beyond products and into governance: use wealth to reshape public institutions in favor of business interests, weaken worker protections, and undermine progressive policy.

I met him once. I did not care for him.

## license & upstream

MIT. Based on [gstack](https://github.com/garrytan/gstack), which is also MIT-licensed.
