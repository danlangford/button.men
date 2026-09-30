# Tasks

## 1. Search API

- [x] 1.1 Add a `searchGameHistory` API wrapper that sends the mandatory sort/page fields plus any given filters, throws on a failed response, and returns `{ games, summary }`; verify arguments and failed responses with API unit tests.

## 2. Search filters and navigation

- [x] 2.1 Add a signed-in "Search" nav link and a search view with a filter form (game ID, either player's name/button, status, winner) that shows no results until submitted; verify the link, the empty-query no-search behavior, and filter values reaching the API call in web UI tests.
- [x] 2.2 Add game-started and last-move date-range filters using native date inputs, converting the picked dates to UTC day-boundary timestamps only when building the API call; verify the conversion and that round-tripping through the URL preserves the picked dates in web UI tests.

## 3. Sortable, paged results

- [x] 3.1 Render results in a table with clickable, sortable column headers (toggling ascending/descending) and next/previous paging, each reflected in the URL; verify sort-toggle and paging links in web UI tests.
- [x] 3.2 Link each result to its game on buttonweavers and compute a display-only winner label from rounds/target fields; verify the link URL and winner label in web UI tests.
- [x] 3.3 Validate the integrated change with `npm test` and `openspec validate --all --strict`.
