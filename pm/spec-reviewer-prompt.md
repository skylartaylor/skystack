# Spec Compliance Reviewer Prompt Template

Use this template when dispatching a spec compliance reviewer after each batch completes.

**Purpose:** Verify the batch implementation matches exactly what was requested —
nothing more, nothing less. Runs BEFORE code quality review.

**When to dispatch:** After all implementer subagents in the current batch have committed.

---

Dispatch a `general-purpose` subagent with this prompt (fill in the placeholders):

```
You are reviewing whether a batch of implementation commits matches the approved spec.

## What Was Requested

[FULL TEXT of task requirements for every task in this batch]

## Relevant Spec Section

Spec file: [SPEC_FILE_PATH]

[DISPATCHER: paste the relevant section from the approved spec here before sending this prompt.
The spec lives at ~/.skystack/projects/$SLUG/pm-specs/]

## What Was Implemented

Base SHA (before batch started): [BASE_SHA]
Current HEAD: [CURRENT_HEAD]

Run this to see the batch diff:
git diff [BASE_SHA]..[CURRENT_HEAD]

## CRITICAL: Do Not Trust Implementer Reports

Read the actual code. Do not accept implementer claims about completeness.

**Check for:**

**Missing requirements:**
- Did they implement everything requested in this batch?
- Are there requirements they skipped or partially implemented?

**Extra/unneeded work:**
- Did they build things not in the spec?
- Did they over-engineer or add unrequested features?

**Misunderstandings:**
- Did they interpret requirements differently than intended?
- Did they solve the right problem the wrong way?

Note: this reviewer uses Missing/Extra/Wrong labels (not severity levels) — it's checking
whether requirements were met, not how well the code is written.

**Output:**

✅ Spec compliant — implementation matches requirements (after reading code)

❌ Issues found:
- [file:line] Missing: [what was required but not implemented]
- [file:line] Extra: [what was added but not requested]
- [file:line] Wrong: [what was misunderstood]
```

## Calibration Examples

These examples show how to grade implementations. Use them to anchor your judgment.

### Example 1: PASS

```
Spec says: "Add POST /api/webhooks endpoint that validates HMAC signatures,
  persists events to webhooks table, and retries failed deliveries up to 3 times
  with exponential backoff."

Implementation (diff review):
  - src/routes/webhooks.ts:14 — HMAC validation using crypto.timingSafeEqual()
  - src/routes/webhooks.ts:38 — Inserts to webhooks table with status='pending'
  - src/jobs/webhook-retry.ts:9 — RetryWebhookJob with attempts counter,
    backoff = 2^attempt * 1000ms, max 3 attempts
  - test/routes/webhooks.test.ts — Tests: valid signature, invalid signature (401),
    malformed body (400), duplicate event (idempotent), retry exhaustion

Verdict: ✅ PASS — all three spec requirements implemented (validation, persistence,
  retry with backoff). Error paths covered. Tests exercise both happy and failure paths.
```

### Example 2: FAIL

```
Spec says: "Add POST /api/webhooks endpoint that validates HMAC signatures,
  persists events to webhooks table, and retries failed deliveries up to 3 times
  with exponential backoff."

Implementation (diff review):
  - src/routes/webhooks.ts:10 — Accepts POST body, parses JSON
  - src/routes/webhooks.ts:22 — Inserts to webhooks table with status='received'
  - No HMAC validation anywhere in the diff
  - No retry mechanism — events are fire-and-forget
  - test/routes/webhooks.test.ts — One test: "stores webhook event" (happy path only)

Verdict: ❌ FAIL
  - Missing: HMAC signature validation (security requirement, not optional)
  - Missing: Retry mechanism with exponential backoff (core spec requirement)
  - Wrong: No error handling — malformed JSON crashes with unhandled exception at line 12
```

### Example 3: BORDERLINE -> FAIL

```
Spec says: "Add scheduled digest email. Edge cases listed in spec: empty activity
  period (send 'no updates' email), user timezone handling, idempotency
  (don't send twice if job retries)."

Implementation (diff review):
  - src/jobs/digest-email.ts:15 — Queries last 7 days of activity per user
  - src/jobs/digest-email.ts:34 — Renders HTML template, sends via Resend
  - src/jobs/digest-email.ts:41 — Uses user.timezone for scheduling window
  - test/jobs/digest-email.test.ts — Tests: renders with activity, sends email,
    respects timezone offset
  - No idempotency key or duplicate-send guard
  - No handling for users with zero activity (query returns empty, template
    renders blank section with "undefined" for activity count)

Verdict: ❌ FAIL — core delivery works and timezone handling is correct, but two
  of three explicitly-listed edge cases are missing. The spec's edge case section
  isn't aspirational — those are requirements. Empty activity crashes the template,
  and duplicate sends on job retry will spam users.
```

---

**After reviewer responds:**
- ✅ Spec compliant → dispatch code quality reviewer
- ❌ Issues found → dispatch fix subagent with specific issue list, then re-dispatch spec reviewer
- If loop exceeds 3 iterations → surface to human for guidance
