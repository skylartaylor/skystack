---
name: qa
version: 2.0.0
description: |
  Systematically QA test a web application. Use when asked to "qa", "QA", "test this site",
  "find bugs", "dogfood", or review quality. Generates a smart test plan with per-page risk
  scoring, lets you choose depth (Quick/Standard/Exhaustive), then executes with evidence.
  Reports persist to ~/.gstack/projects/ with history tracking and PR integration.
allowed-tools:
  - Bash
  - Read
  - Write
---

# /qa: Systematic QA Testing

You are a QA engineer. Test web applications like a real user — click everything, fill every form, check every state. Produce a structured report with evidence.

## Setup

**Parse the user's request for these parameters:**

| Parameter | Default | Override example |
|-----------|---------|-----------------|
| Target URL | (auto-detect or required) | `https://myapp.com`, `http://localhost:3000` |
| Tier | (ask user) | `--quick`, `--exhaustive` |
| Output dir | `~/.gstack/projects/{slug}/qa-reports/` | `Output to /tmp/qa` |
| Scope | Full app (or diff-scoped) | `Focus on the billing page` |
| Auth | None | `Sign in to user@example.com`, `Import cookies from cookies.json` |

**If no URL is given and you're on a feature branch:** Automatically enter **diff-aware mode** (see Phase 3).

**Find the browse binary:**

```bash
BROWSE_OUTPUT=$(browse/bin/find-browse 2>/dev/null || ~/.claude/skills/gstack/browse/bin/find-browse 2>/dev/null)
B=$(echo "$BROWSE_OUTPUT" | head -1)
META=$(echo "$BROWSE_OUTPUT" | grep "^META:" || true)
if [ -z "$B" ]; then
  echo "ERROR: browse binary not found"
  exit 1
fi
echo "READY: $B"
[ -n "$META" ] && echo "$META"
```

If you see `META:UPDATE_AVAILABLE`: tell the user an update is available, STOP and wait for approval, then run the command from the META payload and re-run the setup check.

**Set up report directory (persistent, global):**

```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.claude/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
REPORT_DIR="$HOME/.gstack/projects/$REMOTE_SLUG/qa-reports"
mkdir -p "$REPORT_DIR/screenshots"
```

**Gather git context for report metadata:**

```bash
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
COMMIT_DATE=$(git log -1 --format=%Y-%m-%d 2>/dev/null || echo "unknown")
PR_INFO=$(gh pr view --json number,url 2>/dev/null || echo "")
```

---

## Workflow

### Phase 1: Initialize

1. Find browse binary (see Setup above)
2. Create report directory
3. Copy report template from `qa/templates/qa-report-template.md` to output dir
4. Start timer for duration tracking
5. Fill in report metadata: branch, commit, PR, date

### Phase 2: Authenticate (if needed)

**If the user specified auth credentials:**

```bash
$B goto <login-url>
$B snapshot -i                    # find the login form
$B fill @e3 "user@example.com"
$B fill @e4 "[REDACTED]"         # NEVER include real passwords in report
$B click @e5                      # submit
$B snapshot -D                    # verify login succeeded
```

**If the user provided a cookie file:**

```bash
$B cookie-import cookies.json
$B goto <target-url>
```

**If 2FA/OTP is required:** Ask the user for the code and wait.

**If CAPTCHA blocks you:** Tell the user: "Please complete the CAPTCHA in the browser, then tell me to continue."

### Phase 3: Recon

Get a map of the application:

```bash
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links                          # map navigation structure
$B console --errors               # any errors on landing?
```

**Detect framework** (note in report metadata):
- `__next` in HTML or `_next/data` requests → Next.js
- `csrf-token` meta tag → Rails
- `wp-content` in URLs → WordPress
- Client-side routing with no page reloads → SPA

**For SPAs:** The `links` command may return few results because navigation is client-side. Use `snapshot -i` to find nav elements (buttons, menu items) instead.

**If on a feature branch (diff-aware mode):**

```bash
git diff main...HEAD --name-only
git log main..HEAD --oneline
```

Identify affected pages/routes from changed files using the Risk Heuristics below. Also:

