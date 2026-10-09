# Proposal

## Why

BMAIR, the Button Men AI, now ships each release as a static web page that runs the AI entirely in the visitor's browser. Hosting it on button.men lets players ask the AI for a move, play out a matchup, or test a button against a field without installing anything, and keeps it next to the rest of the site.

## What Changes

- Serve the BMAIR web page at `/bot` on `button.men` and on every pull request preview.
- Serve a specific published BMAIR release, unmodified, and record which one and how to verify it.
- Let a dev move to a newer BMAIR release as an ordinary, reviewable change that verifies the release before anything is replaced.

## Capabilities

### New Capabilities

- `bot`: Use BMAIR, the Button Men AI, in the browser at `/bot`.

### Modified Capabilities

## Impact

- Adds static files under the existing site; no change to the buttonweavers API, the proxy, or hosting cost.
- The AI computes in the visitor's browser, so button.men stores and relays nothing for it.
