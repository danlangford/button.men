# Proposal

## Why

The OpenSpec files are the source of truth, but reading them through the repository makes it harder to explore the specification on a phone or desktop and to answer whether a feature is already covered. A browser-based view would make the spec easier to browse, link to, and search across features.

## What Changes

- Add a browser-accessible view of the current specifications, organized by feature.
- Let readers search specification content across all features and navigate directly to matching requirements.
- Keep the OpenSpec files as the only authored source for specification content.

## Capabilities

### New Capabilities

- `spec-browser`: Read, browse, link to, and search the current specifications in a web browser.

### Modified Capabilities

## Impact

- Adds a public-facing specification view to the existing button.men site.
- Uses the existing `openspec/specs/` files as its content source; no changes to the Buttonweavers API are needed.

## Suggestions

- Prefer a page on the existing button.men site over a separate GitHub Pages or wiki destination, consistent with the request not to introduce another domain. Confirm the simplest way to fit it into the current site.
- Generate the displayed and searchable content from the existing OpenSpec Markdown rather than maintaining a second copy. A generated representation is acceptable if it stays derived from that source.
- Favor existing project capabilities or a small established library over bespoke viewer/search code. A single-page app is an option only if it reduces complexity; avoid requiring a large database, cache, or separately maintained search index.
