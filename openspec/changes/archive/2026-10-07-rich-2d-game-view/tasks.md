# Tasks

## 1. Spatial 2D Board

- [x] 1.1 Add a dependency-free SVG dice-board renderer with deterministic opposing regions, side-count silhouettes and scales, visible value/recipe labels, captured-dice groups, and complete accessible labels; verify focused tests cover common, equal, unusual, and unresolved side counts plus assistive information.
- [x] 1.2 Replace the flat card-grid renderer with the SVG board while keeping 3D initial and preserving presentation toggle, player orientation, current/replay state, and captured-dice behavior; verify browser tests exercise switching, flipping, and replay results.

## 2. Attack Relationships and Responsive Layout

- [x] 2.1 Render labeled, marker-ended attack connectors from every attacking die to every targeted die behind the 2D dice; verify browser tests cover single- and multi-die attacks and non-colour attacker/target cues.
- [x] 2.2 Make the SVG board fit supported phone and desktop viewports without page-level overflow or clipped dice; verify browser tests assert both player regions and all dice remain inside the board at 375 CSS pixels.

## 3. Integration Verification

- [x] 3.1 Run `openspec validate --all --strict`, `npm run lint`, `npm test`, and the game-view browser tests, fixing any regressions before marking the change complete.
