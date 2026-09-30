# Design

## Context

See [proposal.md](proposal.md) for motivation and [spec.md](specs/game-search/spec.md) for requirements. The existing client is a small vanilla-JavaScript application that relays authenticated JSON API calls through the worker proxy (`public/js/api.js` → `src/proxy.js` → buttonweavers). Games and forum views already follow the pattern of a hash-routed view (`#games`, `#!...`) rendered by a module of pure, testable render functions (`public/js/games.js`, `public/js/forum.js`), wired together in `public/js/app.js`.

The upstream contract is `searchGameHistory` in `/tmp/buttonmen/src/api/ApiSpec.php` (mandatory `sortColumn`, `sortDirection`, `numberOfResults`, `page`; optional filters `gameId`, `playerNameA/B`, `buttonNameA/B`, `gameStartMin/Max`, `lastMoveMin/Max`, `winningPlayer`, `status`) and `BMInterfaceHistory::search_game_history`, which returns `{ games: [...], summary: {...} }`. Each game row has `gameId`, `playerNameA/B`, `buttonNameA/B`, `waitingOnA/B`, `gameStart`, `lastMove`, `roundsWonA/B`, `roundsDrawn`, `targetWins`, `status` — there is no `winningPlayer` field on a row; it is only a valid `sortColumn` (upstream computes a sortable rank from the rounds/target fields, `BMInterfaceHistory::apply_order_by`). `numberOfResults` is capped upstream at 1000; `page` is 1-indexed.

## Goals / Non-Goals

**Goals:**
- Filter, sort, and page `searchGameHistory` through the existing proxy, with results linking to buttonweavers.
- A bookmarkable/shareable search state (filters, sort, page) carried in the URL hash, matching the existing `#games` / `#!` hash-routing convention.
- A date-range control for `gameStart`/`lastMove` that is comfortable to use with touch or mouse, without adding a run-time dependency.

**Non-Goals:**
- Rendering, indexing, or caching games locally (see spec's "No local search index").
- Showing or paginating the `summary` block beyond using its `matchesFound` count to know whether a next page exists.

## Decisions

- **Hash-routed view, human-readable query.** Add a third route, `#search?...`, alongside `#games` and `#!...`. Store filters as their literal form (e.g. `gameStartFrom=2026-01-01`) rather than pre-converted to a buttonweavers-style unix timestamp, so the hash stays human-readable and round-trips cleanly into the date inputs when the view re-renders (back/forward, reload, or a shared link). Conversion to `gameStartMin`/`gameStartMax` timestamps happens only when building the API call.
- **Native `<input type="date">` × 2 for each range, no date-picker library.** This was raised as an option in review ("select a small util type library... or implement it itself"); native date inputs were chosen over a library because they already meet the "clean, friendly, modern" bar on both desktop and mobile (every major mobile browser renders its own touch-friendly picker UI for `type="date"`), need no extra dependency or bundling step for this static site, and avoid a11y/i18n work a library would otherwise need. If the native control later proves inadequate (e.g., a range slider is wanted), swapping in a small library is a contained change to one render function.
- **Only search when the player submits.** The view renders an empty form with no API call when its query string is empty (matches the spec's "No filters given" scenario); submitting the form — even with every field left blank — always includes `sortColumn`/`sortDirection`/`page`/`numberOfResults`, so it is never an empty query string and always triggers a search.
- **Winner is computed client-side for display**, from `roundsWonA`/`roundsWonB`/`targetWins`/`status` (`COMPLETE` and `roundsWonX >= targetWins` ⇒ that player; otherwise not yet decided), since the row has no `winningPlayer` field. Sorting by winner still delegates entirely to the upstream `sortColumn=winningPlayer` ranking — button.men does not re-sort results itself.
- **Login gate reuses the existing router guard.** `app.js` already only acts on a hash change when a player is signed in, and shows the login view otherwise; the search route is wired into that same guard rather than adding a separate check, so an anonymous visit to `#search` behaves like an anonymous visit to `#games` or `#!` today (send them to log in first).
- **Page size fixed at 20.** Comfortably under the upstream cap of 1000, big enough to page meaningfully. Not user-configurable, to keep the filter form simple; can be revisited if requested.

## Risks / Trade-offs

- [Two-request UNION query upstream can be slow for very broad filters] → Out of button.men's control; page size of 20 limits how much of any single response the client needs to render.
- [Storing filters as date strings in the hash means the client — not upstream — decides day boundaries] → Use UTC day boundaries consistently (`00:00:00` / `23:59:59`) so results are deterministic regardless of the player's local timezone.

## Migration Plan

No data migration or new configuration. Deploy the static client and worker together; the proxy and API contract are unchanged. Rollback by reverting the client changes.
