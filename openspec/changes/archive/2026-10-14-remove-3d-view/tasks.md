# Tasks

## 1. Remove the 3D presentation

- [x] 1.1 Delete `public/js/dice-scene.js` and the 3D scene, zoom controls, HUD and presentation toggle from `public/js/game-view.js`; show the 2D board by default.
- [x] 1.2 Show button skills on the 2D player cards so player details stay complete without the HUD.
- [x] 1.3 Remove CSS that only styled the 3D play area and HUD.

## 2. Tests

- [x] 2.1 Update unit tests: the 2D board is visible on load, no 3D, zoom or toggle controls exist, and button skills are shown.
- [x] 2.2 Update browser tests to exercise replay, attack connectors, flipping and phone layout without a 3D stub or toggle.

## 3. Verification

- [x] 3.1 Run `openspec validate --all --strict`, `npm run lint`, `npm test` and the browser tests.
