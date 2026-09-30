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

- Makes the current specifications available through a browser-accessible presentation; the deployment location and technology remain implementation decisions.
- Uses the existing `openspec/specs/` files as its content source; no changes to the Buttonweavers API are needed.

## Suggestions

- Consider the existing button.men site, GitHub Pages, GitHub Wiki, or another suitable existing platform. Choose the option that provides the requested browsing, links, search, and mobile access with the least unnecessary complexity.
- Avoid requiring the purchase or registration of another domain, a button.men subdomain, or changes to domain registrar settings. A platform-provided address is acceptable if it meets the requirements.
- Generate the displayed and searchable content from the existing OpenSpec Markdown rather than maintaining a second copy. A generated representation is acceptable if it stays derived from that source.
- Favor existing project capabilities or a small established library over bespoke viewer/search code. A single-page app is an option only if it reduces complexity; avoid requiring a large database, cache, or separately maintained search index.
