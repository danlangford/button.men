# Design

## Context

See `proposal.md` for motivation. The current backup presentation is assembled by `renderFlatField` in `public/js/game-view.js` from HTML cards, while replay reconstruction annotates dice with `replayRole`. The default Three.js presentation in `public/js/dice-scene.js` is independent and must remain the initial view.

The ButtonWeavers response already supplies each active die's `sides`, `recipe`, value, skills, and properties. Upstream `/tmp/buttonmen/src/ui/js/Game.js` uses those same fields in `Game.dieTableEntry` and maps `die.sides` to recognizable die-art buckets in `Game.backgroundImagePath`; no new API data or game-rule inference is needed.

## Goals / Non-Goals

**Goals:**

- Keep 2D rendering deterministic from the current or replayed player state.
- Give each rendered die a stable accessible identity and a shape derived from its current side count.
- Make attack relationships explicit by connecting the rendered attacker and target elements.
- Keep presentation-specific rendering separate from game loading and replay reconstruction.

**Non-Goals:**

- Changing the default from 3D to 2D.
- Changing the 3D renderer, ButtonWeavers API, or replay reconstruction.
- Simulating physically accurate polyhedra or adding drag, animation, or move submission.

## Decisions

### Render the 2D play area as inline SVG

Adopt the proposal's SVG-or-canvas suggestion as **SVG**. A dedicated `public/js/dice-board.js` module will render one responsive SVG with opposing player regions, active and captured groups, dice, and attack connectors. SVG provides responsive geometry, marker-ended connectors, and individually addressable elements with accessible labels without adding a dependency. Canvas was rejected because it would require a parallel accessibility tree and pixel-oriented browser tests. Reusing styled HTML cards was rejected because clipping them into silhouettes would not provide a coherent coordinate system for connectors.

### Use deterministic slots and side-count geometry

The renderer will place each player's active dice into evenly spaced slots in the upper or lower region. Common current side counts map to stable silhouettes and modest relative scales: d4 triangle, d6 square, d8 diamond, d10 pentagon, d12 hexagon, d20 decagon, with d2 and d30 covered by dedicated low/high-complexity silhouettes. Other or unresolved sizes use a circular fallback. Visible value and recipe text remain inside or adjacent to the silhouette, while a complete accessible label carries owner, value, recipe, skills, statuses, activity/capture state, and replay role.

This is a visual vocabulary, not a physical projection. Exact polyhedral faces were rejected because a 2D projection becomes unreadable at phone sizes and would add detail that does not improve side-count recognition.

### Draw connectors from known SVG die centers

Each rendered die receives a stable per-render identifier and center coordinate. On attack steps, the renderer draws marker-ended lines behind the dice for every attacker-to-target pairing, with a visible text label for the attack type. Because dice and connectors share one view box, resizing does not require DOM measurement, observers, or resize listeners. Dashed strokes, arrowheads, and attacker/target labels keep the relationship understandable without colour.

### Keep integration narrow

`game-view.js` will replace only `renderFlatField` with the new renderer and pass it the already-oriented players plus the selected attack step. The existing toggle continues to start in 3D and switches to the new spatial 2D board. Player detail cards outside the 2D board and replay controls remain unchanged.

## Risks / Trade-offs

- [Long recipes or many statuses do not fit inside a die] → Keep the rolled value and compact recipe visible; expose the full details through the accessible label and existing player detail cards.
- [Unusually large armies make fixed slots crowded] → Compute slot size and spacing from the largest active-dice row, enforce a readable minimum view-box width, and let the SVG scale within the existing responsive container.
- [All-to-all connectors can become busy for multi-die attacks] → Draw connectors behind dice with restrained styling; this preserves the requirement that every involved die is connected without inventing pairings absent from replay data.
- [A side count has no recognizable 2D analogue] → Use the documented fallback shape and keep its numeric side count or recipe visible.

## Migration Plan

Ship the new module and replace the flat renderer in one deployment. The unchanged 3D view remains the default and rollback is a direct revert to the existing flat renderer; there is no stored data or API migration.
