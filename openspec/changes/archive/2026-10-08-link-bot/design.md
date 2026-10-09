# Design

## Context

The main app, About, and specification pages each carry their own copy of the site navigation in their HTML. The specifications link is always visible in all three: a button in the main app and on About, and plain text on the specification page, where it is the current page. The `/bot` page is an unmodified BMAIR release, so it carries no site navigation.

## Goals / Non-Goals

**Goals:**
- Reach `/bot` from every page with the site navigation, logged in or not.

**Non-Goals:**
- Changing the BMAIR page, which must stay byte-for-byte the release (see the `bot` spec).

## Decisions

- **A "Bot" button immediately after the specifications entry, linking to `/bot/`.** The same style as its neighbours, always visible like the specifications link, and the trailing slash skips the redirect Cloudflare adds for `/bot`.

## Risks / Trade-offs

- [The three copies of the navigation drift] → A test checks that every page puts the link beside the specifications entry.

## Migration Plan

Merge to deploy.

## Open Questions

None.
