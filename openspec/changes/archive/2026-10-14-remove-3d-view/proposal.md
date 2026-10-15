# Proposal

## Why

The game view currently has two presentations: a 3D dice scene (the default) and the spatial 2D board, with a toggle between them. The 2D board now carries everything the game view needs, so the 3D scene duplicates it and adds a large external library, zoom controls, a separate player HUD and a second set of tests to maintain. Issue #48 asks to remove the 3D view, show the 2D view by default and remove the dead code.

## What Changes

- Remove the 3D presentation, its zoom controls and HUD, and the control for switching between presentations.
- The spatial 2D presentation is the only game view presentation, and it is shown when a game opens.
- Attack-step requirements apply to the spatial 2D presentation only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-view`: The spatial 2D presentation becomes the only dice presentation; the 3D presentation and the switching control are removed.

## Impact

- `public/js/game-view.js`, `public/js/dice-scene.js` (removed), game-view CSS in `public/index.html`.
- Unit and browser tests for the game view.
- The page no longer loads three.js from jsDelivr.