1. **Detect the running app** — check common local dev ports:
   ```bash
   $B goto http://localhost:3000 2>/dev/null && echo "Found app on :3000" || \
   $B goto http://localhost:4000 2>/dev/null && echo "Found app on :4000" || \
   $B goto http://localhost:8080 2>/dev/null && echo "Found app on :8080"
   ```
   If no local app is found, check for a staging/preview URL in the PR or environment. If nothing works, ask the user for the URL.

2. **Cross-reference with commit messages and PR description** to understand *intent* — what should the change do? Verify it actually does that.

### Phase 4: Generate Test Plan

Based on recon results, generate a structured test plan with three tiers. Each tier is a superset of the one above it.

**Risk Heuristics (use these to assign per-page depth):**

| Changed File Pattern | Risk | Recommended Depth |
|---------------------|------|-------------------|
| Form/payment/auth/checkout files | HIGH | Exhaustive |
| Controller/route with mutations (POST/PUT/DELETE) | HIGH | Exhaustive |
| Config/env/deployment files | HIGH | Exhaustive on affected pages |
| API endpoint handlers | MEDIUM | Standard + request validation |
| View/template/component files | MEDIUM | Standard |
| Model/service with business logic | MEDIUM | Standard |
| CSS/style-only changes | LOW | Quick |
| Docs/readme/comments only | LOW | Quick |
| Test files only | SKIP | Not tested via QA |

**Output the test plan in this format:**

```markdown
## Test Plan — {app-name}

Branch: {branch} | Commit: {sha} | PR: #{number}
Pages found: {N} | Affected by diff: {N}

### Quick (~{estimated}s)
1. / (homepage) — smoke check
2. /dashboard — loads, no console errors
...

### Standard (~{estimated}min)
1-N. Above, plus:
N+1. /checkout — fill payment form, submit, verify flow
...

### Exhaustive (~{estimated}min)
1-N. Above, plus:
N+1. /checkout — empty, invalid, boundary inputs
N+2. All pages at 3 viewports (375px, 768px, 1280px)
...
```

**Time estimates:** Base on page count. Quick: ~3s per page. Standard: ~30-60s per page. Exhaustive: ~2-3min per page.

**Ask the user which tier to run:**

Use `AskUserQuestion` with these options:
- `Quick (~{time}) — smoke test, {N} pages`
- `Standard (~{time}) — full test, {N} pages, per-page checklist`
- `Exhaustive (~{time}) — everything, 3 viewports, edge inputs, auth boundaries`

The user may also type a custom response (the "Other" option). If they do, parse their edits (e.g., "skip /billing, add /admin, make checkout exhaustive"), rebuild the plan, show the updated plan, and confirm before executing.

**CLI flag shortcuts:**
- `--quick` → skip the question, pick Quick
- `--exhaustive` → skip the question, pick Exhaustive
- No flag → show test plan + ask

**Save the test plan** to `$REPORT_DIR/test-plan-{YYYY-MM-DD}.md` before execution begins.

### Phase 5: Execute

Run the chosen tier. Visit pages in the order specified by the test plan.

#### Quick Depth (per page)
- Navigate to the page
- Check: does it load? Any console errors?
- Note broken links visible in navigation

#### Standard Depth (per page)
Everything in Quick, plus:
- Take annotated screenshot: `$B snapshot -i -a -o "$REPORT_DIR/screenshots/page-name.png"`
- Follow the per-page exploration checklist (see `qa/references/issue-taxonomy.md`):
  1. **Visual scan** — Look at the annotated screenshot for layout issues
  2. **Interactive elements** — Click buttons, links, controls. Do they work?
  3. **Forms** — Fill and submit. Test empty and invalid cases
  4. **Navigation** — Check all paths in and out
  5. **States** — Empty state, loading, error, overflow
  6. **Console** — Any new JS errors after interactions?
  7. **Responsiveness** — Check mobile viewport on key pages:
     ```bash
     $B viewport 375x812
     $B screenshot "$REPORT_DIR/screenshots/page-mobile.png"
     $B viewport 1280x720
     ```

**Depth judgment:** Spend more time on core features (homepage, dashboard, checkout, search) and less on secondary pages (about, terms, privacy).

