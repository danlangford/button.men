# Proposal

## Why

The current flat game-state view presents dice as uniform cards, so it does not evoke a physical Button Men play area or communicate meaningful differences between dice at a glance. A richer spatial 2D presentation will make the game more engaging and give attack replays a clear visual relationship between attacking and targeted dice.

## What Changes

- Replace the flat card-grid presentation with a spatial 2D play area that keeps the two players' dice in opposing regions.
- Give each die a recognizable 2D shape and scale that reflects its current number of sides while preserving its value, recipe, skills, and statuses.
- Draw explicit directional connections from attacking dice to their targets during attack replay steps.
- Preserve the existing player-orientation, replay, accessibility, and responsive-layout behavior in the new 2D presentation.
- Keep the existing 3D presentation available; replacing it is outside this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-view`: Replace the flat presentation with a richer spatial 2D representation of differently sized dice and direct attack-to-target connections.

## Suggestions

- Consider SVG or canvas for the 2D play area.

## Impact

- Affects the game-view presentation and its browser-level behavior and accessibility tests.
- Uses the die size and replay-role data already returned or derived for the current game view; no ButtonWeavers API or game-rule changes are expected.
- Does not add move submission or a full 3D environment.
