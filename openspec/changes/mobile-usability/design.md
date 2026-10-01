# Design

## Context

See [proposal.md](proposal.md) and [specs/web-ui/spec.md](specs/web-ui/spec.md). `public/index.html` already declares a device-width viewport and uses Bootstrap 5 CSS, but the navigation's inner flex row does not wrap. The project has Node's built-in test runner and no browser-test dependency; Chromium is available in the implementation environment.

## Goals / Non-Goals

**Goals:**
- Let the existing navigation wrap and stack cleanly on narrow screens without hiding or changing its destinations or account controls.
- Protect dynamic player names and existing page content from causing page-level horizontal overflow.
- Verify the actual rendered page at the specified viewport widths.

**Non-Goals:**
- Add a JavaScript navigation drawer, framework, or runtime dependency.
- Add Lighthouse or a browser automation dependency to CI for this focused layout correction.
- Change the existing navigation routes or game/forum/search behavior.

## Decisions

- **Use responsive CSS with wrapping rather than a collapsed menu.** The existing Bootstrap 5 stylesheet is already in use, and keeping controls visible avoids requiring Bootstrap's JavaScript or a new toggle interaction. At phone widths the brand and controls occupy separate rows; controls wrap within the viewport. Desktop layout remains unchanged.
- **Constrain dynamic text and content with wrapping, not clipping.** Allow player names and long content to break rather than hiding overflow or shrinking the page. The search results' existing `.table-responsive` keeps wide tabular data locally scrollable rather than making the whole page scroll horizontally.
- **Use the existing Node test suite for regression checks and Chromium for rendered viewport verification.** Test the viewport metadata and responsive navigation hooks without adding a browser dependency to CI. During implementation, use Chromium at 320, 375, 393, and 430 CSS pixels to compare page `scrollWidth` with `clientWidth` and verify each signed-in control remains in the viewport; repeat with a long player name.
- **Suggestions — adopted:** Keep the current Bootstrap-based navigation destinations and ensure all controls remain keyboard/touch reachable.
- **Suggestions — adopted:** Check actual widths at 320, 375, 393, and 430 CSS pixels, including long player names; page-level overflow is verified by comparing document scroll and client widths.
- **Suggestions — adapted:** Use Chromium for implementation-time rendered checks, but do not add a headless-browser CI dependency in this small project with Node-only tests. The Node regression checks guard the responsive markup; consider browser automation if the app's UI/testing needs grow.
- **Suggestions — rejected:** Do not add Lighthouse CI now. It adds browser setup and is not a direct assertion for the no-horizontal-scroll requirement; it can be reconsidered as a broader accessibility/performance audit.

## Risks / Trade-offs

- [Long or unusually wide text can still stress individual components] → Allow wrapping and verify a long player name at the narrowest viewport; keep the search table's overflow scoped to its existing responsive wrapper.
- [No rendered-browser check runs in CI] → Keep a focused regression test in the existing test suite and document the manual viewport checks; revisit browser automation if responsive regressions recur.

## Migration Plan

No data or API migration is required. Deploy the static UI with the existing worker deployment. Roll back by reverting the navigation and responsive-style changes.