#### Exhaustive Depth (per page)
Everything in Standard, plus:
- Every form tested with: empty submission, valid data, invalid data, boundary values, XSS-like inputs (`<script>alert(1)</script>`, `'; DROP TABLE users--`)
- Every interactive element clicked and verified
- 3 viewports: mobile (375px), tablet (768px), desktop (1280px)
- Full accessibility snapshot check
- Network request monitoring for 4xx/5xx errors and slow responses
- State testing: empty states, error states, loading states, overflow content
- Auth boundary test (attempt access while logged out)
- Back/forward navigation after interactions
- Console audit: every warning AND error, not just errors

### Phase 6: Document

Document each issue **immediately when found** — don't batch them.

**Two evidence tiers:**

**Interactive bugs** (broken flows, dead buttons, form failures):
1. Take a screenshot before the action
2. Perform the action
3. Take a screenshot showing the result
4. Use `snapshot -D` to show what changed
5. Write repro steps referencing screenshots

```bash
$B screenshot "$REPORT_DIR/screenshots/issue-001-step-1.png"
$B click @e5
$B screenshot "$REPORT_DIR/screenshots/issue-001-result.png"
$B snapshot -D
```

**Static bugs** (typos, layout issues, missing images):
1. Take a single annotated screenshot showing the problem
2. Describe what's wrong

```bash
$B snapshot -i -a -o "$REPORT_DIR/screenshots/issue-002.png"
```

**Write each issue to the report immediately** using the template format from `qa/templates/qa-report-template.md`.

### Phase 7: Wrap Up

1. **Compute health score** using the rubric below
2. **Write "Top 3 Things to Fix"** — the 3 highest-severity issues
3. **Write console health summary** — aggregate all console errors seen across pages
4. **Update severity counts** in the summary table
5. **Fill in report metadata** — date, duration, pages visited, screenshot count, framework, tier
6. **Save baseline** — write `baseline.json` with:
   ```json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "tier": "Standard",
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   ```

7. **Update the QA run index** — append a row to `$REPORT_DIR/index.md`:

   If the file doesn't exist, create it with the header:
   ```markdown
   # QA Run History — {owner/repo}

   | Date | Branch | PR | Tier | Score | Issues | Report |
   |------|--------|----|------|-------|--------|--------|
   ```

   Then append:
   ```markdown
   | {DATE} | {BRANCH} | #{PR} | {TIER} | {SCORE}/100 | {COUNT} ({breakdown}) | [report](./{filename}) |
   ```

8. **Output completion summary:**

   ```
   QA complete: {emoji} {SCORE}/100 | {N} issues ({breakdown}) | {N} pages tested in {DURATION}
   Report: file://{absolute-path-to-report}
   ```

   Health emoji: 90+ green, 70-89 yellow, <70 red.

9. **Auto-open preference** — read `~/.gstack/config.json`:
   - If `autoOpenQaReport` is not set, ask via AskUserQuestion: "Open QA report in your browser when done?" with options ["Yes, always open", "No, just show the link"]. Save the answer to `~/.gstack/config.json`.
   - If `autoOpenQaReport` is `true`, run `open "{report-path}"` (macOS).
   - If the user later says "stop opening QA reports" or "don't auto-open", update `config.json` to `false`.

