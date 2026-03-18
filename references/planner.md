# Planner Reference

Product thinking, research methods, and spec writing. Updated by `/research`.

## Challenging the Premise

Before accepting a feature request at face value:
- What's the actual user problem? (Not the stated solution — the underlying need)
- Is there a simpler version that delivers most of the value?
- Is there a slightly harder version that's genuinely better?
- What would a user tell their friend about this feature? If the answer is boring, the feature might be wrong.
- Are we solving a symptom or the root cause?

## Research Methods

### Competitive Research
- Install and use 3-5 competing apps. Screenshots and screen recordings are primary evidence.
- Focus on 2-3 star app store reviews — they contain the most actionable feedback (5-star is too happy, 1-star is too angry)
- Look for what's standard (users will expect it) vs what's clever (worth borrowing) vs what's broken (avoid)

### UX Pattern Research
- Match the chart type to the user's question, not the data shape:
  - "How is this trending?" → line chart / sparkline
  - "How do these compare?" → bar chart
  - "What's the breakdown?" → stacked bar or donut (never pie with >5 slices)
  - "Where am I vs target?" → gauge or progress bar
  - "What's happening now?" → KPI card with sparkline
- Mobile dashboards: KPI cards first, tap to expand detail. Don't dump complex charts on small screens.
- Progressive disclosure: summary first, detail on demand

### User Research (Lightweight)
- Jobs to Be Done: users "hire" products to make progress. What job is this feature hired for?
- Ask "walk me through the last time you..." not "would you use...?" (people can't predict their own behavior)
- 5-8 interviews reaches saturation for most features

## Writing Specs

### What a Good Spec Covers
1. **Problem statement** — specific user pain with evidence
2. **Proposed solution** — what the user sees and does, step by step
3. **Design recommendations** — with rationale from research
4. **Accessibility requirements** — platform-specific checklist
5. **Edge cases** — 0 items, 1 item, 10,000 items, offline, no permission, error states
6. **Non-goals** — what this explicitly doesn't do

### Edge Cases That Always Matter
- Empty state (first use, no data yet)
- Loading state (what does the user see while waiting?)
- Error state (API fails, network drops, permission denied)
- Overflow (text too long, list too big, numbers too large)
- Offline behavior (does it work? degrade? crash?)
- Orientation changes (portrait ↔ landscape)
- Accessibility (screen reader, keyboard-only, high contrast)

### Scope Decisions
- "Nice to have" is a trap. Either it's in scope or it's not. Put deferred ideas in TODOS.md with a priority.
- The best feature is the smallest one that genuinely solves the problem.
- Research should inform simplicity, not complexity.

## Platform-Specific Considerations

### Flutter
- Material Design 3 components for Android, Cupertino for iOS (or adaptive widgets)
- State management: follow whatever the project uses (Provider, Riverpod, Bloc, etc.)
- Chart libraries: fl_chart (lightweight), syncfusion_flutter_charts (full-featured)
- Navigation: GoRouter or Navigator 2.0 — match existing pattern

### SwiftUI
- Native components first. SF Symbols for icons.
- Charts framework (iOS 16+) for data visualization
- NavigationStack for navigation (not NavigationView)
- @Observable (iOS 17+) or ObservableObject — match existing pattern

### React / Next.js
- Server Components where possible (Next.js App Router)
- recharts or nivo for charts, visx for custom visualizations
- Tailwind for styling if the project uses it
- React Hook Form for forms, Zod for validation

### Rails
- Hotwire/Turbo for interactivity (unless the project uses a JS framework)
- Chartkick + Groupdate for charts
- Stimulus for JS behavior
- Strong params, form objects for complex forms
