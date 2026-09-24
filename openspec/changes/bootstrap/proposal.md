# Proposal

## Why

Button Men Online is hard to use on phones, has no dark mode, and changes slowly upstream. button.men is an alternate front end that players can use today, talking to the existing buttonweavers API. A working site with real players is also the best argument for proper upstream API access later.

## What Changes

- Host the site at button.men, for free.
- Relay API calls to buttonweavers without storing anyone's credentials.
- A mobile-first, dark-mode web UI, starting with logging in, the game list and the game page.
- Move ButtonFilter here from buttonmen-tools.

## Capabilities

### New Capabilities
- `hosting`: where and how the site runs, including cost
- `api-proxy`: relaying players' API calls to buttonweavers, and what it must never do
- `web-ui`: the player-facing site
- `button-filter`: searching and filtering the button list

### Modified Capabilities

## Impact

New repo; nothing upstream changes. Players log in with their buttonweavers accounts.
