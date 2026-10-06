# Design

## Context

button.men is a browser-only client for the buttonweavers API. The existing app uses hash-based navigation, DOM rendering with `textContent`, and a proxy that passes API requests through unchanged. The profile API provides public fields and aggregate win/loss counts; `loadPlayerInfo` provides private preferences only for the signed-in player.

Upstream behavior verified in `/tmp/buttonmen/src/api/ApiSpec.php` (`loadProfileInfo`, `loadPlayerInfo`, `savePlayerInfo` and `searchGameHistory` arguments), `/tmp/buttonmen/src/engine/BMInterfacePlayer.php` (`get_player_info`, `get_profile_info`, `set_player_info`), `/tmp/buttonmen/src/engine/BMInterfaceHistory.php` (`search_game_history`), `/tmp/buttonmen/src/api/ApiResponder.php` (`get_interface_response_savePlayerInfo`), and `/tmp/buttonmen/src/ui/js/Env.js` (`Env.buildProfileLink`). In particular, profile data contains only the email when it is public, while the preferences response contains private email and account settings; saving preferences requires all ordinary profile and preference fields.

## Goals / Non-Goals

**Goals:**
- Fit profile navigation and rendering into the existing single-page app and its hash URLs.
- Keep private preference data confined to the signed-in player's own profile.
- Preserve every unedited preference when using buttonweavers' full-record save API.
- Use the existing history API and game view for recent completed-game links.

**Non-Goals:**
- Store player data, credentials, or profile state in button.men.
- Add a dependency or change the API proxy.

## Decisions

- **One profile screen:** Display public profile information for every requested player and append editable preferences only when the requested player matches the signed-in player. This adopts the proposal's one-page suggestion instead of adding separate profile and preferences routes; the owner gets one destination for both.
- **Hash routes:** Use `#profile?player=<encoded username>` for shareable profiles and `#profile` as the navigation shortcut to the signed-in player's profile. Existing login behavior preserves the requested hash and routes there after login.
- **Own-data access:** Call `loadPlayerInfo` only after identifying the target as the signed-in player. Render only an explicit set of public `loadProfileInfo` fields for any viewer; never render the full preferences object on another player's profile. Create all UI from DOM elements and text, not API-provided HTML.
- **Preference saves:** Build the required `savePlayerInfo` payload from the loaded preference object, replacing only form fields, and include password/email fields only when the player entered them. Leave upstream validation authoritative and show its returned message. Password inputs are cleared after a successful save.
- **Recent games:** Request five `COMPLETE` rows sorted by `lastMove DESC` with `searchGameHistory`; upstream's `search_game_history` checks the player-name filter against both player positions. Link each result to its in-app game view.
- **Username links:** Use one encoded profile URL helper in forum, game, active-game list, and search renderers. Keep links structurally separate when a parent row is already a link.
- **Responsive UI:** Use existing Bootstrap layout classes and allow long profile values and usernames to wrap; no new styling or library is necessary.

## Risks / Trade-offs

- [The save API requires a complete set of preference values] → Load preferences before showing the edit form and merge submitted values over that data; do not send a partial save.
- [The game-history endpoint can fail independently of profile loading] → Keep the profile visible and report recent-game loading failure separately, with a retry action.
- [Gravatar URLs disclose a public email hash to a third party] → Only request the image when the profile indicates gravatar use, and use HTTPS; the API itself exposes the hash on public profile responses.

## Migration Plan

No data or deployment migration is required. Rollback consists of reverting the frontend and navigation changes; player data remains on buttonweavers.
