# Proposal

## Why

Players want to find games beyond the short list of their own active games: a specific game by ID, another player's games, or games with a given button. Buttonweavers already exposes this through its `searchGameHistory` API; button.men should offer a modern, mobile-friendly way to use it.

## What Changes

- A new game search screen, reachable from the site navigation, where players can filter and sort games using the fields buttonweavers' `searchGameHistory` API supports (player, button, status, winner, date ranges, game ID) and page through results.
- Game-started and last-move filters use date-range pickers, not typed dates.
- Search results are sortable by column and link out to the matching game on buttonweavers.com; button.men does not render or play the game itself.
- Like buttonweavers' own history search, game search requires a logged-in player; anonymous visitors are sent to log in first.
- The site navigation gains a link to the search screen alongside the existing Games and Forum links.

## Capabilities

### New Capabilities
- `game-search`: searching game history via buttonweavers' API and linking out to matching games

### Modified Capabilities
<!-- none: the navigation link is part of the new game-search capability, following the forum precedent -->


## Impact

- New UI screen and its API-proxy calls to `searchGameHistory`.
- `public/index.html` navigation gains a search link.
- No changes to game logic or the proxy's pass-through behavior; buttonweavers remains the source of truth for search results and for playing games.
