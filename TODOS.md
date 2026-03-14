# TODOS

## Auto-upgrade mode (zero-prompt)

**What:** Add a `GSTACK_AUTO_UPGRADE=1` env var or `~/.gstack/config` option that skips the AskUserQuestion prompt and upgrades automatically when a new version is detected.

**Why:** Power users and CI environments may want zero-friction upgrades without being asked every time.

**Context:** The current upgrade system (v0.3.4) always prompts via AskUserQuestion. This TODO adds an opt-in bypass. Implementation is ~10 lines in the preamble instructions: check for the env var/config before calling AskUserQuestion, and if set, go straight to the upgrade flow. Depends on the full upgrade system being stable first — wait for user feedback on the prompt-based flow before adding this.

**Effort:** S (small)
**Priority:** P3 (nice-to-have, revisit after adoption data)

## GitHub Actions eval upload

**What:** Run eval suite in CI, upload result JSON as artifact, post summary comment on PR.

**Why:** Currently evals only run locally. CI integration would catch quality regressions before merge and provide a persistent record of eval results per PR.

**Context:** Requires `ANTHROPIC_API_KEY` in CI secrets. Cost is ~$4/run. The eval persistence system (v0.3.6) writes JSON to `~/.gstack-dev/evals/` — CI would upload these as GitHub Actions artifacts and use `eval:compare` to post a delta comment on the PR.

**Depends on:** Eval persistence shipping (v0.3.6).
**Effort:** M (medium)
**Priority:** P2

## Eval web dashboard

**What:** `bun run eval:dashboard` serves local HTML with charts: cost trending, detection rate over time, pass/fail history.

**Why:** The CLI tools (`eval:list`, `eval:compare`, `eval:summary`) are good for quick checks but visual charts are better for spotting trends over many runs.

**Context:** Reads the same `~/.gstack-dev/evals/*.json` files. ~200 lines HTML + chart.js code served via a simple Bun HTTP server. No external dependencies beyond what's already installed.

**Depends on:** Eval persistence + eval:list shipping (v0.3.6).
**Effort:** M (medium)
**Priority:** P3 (nice-to-have, revisit after eval system sees regular use)
