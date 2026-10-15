# Design

## Context

`game-view.js` built two presentations for every render: the spatial 2D board (`dice-board.js`, an SVG) and a 3D scene (`dice-scene.js`, three.js loaded from jsDelivr) wrapped in a play area with zoom controls and two HUD cards. The 3D scene was shown first and a button swapped between them. The 2D board already shows each player card (name, button, score, badges) above and below the SVG, and each die's value, recipe, skills, statuses and replay role.

## Goals / Non-Goals

**Goals:** one presentation, shown by default; delete code, CSS and tests that only existed for 3D.

**Non-Goals:** visual changes to the 2D board itself.

## Decisions

- **Delete `dice-scene.js` outright** rather than leaving it unreferenced. Nothing else imports it, and it was the only user of three.js.
- **Drop the HUD cards.** They were the 3D view's substitute for the 2D board's player cards. They showed two things the player cards did not: the button's skills, which the "Player and button details" requirement needs, and dice out of play (for example an attacker removed by a Boom attack, `BMSkillBoom.php`, which buttonweavers lists as "Dice out of play" in `src/ui/js/Game.js`). The 2D player card now shows a `Skills: …` line and a `Dice out of play: …` line when there are any.
- **Remove the `game-play-area` / `game-3d-*` / `game-hud-*` CSS** and the media queries that only laid out the 3D area. The `game-board` and `game-spatial-*` rules are unchanged.
- **Simplify orientation state.** With no scene to notify, `bottomPlayerIndex`, `setDiceOrientation`, `setDiceZoom`, `disposeDiceScene` and the scene generation counter go; flipping only toggles `flipped` and re-renders the board.

## Risks / Trade-offs

- Players who liked the 3D scene lose it. Accepted by the issue author.
