# TODOS

## Auto-upgrade mode (zero-prompt)

**What:** Add a `GSTACK_AUTO_UPGRADE=1` env var or `~/.gstack/config` option that skips the AskUserQuestion prompt and upgrades automatically when a new version is detected.

**Why:** Power users and CI environments may want zero-friction upgrades without being asked every time.

**Context:** The current upgrade system (v0.3.4) always prompts via AskUserQuestion. This TODO adds an opt-in bypass. Implementation is ~10 lines in the preamble instructions: check for the env var/config before calling AskUserQuestion, and if set, go straight to the upgrade flow. Depends on the full upgrade system being stable first — wait for user feedback on the prompt-based flow before adding this.

**Effort:** S (small)
**Priority:** P3 (nice-to-have, revisit after adoption data)
