# Design

## Context

The site is a browser-only front end that routes views through the URL hash and
delegates game state to Buttonweavers' `loadGameData` API. The API returns
player data, dice, action logs, chat logs, scores, and the active-player
indices in one response. Its `BMInterface::load_api_game_data` implementation
also applies the upstream chat-privacy rules before returning `gameChatLog`.

## Goals / Non-Goals

**Goals:**

- Add a focused game view using the existing API proxy and hash-routing style.
- Render upstream game data without reproducing game rules locally.
- Keep the view usable with keyboard controls and at 320px-wide mobile layouts.

**Non-Goals:**

- Move selection, move submission, chat posting, or game-state mutation.
- A new rendering dependency, persistent client-side game cache, or WebGL.

## Decisions

- **Use a `#game?gameId=...` route and a dedicated `game-view.js` module.**
  This follows the existing `#search` query convention while keeping rendering
  and data normalization out of the application bootstrap.
- **Call `loadGameData` with the numeric game id and render the upstream
  `playerDataArray`, `gameActionLog`, and `gameChatLog` fields.** Buttonweavers
  remains authoritative for game rules and privacy; the upstream source is
  `BMInterface::load_api_game_data`, especially its player and log assembly.
- **Use semantic Bootstrap cards and CSS grid/flex layout rather than a 3D
  library.** This adopts the proposal's lightweight pseudo-3D suggestion,
  avoids a dependency and bundle cost, and leaves each die as a distinct
  element that can later receive selection/targeting states.
- **Normalize log entries at the rendering boundary.** Upstream action and chat
  entries have different field names and may be absent, so the view converts
  them to `{type, timestamp, player, text}` and sorts chronologically. The
  default filter is chat-only; private-chat visibility is determined from the
  API's participant data and current player index.
- **Open the fallback action URL with `target="_blank"` and
  `rel="noopener"`.** This preserves the game view while safely handing moves
  to Buttonweavers.

## Risks / Trade-offs

- **[Risk] Upstream response fields evolve.** → Rendering uses safe fallbacks
  and ignores unknown fields rather than assuming optional arrays exist.
- **[Risk] Private logs could be exposed by client-side mistakes.** → The
  view hides chat when the API marks either participant's chat private and the
  viewer is not a participant; it never attempts to reconstruct hidden data.
- **[Risk] Dense dice and logs can overflow narrow screens.** → Cards use
  wrapping grid/flex layouts, `min-width: 0`, and bounded text wrapping.

## Migration Plan

No migration is required. Deploy the static files together; users without a
`gameId` continue to land on the games view. Rollback is a static asset
rollback.
