# Proposal

## Why

Players want to see and edit their own profile and preferences, and to look at other players' profiles. Buttonweavers already stores this data and exposes it through its API (`loadProfileInfo`, `loadPlayerInfo`, `savePlayerInfo`); button.men should offer a modern, mobile-friendly screen for it and make every username a way into it.

## What Changes

- A new profile screen showing any player's profile, reachable by username.
- For the logged-in player's own profile, the same screen shows their preferences and lets them edit the ones buttonweavers allows editing.
- Usernames shown in the forum, in games and on other screens link to that player's profile.
- The profile screen has a stable, shareable address per player.
- The site navigation gains a link to the logged-in player's own profile and preferences.

## Capabilities

### New Capabilities
- `player-profile`: viewing player profiles, viewing and editing one's own preferences, and linking to profiles from usernames

### Modified Capabilities
<!-- none: username links and the navigation link are part of the new capability, following the forum and game-search precedent -->

## Suggestions

- Buttonweavers uses two separate pages, Profile and Preferences. This could be one screen with the profile on top and, for the owner, an "Edit preferences" mode or a tabbed section, or it could stay two pages as on buttonweavers. Either satisfies the requirements; the implementer chooses and records the reasoning in `design.md`.
- Buttonweavers' own `Profile.js`, `UserPrefs.js` and `Env.buildProfileLink` (`profile.html?player=<name>`) are the fallback for layout and navigation, but the design is free to depart from them.

## Out of scope

- Creating or storing profile or preference data that buttonweavers does not already use.

## Questions for the dev

- Should the profile show the player's recent games or statistics if `loadProfileInfo` returns them, or only profile fields?
- Password and email changes are accepted by `savePlayerInfo` (`current_password`, `new_password`, `new_email`). Are these in scope for the edit form, or should they stay on buttonweavers? The spec delta currently includes them as editable.
- Should anonymous visitors be able to view profiles? Buttonweavers' profile page requires login; the draft follows that.

## Impact

- New UI screen and API-proxy calls to `loadProfileInfo`, `loadPlayerInfo` and `savePlayerInfo`.
- Username rendering across existing screens (forum, games, search) becomes a link.
- `public/index.html` navigation gains a profile link.
- No changes to game logic or the proxy's pass-through behavior; buttonweavers remains the source of truth for all profile and preference data.
