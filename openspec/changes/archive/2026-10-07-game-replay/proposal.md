# Proposal

## Why

A player returning to a game, or a spectator opening one, sees only the current state, which is the position after the latest re-roll. To understand what just happened they must read the action log and imagine the board. Stepping back and forward through recent moves, with each attack shown on the board, lets players catch up quickly and lets them share a link to a specific moment.

## What Changes

- Add a replay mode to the existing game view that steps backward and forward through the game's logged moves.
- Show each attack on the board: the attacking dice and the targeted dice are clearly designated, and the attack type is stated.
- Show the dice after each attack (new rolls, captured dice gone) as its own step, so the sequence reads attack, resulting state, attack, resulting state, and ends at the current game state.
- Work in both the 3D and flat 2D dice presentations.
- Allow a link to a specific step in a game's history.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-view`: adds a game-history replay requirement set to the game view.

## Impact

Affects the game view UI and how it uses the game's action log. No API or game-rule changes. Out of scope: storing or re-encoding games, and playing out moves from a past position (playing from the replay comes later). Replay is read-only.

## Suggestions

- Keep replay inside the game screen rather than a separate replay UI, as the idea requests.
- Treat each attack and each resulting state as separate steps (attack, then new values), since the live state is always post-re-roll. Consider merging them if the result reads clearer.
- Deep link using the action log entry's timestamp or position, e.g. a hash query like `#game?gameId=5&step=12`, following the existing `?`-style hash convention.
- Highlight attackers, outline or enlarge them, move them toward the opponent, and draw arrows or lines to targets; pick whatever is loudest and clearest in both 2D and 3D.
- Upstream buttonweavers' action log (`gameActionLog` in `src/api/ApiSpec.php`, `src/engine/BMInterfaceGame*.php`) records attack messages with die descriptions; check whether it has enough detail to reconstruct dice values at each step, and if not whether the game's previous-state data can be used. This is a design question for implementation, not a requirement.
- Questions for the dev: should replay cover the whole game or only the current round? Should steps skip non-attack entries such as chat, passes or option choices? Should the 3D/2D choice already exist in the game view, or is it part of this change?
