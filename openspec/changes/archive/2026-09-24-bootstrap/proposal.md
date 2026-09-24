# Proposal

## Why

Button Men Online's interface isn't modern, has no dark mode, and changes slowly upstream. button.men is an alternate front end that players can use today, talking to the existing buttonweavers API. A working site with real players is also the best argument for proper upstream API access later.

## What Changes

- Host the site at button.men, for free.
- Relay API calls to buttonweavers without storing anyone's credentials.
- A modern, dark-mode web UI: log in, see your games, and tap a game to play it on buttonweavers.

## Capabilities

### New Capabilities
- `hosting`: where and how the site runs, including cost
- `api-proxy`: relaying players' API calls to buttonweavers, and what it must never do
- `web-ui`: the player-facing site

### Modified Capabilities

## Impact

New repo; nothing upstream changes. Players log in with their buttonweavers accounts.
