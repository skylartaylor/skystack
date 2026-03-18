# Tester Reference

QA methodology, issue taxonomy, and testing patterns. Updated by `/research`.

## Issue Severity Levels

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | Blocks a core workflow, causes data loss, or crashes the app | Form submit causes error page, checkout flow broken, data deleted without confirmation |
| **High** | Major feature broken or unusable, no workaround | Search returns wrong results, file upload silently fails, auth redirect loop |
| **Medium** | Feature works but with noticeable problems, workaround exists | Slow page load (>5s), form validation missing but submit still works, layout broken on mobile only |
| **Low** | Minor cosmetic or polish issue | Typo in footer, 1px alignment issue, hover state inconsistent |

## Issue Categories

### Visual/UI
- Layout breaks (overlapping elements, clipped text, horizontal scrollbar)
- Broken or missing images
- Incorrect z-index (elements appearing behind others)
- Font/color inconsistencies
- Animation glitches (jank, incomplete transitions)
- Alignment issues (off-grid, uneven spacing)
- Dark mode / theme issues

### Functional
- Broken links (404, wrong destination)
- Dead buttons (click does nothing)
- Form validation (missing, wrong, bypassed)
- Incorrect redirects
- State not persisting (data lost on refresh, back button)
- Race conditions (double-submit, stale data)
- Search returning wrong or no results

### UX
- Confusing navigation (no breadcrumbs, dead ends)
- Missing loading indicators (user doesn't know something is happening)
- Slow interactions (>500ms with no feedback)
- Unclear error messages ("Something went wrong" with no detail)
- No confirmation before destructive actions
- Inconsistent interaction patterns across pages
- Dead ends (no way back, no next action)

### Content
- Typos and grammar errors
- Outdated or incorrect text
- Placeholder / lorem ipsum text left in
- Truncated text (cut off without ellipsis or "more")
- Wrong labels on buttons or form fields
- Missing or unhelpful empty states

### Performance
- Slow page loads (>3 seconds)
- Janky scrolling (dropped frames)
- Layout shifts (content jumping after load)
- Excessive network requests (>50 on a single page)
- Large unoptimized images
- Blocking JavaScript (page unresponsive during load)

### Console/Errors
- JavaScript exceptions (uncaught errors)
- Failed network requests (4xx, 5xx)
- Deprecation warnings (upcoming breakage)
- CORS errors
- Mixed content warnings (HTTP resources on HTTPS)
- CSP violations

### Accessibility
- Missing alt text on images
- Unlabeled form inputs
- Keyboard navigation broken (can't tab to elements)
- Focus traps (can't escape a modal or dropdown)
- Missing or incorrect ARIA attributes
- Insufficient color contrast
- Content not reachable by screen reader

## Per-Page Exploration Checklist

For each page visited during a QA session:

1. **Visual scan** — Take annotated screenshot. Look for layout issues, broken images, alignment.
2. **Interactive elements** — Click every button, link, and control. Does each do what it says?
3. **Forms** — Fill and submit. Test empty submission, invalid data, edge cases (long text, special characters).
4. **Navigation** — Check all paths in/out. Breadcrumbs, back button, deep links, mobile menu.
5. **States** — Check empty state, loading state, error state, full/overflow state.
6. **Console** — Check for JS errors or failed requests after interactions.
7. **Responsiveness** — If relevant, check mobile and tablet viewports.
8. **Auth boundaries** — What happens when logged out? Different user roles?

## Mobile-Specific Testing
- Touch targets (44pt iOS / 48dp Android minimum)
- Orientation changes
- Keyboard behavior (does it dismiss properly? does it obscure inputs?)
- Offline/slow connection behavior
- Back button / swipe-to-go-back
- Safe area / notch handling

## Form Testing Patterns
- Empty submission
- Invalid input (wrong type, too long, special characters)
- Validation timing (on blur? on submit? real-time?)
- Error message clarity and positioning
- Autofill behavior
- Password manager compatibility

## State Testing
- Empty state (zero data)
- Loading state
- Error state (API failure, network timeout)
- Overflow (very long text, many items)
- Edge quantities (0, 1, boundary, many)

## Accessibility Testing
- Screen reader navigation (VoiceOver on iOS, TalkBack on Android)
- Focus order matches visual order
- All interactive elements reachable via keyboard/switch control
- Dynamic content changes announced to assistive technology
- Color contrast verification

## Framework-Specific Testing
- Flutter: golden tests, integration tests, widget tests
- SwiftUI: XCTest, UI testing, accessibility audits in Xcode
- React: React Testing Library, Playwright/Cypress for E2E
- Rails: system tests, request specs, Capybara
