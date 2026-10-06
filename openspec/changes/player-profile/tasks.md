# Tasks

## 1. Profile data and API

- [x] 1.1 Add profile, own-preference and save API functions; add recent-game history loading and verify request arguments, successful responses and upstream errors with unit tests.

## 2. Profile screen

- [x] 2.1 Render public profile fields, profile image, statistics and recent games; verify missing-player, no-games, safe text rendering and profile/game links with renderer tests.
- [x] 2.2 Display editable preferences only for the signed-in player; verify preference fields are private to the owner and all specified settings render with focused tests.
- [ ] 2.3 Save preferences by merging form entries into the loaded record, support password/email changes, and surface API messages; verify untouched fields, rejected values and account-change requests with tests.

## 3. Navigation and usernames

- [x] 3.1 Add the shareable profile route, login redirect behavior and own-profile navigation; verify direct routing, own-profile shortcut and signed-out navigation in tests.
- [ ] 3.2 Link usernames in forum, game views, active games and game search; verify profile URLs and valid link structure with renderer tests.

## 4. Integration

- [ ] 4.1 Verify the narrow-screen profile layout and run the full project test, lint, build, and strict OpenSpec validation commands.

## Workflow follow-up

- Archive the completed change and verify its archived status after implementation validation.
