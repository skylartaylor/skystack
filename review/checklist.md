# Pre-Landing Review Checklist

## Instructions

Review the `git diff origin/main` output for the issues listed below. Be specific — cite `file:line` and suggest fixes. Skip anything that's fine. Only flag real problems.

**Two-pass review:**
- **Pass 1 (CRITICAL):** Run SQL & Data Safety and LLM Output Trust Boundary first. Highest severity.
- **Pass 2 (INFORMATIONAL):** Run all remaining categories. Lower severity but still actioned.

All findings get action via Fix-First Review: obvious mechanical fixes are applied automatically,
genuinely ambiguous issues are batched into a single user question.

**Output format:**

```
Pre-Landing Review: N issues (X critical, Y informational)

**AUTO-FIXED:**
- [file:line] Problem → fix applied

**NEEDS INPUT:**
- [file:line] Problem description
  Recommended fix: suggested fix
```

If no issues found: `Pre-Landing Review: No issues found.`

Be terse. For each issue: one line describing the problem, one line with the fix. No preamble, no summaries, no "looks good overall."

---

## Review Categories

### Pass 1 — CRITICAL

#### SQL & Data Safety
- String interpolation in SQL (even if values are `.to_i`/`.to_f` — use `sanitize_sql_array` or Arel)
- TOCTOU races: check-then-set patterns that should be atomic `WHERE` + `update_all`
- `update_column`/`update_columns` bypassing validations on fields that have or should have constraints
- N+1 queries: `.includes()` missing for associations used in loops/views (especially avatar, attachments)

#### Race Conditions & Concurrency
- Read-check-write without uniqueness constraint or `rescue RecordNotUnique; retry` (e.g., `where(hash:).first` then `save!` without handling concurrent insert)
- `find_or_create_by` on columns without unique DB index — concurrent calls can create duplicates
- Status transitions that don't use atomic `WHERE old_status = ? UPDATE SET new_status` — concurrent updates can skip or double-apply transitions
- `html_safe` on user-controlled data (XSS) — check any `.html_safe`, `raw()`, or string interpolation into `html_safe` output

#### LLM Output Trust Boundary
- LLM-generated values (emails, URLs, names) written to DB or passed to mailers without format validation. Add lightweight guards (`EMAIL_REGEXP`, `URI.parse`, `.strip`) before persisting.
- Structured tool output (arrays, hashes) accepted without type/shape checks before database writes.