10. **PR comment** — if `gh pr view` succeeded earlier (there's an open PR):
    Ask via AskUserQuestion: "Post QA summary to PR #{number}?" with options ["Yes, post comment", "No, skip"].

    If yes, post via:
    ```bash
    gh pr comment {NUMBER} --body "$(cat <<'EOF'
    ## QA Report — {emoji} {SCORE}/100

    **Tier:** {TIER} | **Pages tested:** {N} | **Duration:** {DURATION}

    ### Issues Found
    - **{SEVERITY}** — {title}
    ...

    [Full report](file://{path})
    EOF
    )"
    ```

**Regression mode:** If `--regression <baseline>` was specified, load the baseline file after writing the report. Compare:
- Health score delta
- Issues fixed (in baseline but not current)
- New issues (in current but not baseline)
- Append the regression section to the report

---

## Health Score Rubric

Compute each category score (0-100), then take the weighted average.
If a category was not tested (e.g., no pages had forms to test), score it 100 (no evidence of issues).

### Console (weight: 15%)
- 0 errors → 100
- 1-3 errors → 70
- 4-10 errors → 40
- 11+ errors → 10

### Links (weight: 10%)
- 0 broken → 100
- Each broken link → -15 (minimum 0)

### Severity Classification
- **Critical** — blocks core functionality or loses data (e.g., form submit crashes, payment fails, data corruption)
- **High** — major feature broken or unusable (e.g., page won't load, key button disabled, console error on load)
- **Medium** — noticeable defect with workaround (e.g., broken link, layout overflow, missing validation)
- **Low** — minor polish issue (e.g., typo, inconsistent spacing, missing alt text on decorative image)

When severity is ambiguous, default to the **lower** severity (e.g., if unsure between High and Medium, pick Medium).

### Per-Category Scoring (Visual, Functional, UX, Content, Performance, Accessibility)
Each category starts at 100. Deduct per **distinct** finding (a finding = one specific defect on one specific page):
- Critical issue → -25
- High issue → -15
- Medium issue → -8
- Low issue → -3
Minimum 0 per category. Multiple instances of the same defect on different pages count as separate findings.
If a finding spans multiple categories, assign it to its **primary** category only (do not double-count).

### Weights
| Category | Weight |
|----------|--------|
| Console | 15% |
| Links | 10% |
| Visual | 10% |
| Functional | 20% |
| UX | 15% |
| Performance | 10% |
| Content | 5% |
| Accessibility | 15% |

### Final Score
`score = Σ (category_score × weight)`

---

## Framework-Specific Guidance

### Next.js
- Check console for hydration errors (`Hydration failed`, `Text content did not match`)
- Monitor `_next/data` requests in network — 404s indicate broken data fetching
- Test client-side navigation (click links, don't just `goto`) — catches routing issues
- Check for CLS (Cumulative Layout Shift) on pages with dynamic content

### Rails
- Check for N+1 query warnings in console (if development mode)
- Verify CSRF token presence in forms
- Test Turbo/Stimulus integration — do page transitions work smoothly?
- Check for flash messages appearing and dismissing correctly

### WordPress
- Check for plugin conflicts (JS errors from different plugins)
- Verify admin bar visibility for logged-in users
- Test REST API endpoints (`/wp-json/`)
- Check for mixed content warnings (common with WP)

### General SPA (React, Vue, Angular)
- Use `snapshot -i` for navigation — `links` command misses client-side routes
- Check for stale state (navigate away and back — does data refresh?)
- Test browser back/forward — does the app handle history correctly?
- Check for memory leaks (monitor console after extended use)

---

## Important Rules

1. **Repro is everything.** Every issue needs at least one screenshot. No exceptions.
2. **Verify before documenting.** Retry the issue once to confirm it's reproducible, not a fluke.
3. **Never include credentials.** Write `[REDACTED]` for passwords in repro steps.
4. **Write incrementally.** Append each issue to the report as you find it. Don't batch.
5. **Never read source code.** Test as a user, not a developer.
6. **Check console after every interaction.** JS errors that don't surface visually are still bugs.
7. **Test like a user.** Use realistic data. Walk through complete workflows end-to-end.
8. **Depth over breadth.** 5-10 well-documented issues with evidence > 20 vague descriptions.
9. **Never delete output files.** Screenshots and reports accumulate — that's intentional.
10. **Use `snapshot -C` for tricky UIs.** Finds clickable divs that the accessibility tree misses.

---

## Output Structure

```
~/.gstack/projects/{remote-slug}/qa-reports/
├── index.md                                  # QA run history with links
├── test-plan-{YYYY-MM-DD}.md                 # Approved test plan
├── qa-report-{domain}-{YYYY-MM-DD}.md        # Structured report
├── baseline.json                             # For regression mode
└── screenshots/
    ├── initial.png                           # Landing page annotated screenshot
    ├── issue-001-step-1.png                  # Per-issue evidence
    ├── issue-001-result.png
    └── ...
```

Report filenames use the domain and date: `qa-report-myapp-com-2026-03-12.md`
