# Designer Reference

Best practices, patterns, and anti-patterns for design work. Updated by `/research`.

## Visual Hierarchy

- One primary CTA per view. Two primary buttons means no primary button.
- Above-the-fold content must communicate the page's purpose in 3 seconds.
- The squint test: blur your eyes — can you still read the hierarchy? If not, it's not hierarchy, it's decoration.
- White space is a design decision, not leftover space. Intentional breathing room creates grouping and priority.
- Related items sit closer together. Distinct sections sit further apart. Proximity is meaning.
- Visual noise is just competing elements. If everything calls for attention, nothing does.
- Eye flows top-left to bottom-right naturally. Don't fight it without a reason.
- Z-index chaos is a hierarchy problem, not a CSS problem. Fix the structure, not the stacking.

## Typography

- Body text minimum 16px. Captions/labels minimum 12px. Below these, you're asking users to squint.
- Maximum 3 font families per project. Usually 2 is plenty. More than 3 is chaos with a font license.
- Scale follows a ratio — 1.25 (major third) or 1.333 (perfect fourth). Random size jumps break rhythm.
- Line-height: 1.5x for body copy, 1.15–1.25x for headings. Tighter headings, looser body.
- Line length 45–75 characters (66 is ideal). Full-bleed body text is unreadable.
- Never skip heading levels. h1 → h3 without h2 is broken structure, not a style choice.
- Use at least 2 weight contrasts for hierarchy. Regular vs. medium is barely perceptible; regular vs. bold reads.
- `text-wrap: balance` or `text-pretty` on headings to prevent orphans.
- Use curly quotes (`""`), not straight quotes (`""`). Use an ellipsis character (`…`), not three dots (`...`).
- `font-variant-numeric: tabular-nums` on any column of numbers so they don't wiggle.
- Never letter-space lowercase text. Letter-spacing is for all-caps labels only.
- Inter/Roboto/Open Sans/Poppins are fine but flag them — they read as default, not deliberate.
- Blacklisted: Papyrus, Comic Sans, Lobster, Impact, Jokerman. No exceptions.

## Color & Contrast