#### Enum & Value Completeness
When the diff introduces a new enum value, status string, tier name, or type constant:
- **Trace it through every consumer.** Read (don't just grep — READ) each file that switches on, filters by, or displays that value. If any consumer doesn't handle the new value, flag it. Common miss: adding a value to the frontend dropdown but the backend model/compute method doesn't persist it.
- **Check allowlists/filter arrays.** Search for arrays or `%w[]` lists containing sibling values (e.g., if adding "revise" to tiers, find every `%w[quick lfg mega]` and verify "revise" is included where needed).
- **Check `case`/`if-elsif` chains.** If existing code branches on the enum, does the new value fall through to a wrong default?
To do this: use Grep to find all references to the sibling values (e.g., grep for "lfg" or "mega" to find all tier consumers). Read each match. This step requires reading code OUTSIDE the diff.

### Pass 2 — INFORMATIONAL

#### Conditional Side Effects
- Code paths that branch on a condition but forget to apply a side effect on one branch. Example: item promoted to verified but URL only attached when a secondary condition is true — the other branch promotes without the URL, creating an inconsistent record.
- Log messages that claim an action happened but the action was conditionally skipped. The log should reflect what actually occurred.

#### Magic Numbers & String Coupling
- Bare numeric literals used in multiple files — should be named constants documented together
- Error message strings used as query filters elsewhere (grep for the string — is anything matching on it?)

#### Dead Code & Consistency
- Variables assigned but never read
- Version mismatch between PR title and VERSION/CHANGELOG files
- CHANGELOG entries that describe changes inaccurately (e.g., "changed from X to Y" when X never existed)
- Comments/docstrings that describe old behavior after the code changed

#### LLM Prompt Issues
- 0-indexed lists in prompts (LLMs reliably return 1-indexed)
- Prompt text listing available tools/capabilities that don't match what's actually wired up in the `tool_classes`/`tools` array
- Word/token limits stated in multiple places that could drift

#### Test Gaps
- Negative-path tests that assert type/status but not the side effects (URL attached? field populated? callback fired?)
- Assertions on string content without checking format (e.g., asserting title present but not URL format)
- `.expects(:something).never` missing when a code path should explicitly NOT call an external service
- Security enforcement features (blocking, rate limiting, auth) without integration tests verifying the enforcement path works end-to-end

#### Completeness Gaps
- Shortcut implementations where the complete version would cost <30 minutes CC time (e.g., partial enum handling, incomplete error paths, missing edge cases that are straightforward to add)
- Options presented with only human-team effort estimates — should show both human and CC+skystack time
- Test coverage gaps where adding the missing tests is a "lake" not an "ocean" (e.g., missing negative-path tests, missing edge case tests that mirror happy-path structure)
- Features implemented at 80-90% when 100% is achievable with modest additional code

#### Crypto & Entropy
- Truncation of data instead of hashing (last N chars instead of SHA-256) — less entropy, easier collisions
- `rand()` / `Random.rand` for security-sensitive values — use `SecureRandom` instead
- Non-constant-time comparisons (`==`) on secrets or tokens — vulnerable to timing attacks

#### Time Window Safety
- Date-key lookups that assume "today" covers 24h — report at 8am PT only sees midnight→8am under today's key
- Mismatched time windows between related features — one uses hourly buckets, another uses daily keys for the same data

#### Type Coercion at Boundaries
- Values crossing Ruby→JSON→JS boundaries where type could change (numeric vs string) — hash/digest inputs must normalize types
- Hash/digest inputs that don't call `.to_s` or equivalent before serialization — `{ cores: 8 }` vs `{ cores: "8" }` produce different hashes

#### View/Frontend
- Inline `<style>` blocks in partials (re-parsed every render)
- O(n*m) lookups in views (`Array#find` in a loop instead of `index_by` hash)
- Ruby-side `.select{}` filtering on DB results that could be a `WHERE` clause (unless intentionally avoiding leading-wildcard `LIKE`)
- AI slop patterns (generic gradients, vague hero copy, template-default styling) — see full criteria in `pm/code-quality-reviewer-prompt.md` under "AI Slop Check"
  - Flag by **structure**, not string matches. The slop pattern (gradient background + card overlay + hero copy) re-emerges under different class names and color hexes; line-by-line string checks miss it. Ask: does this layout look like a generic SaaS template, or does it look built for this app?

---

## Severity Classification

```
CRITICAL (highest severity):      INFORMATIONAL (lower severity):
├─ SQL & Data Safety              ├─ Conditional Side Effects
├─ Race Conditions & Concurrency  ├─ Magic Numbers & String Coupling
├─ LLM Output Trust Boundary      ├─ Dead Code & Consistency
└─ Enum & Value Completeness      ├─ LLM Prompt Issues
                                   ├─ Test Gaps
                                   ├─ Completeness Gaps
                                   ├─ Crypto & Entropy
                                   ├─ Time Window Safety
                                   ├─ Type Coercion at Boundaries
                                   └─ View/Frontend

All findings are actioned via Fix-First Review. Severity determines
presentation order and classification of AUTO-FIX vs ASK — critical
findings lean toward ASK (they're riskier), informational findings
lean toward AUTO-FIX (they're more mechanical).
```

---

## Fix-First Heuristic

This heuristic is referenced by both `/review` and `/ship`. It determines whether
the agent auto-fixes a finding or asks the user.

```
AUTO-FIX (agent fixes without asking):     ASK (needs human judgment):
├─ Dead code / unused variables            ├─ Security (auth, XSS, injection)
├─ N+1 queries (missing .includes())      ├─ Race conditions
├─ Stale comments contradicting code       ├─ Design decisions
├─ Magic numbers → named constants         ├─ Large fixes (>20 lines)
├─ Missing LLM output validation           ├─ Enum completeness
├─ Version/path mismatches                 ├─ Removing functionality
├─ Variables assigned but never read       └─ Anything changing user-visible
└─ Inline styles, O(n*m) view lookups        behavior
```

**Rule of thumb:** If the fix is mechanical and a senior engineer would apply it
without discussion, it's AUTO-FIX. If reasonable engineers could disagree about
the fix, it's ASK.

**Critical findings default toward ASK** (they're inherently riskier).
**Informational findings default toward AUTO-FIX** (they're more mechanical).

---

## Review Decision Rubric

After applying auto-fixes and recording user decisions on ASK items, emit one
overall assessment that downstream skills (e.g., `/publish`) can gate on.

**Severity taxonomy** (from specialist output):
- **CRITICAL** — security hole, data loss risk, broken functionality
- **IMPORTANT** — missing tests, real performance issue, pattern violation
- **MINOR** — style, naming, cosmetic

**Assessment rubric** (count only unaddressed findings — fixed and user-dismissed items don't count):

| Remaining findings | Assessment |
|--------------------|------------|
| 0 findings, OR all auto-fixed, OR all ASK items resolved | `clean` |
| Only MINOR items, OR 1–2 IMPORTANT items, no CRITICAL | `advisory` |
| Any CRITICAL, OR 3+ IMPORTANT items | `blocked` |

**Bias toward approval.** A single warning in an otherwise-clean diff is `advisory`,
not `blocked`. The user reads the summary and decides. Only a CRITICAL issue or a
pile of IMPORTANT ones (3+) should shift the recommendation away from shipping.

Downstream gating (for `/publish`):
- `clean` or `advisory` → CLEARED (ship is fine, advisory findings shown for context)
- `blocked` → NOT CLEARED (user should look before shipping)

---

## Suppressions — DO NOT flag these

Telling a reviewer what *not* to flag is where the prompt engineering value lives.
Without these boundaries, you get a firehose of speculative warnings that developers
learn to ignore.

### Universal anti-flags (apply to every specialist)

- **Theoretical risks requiring unlikely preconditions.** If the exploit chain is
  longer than 2 steps ("if attacker controls X, and then Y happens, and then Z..."),
  it's speculation. Skip it.
- **Defense-in-depth when primary defense is adequate.** If the code is already safe,
  don't demand a second belt.
- **Issues in unchanged code.** Only flag what this diff introduces or modifies.
  Pre-existing problems are not in scope.
- **"Consider using library X"** suggestions when the existing approach works fine.
- **Style and naming preferences** when reasonable engineers would disagree.
- **Suggesting consistency-only changes** (wrapping a value in a conditional to match
  how another constant is guarded).
- **Harmless no-ops** (e.g., `.reject` on an element that's never in the array).
- **Anything already addressed in the diff** — read the full diff before commenting.

### Security specialist anti-flags

- Theoretical XSS in contexts where output is escaped by the framework (Rails `h`,
  React `{}` interpolation, Vue `{{ }}`).
- SSRF warnings on URLs sourced from config, env vars, or hardcoded constants —
  only user-controlled URLs are SSRF risks.
- CSRF on endpoints that use the framework's built-in session-bound CSRF tokens.
- Timing attacks on comparisons that aren't touching secrets or tokens.
- "Add rate limiting" on endpoints that already sit behind upstream rate limiting.

### Performance specialist anti-flags

- Micro-optimizations outside hot paths (admin-only routes, one-time migrations,
  background jobs, setup scripts).
- Asymptotic concerns on bounded-N collections — N<100 is always fine.
- "Could cache this" when the value is computed once per request.
- Preloading suggestions on queries returning <10 rows.
- Suggesting index additions without evidence the query is slow or frequent.

### Test coverage specialist anti-flags

- Missing tests that would just re-assert the type system ("test that function returns
  a string").
- Coverage demands on pure-display components — prefer integration tests at the page level.
- Testing private/internal methods that are already exercised through public API tests.
- Branch coverage on branches that only exist because of TypeScript narrowing or
  language-required defensive checks.
- "Test exercises multiple guards simultaneously" — tests don't need to isolate every guard.

### Code quality / general anti-flags

- "X is redundant with Y" when the redundancy aids readability (e.g., `present?`
  redundant with `length > 20`).
- "Add a comment explaining why this threshold/constant was chosen" — thresholds
  change during tuning, comments rot.
- "This assertion could be tighter" when the assertion already covers the behavior.
- "Regex doesn't handle edge case X" when the input is constrained and X never occurs
  in practice.
- Eval threshold changes (max_actionable, min scores) — tuned empirically, change constantly.

---

## Calibration

These examples show how to apply the Fix-First Heuristic. Use them to anchor your judgment on AUTO-FIX vs ASK.

### AUTO-FIX example

```
Finding: src/models/user.rb:47 — N+1 query. `users.each { |u| u.avatar.url }`
  loads avatar association inside a loop. Missing `.includes(:avatar)`.

Classification: AUTO-FIX

Reasoning:
  - The fix is mechanical: add `.includes(:avatar)` to the query on line 43.
  - No ambiguity about the correct fix — there's exactly one right answer.
  - No behavioral change — same results, fewer queries.
  - A senior engineer would apply this without discussion.
  - Category is "N+1 queries" which is explicitly listed under AUTO-FIX.

Action taken:
  - src/models/user.rb:43 — Changed `User.where(active: true)` to
    `User.where(active: true).includes(:avatar)`
```

### ASK example

```
Finding: src/services/payment_processor.rb:89 — Race condition. Two concurrent
  requests can both read balance=100, both deduct 75, resulting in balance=-50.
  The check (`if balance >= amount`) and update (`update!(balance: balance - amount)`)
  are not atomic.

Classification: ASK

Reasoning:
  - This is a race condition — explicitly listed under ASK.
  - Multiple valid fixes exist with different tradeoffs:
    (a) Pessimistic lock: `with_lock { ... }` — simple but blocks concurrent reads
    (b) Optimistic lock: `where("balance >= ?", amount).update_all("balance = balance - ?", amount)`
        — no blocking but caller must handle 0-rows-updated case
    (c) Database constraint: `CHECK (balance >= 0)` — catches it at DB level but
        changes error handling throughout the app
  - The right choice depends on traffic patterns and error UX — that's a design
    decision, not a mechanical fix.
  - Category is "Race conditions" which is explicitly listed under ASK.
  - This is a CRITICAL finding, which defaults toward ASK.

Presented to user as:
  NEEDS INPUT:
  - src/services/payment_processor.rb:89 — Race condition: concurrent balance
    deductions can overdraw. Check-then-update is not atomic.
    Recommended fix: Use optimistic locking with atomic UPDATE WHERE balance >= amount
```
