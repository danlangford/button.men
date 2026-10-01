# Proposal

## Why

The existing `web-ui` spec already requires pages to work on phones without horizontal scrolling, but its single 375-pixel scenario does not specifically check the signed-in navigation or verify the rendered layout. The current navigation can overflow on an iPhone-sized viewport, hiding theme and account controls off to the side; the requirement needs concrete coverage so the implementation can be fixed and kept fixed as destinations grow.

## What Changes

- Clarify the existing mobile-layout requirement with scenarios for narrow page content and the full signed-in navigation at phone widths.
- Require current navigation destinations and account controls to remain reachable without page-level horizontal scrolling, while leaving the responsive navigation pattern to implementation.
- Suggest browser-based viewport checks in CI; consider Lighthouse as a supplemental audit rather than relying on its aggregate score to detect horizontal overflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-ui`: make the existing no-horizontal-scrolling requirement explicitly cover narrow viewports and signed-in navigation.

## Impact

The player-facing layout and navigation in `public/index.html`, responsive styling, and web UI validation may be affected. No API or game behavior changes are proposed. The viewport metadata is already present; this change is about the rendered layout and specific acceptance coverage.

## Suggestions

- Keep the navigation implementation responsive as destinations are added. Reuse the existing Bootstrap styling where practical; any compact or grouped mobile navigation should keep its controls reachable by touch and keyboard.
- Verify actual rendered widths in a browser at 320, 375, 393 (iPhone 15 CSS width), and 430 CSS pixels, including the signed-in navigation and long player names. A targeted `scrollWidth` versus `clientWidth` assertion is a more direct regression check for horizontal page overflow than a Lighthouse score.
- Evaluate a small headless-browser check in the existing CI workflow. Lighthouse CI may be useful as a supplemental accessibility/performance audit, but weigh browser setup and runtime against the project's currently Node-only tests; do not make a Lighthouse score the sole acceptance test.
