# skystack

**skystack** is a workflow and browser toolkit for Claude Code and OpenAI Codex,
adapted from [gstack](https://github.com/garrytan/gstack) for Flutter mobile apps
(iOS/Android) alongside web projects.

It gives your coding agent focused workflows for planning, implementation,
review, QA, publishing, debugging, infrastructure, and edit safety. Skills load
only when the task calls for them, so a browser check does not drag an entire
release process into context.

skystack strips out the founder-tech-bro framing from gstack and makes it work for solo devs.

## get started

1. Install skystack for Claude Code or Codex
2. Run `/pm "your feature idea"` to plan a feature
3. Run `/review` on any branch with changes
4. Run `/qa` on your staging URL
5. Stop there. You'll know if this is for you.

## install

**requirements:** [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+,
and either [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or the
[Codex CLI](https://developers.openai.com/codex/cli/).

### Claude Code

Open Claude Code and paste this. Claude does the rest.

> Install skystack: run **`git clone https://github.com/skylartaylor/skystack.git ~/.claude/skills/skystack && cd ~/.claude/skills/skystack && ./setup`** then add a "skystack" section to CLAUDE.md that says to use the /browse skill from skystack for browser automation, never use mcp__claude-in-chrome__* tools, and run `/skystack` when help choosing a workflow is needed.

To vendor it for collaborators:

> Add skystack to this project: run **`cp -Rf ~/.claude/skills/skystack .claude/skills/skystack && rm -rf .claude/skills/skystack/.git && cd .claude/skills/skystack && ./setup`** then add the same skystack guidance to the project's CLAUDE.md.

Real files get committed to your repo, not a submodule, so `git clone` just works. Everything lives inside `.claude/`. Nothing touches your PATH or runs in the background.

### Codex

Clone the repository anywhere and run:

```bash
git clone https://github.com/skylartaylor/skystack.git
cd skystack
./setup-codex
```

This generates the Codex-native skills, builds the browser and mobile drivers,
and links the skills into `$CODEX_HOME/skills` (`~/.codex/skills` by default).
Restart Codex after setup.

## the workflows

| Skill | What it does |
|-------|--------------|
| `/pm` | Turns an idea into an approved spec and verified implementation, then asks what to publish. |
| `/design` | Builds or audits a design system and catches generic AI-made UI patterns. |
| `/review` | Reviews a diff, plan, or architecture. Read-only unless you explicitly request fixes. |
| `/qa` | Exercises real browser or mobile flows and captures evidence. Fixes only when requested. |
| `/publish` | Verifies and delivers the exact endpoint you authorized: local commits, push, PR, merge, deploy, tag, or release. |
| `/diagnose` | Confirms a root cause before implementing and verifying a fix. |
| `/devops` | Operates infrastructure directly, asking only before destructive or hard-to-reverse actions. |
| `/security` | Finds realistic attack paths across code, infrastructure, dependencies, and AI/tool boundaries. Read-only by default. |
| `/codex` | Gets an independent Codex review, adversarial challenge, or focused consultation from Claude Code. |
| `/document-release` | Writes new docs, updates shipped behavior, or audits existing docs for drift. |
| `/research` | Refreshes project-specific design, engineering, and testing references. |
| `/retro` | Reviews recent engineering activity and quality trends. |

browser and project tools:

| Skill | What it does |
|-------|--------------|
| `/browse` | Fast persistent Chromium navigation, interaction, inspection, and screenshots. Run `$B --help` for the current command reference. |
| `/setup-browser-cookies` | Imports selected cookies from a real browser for authenticated testing. |
| `/benchmark` | Measures page-load and Core Web Vitals regressions between two states. |
| `/canary` | Watches a deployment for console errors, page failures, visual changes, and performance regressions. |
| `/health` | Runs the project's existing quality tools and reports a read-only 0–10 dashboard. |
| `/checkpoint` | Saves and restores git state, decisions, and remaining work. |
| `/skystack-upgrade` | Updates a global or vendored installation and rebuilds its tools. |

edit-safety helpers:

| Skill | What it does |
|-------|--------------|
| `/careful` | Warns before destructive shell commands. |
| `/freeze` | Restricts edits to one approved directory. |
| `/guard` | Combines destructive-command warnings with a directory edit boundary. |
| `/unfreeze` | Clears the current edit boundary. |

**[Current skill catalog and behavior →](docs/skills.md)**

## differences from gstack

**No corporate hierarchy.** gstack frames workflows as CEO reviews, manager gates,
and staff-engineer audits. skystack names the job directly.

**Progressive disclosure.** The root skill routes to the narrowest workflow.
Browser commands come from `$B --help`; release details stay in `/publish`;
mobile QA details stay in `/qa`.

**Autonomous inside the boundary.** Safe, reversible work proceeds without
ceremonial approvals. Skills ask when a decision changes the outcome or an
action is destructive, externally visible, or hard to undo.

**`/pm` has two real checkpoints.** You approve product direction, it builds and
verifies autonomously, then you choose whether to publish. It uses specialists
only when the feature genuinely crosses independent domains.

**`/qa` gives the agent eyes.** It opens a real browser or mobile simulator,
performs actions, observes results, and captures evidence. It stays report-only
unless you asked for fixes.

**`/publish` respects the requested endpoint.** It does not assume every change
needs a version bump, changelog, framework bootstrap, PR, or deployment. It
discovers the repository's actual checks and conventions, verifies the final
state, and performs only the authorized delivery actions.

**Works with the repository you have.** No feature branch is required. Review
can inspect committed, staged, unstaged, and relevant untracked changes.
Publishing preserves unrelated dirt and follows the repository's own branching,
testing, documentation, and release rules.

## documentation

| Doc | What it covers |
|-----|---------------|
| [Skill Guide](docs/skills.md) | Current Claude and Codex catalogs, behavior, and workflow boundaries |
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
Use /browse from skystack for browser automation. Never use mcp__claude-in-chrome__* tools.
Run /skystack when help choosing a skystack workflow is needed.
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
