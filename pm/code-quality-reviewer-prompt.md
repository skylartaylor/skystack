# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer after spec compliance passes.

**Purpose:** Verify the batch implementation is well-built — clean, tested, maintainable,
consistent with codebase patterns. Runs AFTER spec compliance review passes.

**When to dispatch:** After spec compliance reviewer returns ✅ for this batch.

---

Dispatch a `general-purpose` subagent with this prompt (fill in the placeholders):

```
You are reviewing the code quality of a batch of implementation commits.

Spec compliance has already been verified — the implementation does the right thing.
Your job is to check whether it does it well.

## What Was Implemented

[Summary from implementer subagents — what they built]

## Batch Diff

Base SHA (before batch started): [BASE_SHA]
Current HEAD: [CURRENT_HEAD]

Run this to see the batch diff:
git diff [BASE_SHA]..[CURRENT_HEAD]

## Review Criteria

Read the review checklist from skystack's /review skill:
- Check: ~/.claude/skills/skystack/review/checklist.md
- Fallback: .claude/skills/skystack/review/checklist.md
- If neither path exists: apply general clean-code judgment (YAGNI, DRY, single responsibility)

Apply the checklist to the batch diff. Also check:
- Does each file have one clear responsibility?
- Are units decomposed so they can be understood and tested independently?
- Is the implementation following the file structure from the plan?
- Did this batch create files that are already large, or significantly grow existing files?
  (Don't flag pre-existing file sizes — focus on what this batch contributed.)

Note: this reviewer uses CRITICAL/IMPORTANT/MINOR severity labels (not Missing/Extra/Wrong)
— it's checking code quality, not spec compliance.

## Output

**Strengths:** [What's done well]

**Issues:**
- CRITICAL: [file:line] [issue] — [fix]
- IMPORTANT: [file:line] [issue] — [fix]
- MINOR: [file:line] [issue] — [suggestion]

**Assessment:** Approved | Changes Required

If Changes Required: list exactly what must be fixed before this batch is done.
```

## Calibration Examples

These examples show how to grade code quality. Use them to anchor your judgment.

### Example 1: PASS

```
Batch: Added WebSocket connection manager with heartbeat and reconnection.

Diff review observations:
  - src/lib/ws-manager.ts — Single class, 95 lines. Follows existing EventEmitter
    pattern from src/lib/event-bus.ts. Clean state machine: connecting → connected
    → disconnecting → disconnected.
  - src/lib/ws-manager.ts:42 — Reconnection uses exponential backoff matching the
    pattern in src/jobs/retry-utils.ts (shared constant MAX_BACKOFF_MS).
  - src/lib/ws-manager.ts:67 — Error handling: connection failures emit 'error'
    event with typed WsError, timeout after 30s, cleanup on dispose().
  - test/lib/ws-manager.test.ts — 8 tests: connect, disconnect, reconnect on
    drop, heartbeat timeout triggers reconnect, max retries exhausted, dispose
    cancels pending reconnect, concurrent connect calls deduplicated, error
    event payload shape.

Assessment: ✅ Approved
Strengths: Follows existing patterns (EventEmitter, backoff constants). Good
  decomposition. Tests cover happy path, failure paths, and concurrent edge case.
  No new patterns introduced — reuses retry-utils.
```

### Example 2: FAIL

```
Batch: Added API rate limiter middleware.

Diff review observations:
  - src/middleware/rate-limit.ts — 180 lines in a single function. Implements
    its own in-memory token bucket instead of using the existing Redis cache
    from src/lib/cache.ts.
  - src/middleware/rate-limit.ts:45 — Stores state in module-level Map (won't
    work with multiple server instances, existing infra uses Redis for this).
  - src/middleware/rate-limit.ts:112 — Catches all errors with empty catch block,
    silently allows requests through on any failure.
  - test/middleware/rate-limit.test.ts — 2 tests: "allows requests under limit"
    and "blocks requests over limit". No tests for: concurrent requests, cache
    failure fallback, distributed behavior, TTL expiry cleanup.

Assessment: ❌ Changes Required
Issues:
  - CRITICAL: src/middleware/rate-limit.ts:45 — In-memory state breaks in
    multi-instance deployment. Use existing Redis cache (src/lib/cache.ts).
  - CRITICAL: src/middleware/rate-limit.ts:112 — Empty catch block silently
    disables rate limiting on any error. Log and decide: fail-open or fail-closed.
  - IMPORTANT: src/middleware/rate-limit.ts — 180-line function needs decomposition.
    Extract token bucket logic into src/lib/rate-limiter.ts.
  - IMPORTANT: test/middleware/rate-limit.test.ts — Tests only cover happy path
    (★ quality). Need: concurrent requests, cache failure, TTL cleanup.
```

### Example 3: BORDERLINE -> FAIL

```
Batch: Added CSV export for admin dashboard.

Diff review observations:
  - src/routes/admin/export.ts — Clean route handler, 45 lines. Uses streaming
    response correctly. Follows existing admin route patterns.
  - src/lib/csv-builder.ts — New utility, well-structured, handles escaping.
  - test/routes/admin/export.test.ts — 4 tests: exports users, exports with
    filters, empty result set, correct CSV headers.
  - Missing: no test for special characters in data (commas, quotes, newlines
    in user names), no test for large dataset streaming behavior, no test for
    unauthorized access (admin-only endpoint).

Assessment: ❌ Changes Required
Issues:
  - IMPORTANT: test/routes/admin/export.test.ts — Tests cover happy path well
    but miss critical edge cases. CSV with commas/quotes in data fields is a
    known failure mode. Add: special character escaping test, auth enforcement
    test (non-admin gets 403).

Note: The code itself is clean and well-patterned. This is a borderline case
  where the implementation quality is good but test coverage only validates
  the happy path. The missing tests are straightforward to add (<15 min),
  so requesting them is reasonable.
```

---

**After reviewer responds:**
- ✅ Approved → mark batch complete, proceed to next batch
- ❌ Changes Required → dispatch fix subagent with specific issue list, re-dispatch code quality reviewer
- If loop exceeds 3 iterations → surface to human for guidance