- WCAG AA minimum: body text 4.5:1, large text (18px+) 3:1, UI components and icons 3:1.
- Palette coherence: 12 or fewer unique non-gray colors. More than that is a palette, it's an accident.
- Semantic colors must be consistent site-wide: success = green, error = red, warning = yellow/amber.
- Never encode information with color alone. Always add a label, icon, or pattern alongside it.
- Red/green combinations affect 8% of men. Always pair with shape or label.
- Neutral palette: pick warm or cool and stay consistent. Mixed neutrals look like a bug.
- Dark mode surfaces use elevation (lighter = closer to user), not just lightness inversion.
- Dark mode text: off-white (~#E0E0E0), not pure white. Pure white on dark vibrates.
- Primary accent in dark mode: desaturate 10–20% from the light-mode version.
- Set `color-scheme: dark` on the `html` element when dark mode is present.

## Spacing & Layout

- Use a spacing scale: 4px or 8px base. Arbitrary values (13px margin, 22px padding) are a smell.
- Nothing floats outside the grid. Alignment inconsistency reads as carelessness.
- Nested radius: inner corner radius = outer radius minus the gap between them. Unrelated radii on nested elements look broken.
- Border-radius hierarchy matters. Not every element should have the same radius. Buttons, cards, and modals should feel related but not identical.
- No full-bleed body text. Set a `max-width` on text containers.
- No horizontal scroll on mobile. Fixed-width containers without `max-width` or breakpoints cause this.
- `env(safe-area-inset-*)` for notch/island devices — ignoring this clips content on iPhones.
- URL reflects state: filters, tabs, and pagination belong in query params, not JS state.
- Use flex/grid for layout, not JS measurements. JS layout is brittle and slow.
- Standard breakpoints: 375 (mobile), 768 (tablet), 1024 (desktop), 1440 (wide).

## Interaction States

- Every interactive element needs hover, focus, and active states. Skipping any one is incomplete.
- `focus-visible` ring is non-negotiable. Never `outline: none` without a custom replacement. This breaks keyboard navigation.
- Active/pressed state should feel physical: a slight color shift or depth reduction.
- Disabled state: reduced opacity + `cursor: not-allowed`. Both. Not just one.
- Loading skeletons should match the real content layout — same proportions, same grid.
- Empty states need warmth: a message, a primary action, and something visual. "No items." is not a design.
- Error messages must say what happened, why, and what to do next. "Something went wrong" is a non-message.
- Success feedback should be immediate: a confirmation animation, color change, or auto-dismiss. Don't make users wonder.
- Touch targets minimum 44px on all interactive elements.
- `cursor: pointer` on every clickable element.

## Responsive Design

- A stacked desktop layout on mobile is not responsive design. It's a desktop layout wearing a mobile costume.
- Touch targets must be 44px minimum on mobile — even if they look fine on desktop.
- No horizontal scroll on any viewport. Test at 375px width.
- Images need responsive handling: `srcset`/`sizes` or CSS containment. Plain `<img>` tags at fixed sizes break layouts.
- No `user-scalable=no` or `maximum-scale=1` in the viewport meta. Pinch-to-zoom is an accessibility feature.
- Forms on mobile: use the right `input type` (email, tel, number) so mobile keyboards match. Don't `autoFocus` on mobile — it pops the keyboard immediately.
- Navigation collapses intentionally. A hamburger menu is fine; a broken nav is not.

## Motion & Animation

- Entering: ease-out (starts fast, decelerates). Exiting: ease-in (starts slow, accelerates). Moving: ease-in-out.
- Duration range: 50–700ms. Under 50ms is imperceptible. Over 700ms feels broken unless it's a page transition.
- Every animation communicates something: state change, spatial relationship, attention. Decoration that doesn't communicate is noise.
- Always respect `prefers-reduced-motion`. Wrap motion in a media query or check the preference in JS.
- Never `transition: all`. List properties explicitly. `transition: all` creates jank when layout changes happen.
- Only animate `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, or `margin` — they trigger layout recalculation.

## Content & Microcopy

- Button labels should say exactly what happens: "Save API Key", not "Submit". "Delete account", not "Confirm".
- Active voice: "Install the CLI", not "The CLI will be installed".
- Loading states use an ellipsis character: "Saving…", not "Saving..." (three periods).
- Destructive actions need a confirmation modal or a short undo window. One tap to delete is one tap too easy.
- Truncation must be handled: `text-overflow: ellipsis`, `line-clamp`, or `overflow-wrap: break-word`. Unconstrained text breaks layouts.
- No lorem ipsum or placeholder copy in production. If the data is missing, that's a bug, not a design state.
- Error messages follow this template: what happened + why + what to do next.
- Empty states follow this template: warm message + primary action + visual element.

## AI Slop Detection

These are the patterns no designer at a respected studio would ship. If you see them, fix them.

- **Purple/violet gradient backgrounds.** Blue-to-purple gradients (`#6366f1` → `#8b5cf6` range) are the SaaS starter default. Pick a real palette.
- **The 3-column feature grid.** Icon-in-colored-circle + bold title + 2-line description, repeated 3 times symmetrically. This is the single most recognizable AI layout pattern. It communicates nothing.
- **Icons in colored circles as decoration.** `border-radius: 50%` + background color wrapping an icon = SaaS template look.
- **Centered everything.** If more than 60% of text containers are `text-align: center`, the layout has no hierarchy — it has a preference.
- **Uniform bubbly border-radius.** Every element — buttons, cards, inputs, modals — with the same large radius (16px+). Radius should have hierarchy.
- **Decorative blobs and wavy dividers.** Floating circles, SVG blobs, wavy section separators. If a section feels empty, it needs better content, not decoration.
- **Emoji as design elements.** Rockets in headings. Emoji bullet points. These are not icons — they are placeholders where real design should be.
- **Colored left border on cards.** `border-left: 3px solid <accent>` is a lazy attempt at visual hierarchy. Use actual hierarchy: size, weight, position.
- **Generic hero copy.** "Welcome to [X]", "Unlock the power of…", "Your all-in-one solution for…", "Revolutionize your workflow." If the copy could describe any product, it describes none.
- **Cookie-cutter section rhythm.** Hero → 3 features → testimonials → pricing → CTA, every section the same height. Real sites breathe unevenly because real content has different weights.

## Accessibility (Cross-Platform)

**iOS (SwiftUI):**
- `.accessibilityLabel()` on all interactive and meaningful visual elements
- `.accessibilityHint()` for non-obvious actions ("Double-tap to delete")
- `.accessibilityValue()` for sliders, toggles, progress indicators
- `.accessibilityAddTraits(.isButton)` / `.isHeader` to convey role
- Group decorative elements with `.accessibilityHidden(true)`

**Android (Compose):**
- `contentDescription` on every `Image`, `Icon`, and interactive element
- `semantics {}` block to add custom roles, states, and actions
- `clearAndSetSemantics {}` to replace merged semantics when needed
- `Modifier.semantics { heading() }` for section headers

**Flutter:**
- `Semantics()` widget wrapping elements that need description
- `tooltip` on `IconButton` — required, not optional
- `semanticLabel` on `Image` and `Icon`
- Use `ExcludeSemantics()` for decorative elements

**Web:**
- Semantic HTML first: `<button>`, `<nav>`, `<main>`, `<section>`, `<article>` over `<div>` soup
- ARIA only when semantic HTML can't express the role — not as a replacement for correct HTML
- Focus management: when modals open, focus moves inside; when they close, focus returns to trigger
- Skip navigation link at top of page for keyboard users
- All form inputs have associated `<label>` (not just placeholder text)

**Universal rules (every platform):**
- Touch/tap targets minimum 44×44pt/dp/px
- Text contrast minimum 4.5:1 (body), 3:1 (large text and UI components)
- Never encode meaning with color alone — pair with shape, label, or pattern
- Test with the platform's native screen reader (VoiceOver, TalkBack, NVDA/JAWS)
- Dynamic text sizing: test at 200% text scale — nothing should clip or overlap
