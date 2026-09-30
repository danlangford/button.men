# Design

## Context

The site is a static Cloudflare Worker asset bundle. GitHub Actions deploys the bundle from the repository, and Wrangler serves the same assets locally. Current specifications live in `openspec/specs/`; change deltas are planning artifacts and are not the published source.

## Goals / Non-Goals

**Goals:**
- Make the current feature specifications directly browseable from the existing site.
- Derive all displayed and searchable specification text from `openspec/specs/`.
- Keep publishing and local development compatible with the current Wrangler workflow.

**Non-Goals:**
- Add another hosting platform, custom domain, or server-side data store.
- Display unarchived change proposals or deltas as current specifications.
- Implement a general-purpose Markdown renderer.

## Decisions

- **Use the existing Cloudflare Worker site and `/specs/` path.** Add a static viewer alongside the existing app and link to it from the main navigation. This uses the current hosting and platform-provided address without registration or DNS changes; GitHub Pages or a wiki would create a separate publishing surface and workflow.
- **Generate a small JSON asset from `openspec/specs/` with a Node build script.** The deploy workflow and Wrangler development command will run the generator, so the published data follows the source files without a separately authored copy. A checked-in generated copy or runtime GitHub fetch would either duplicate content or couple the viewer to network/API availability.
- **Use the browser’s built-in DOM and search APIs.** A small vanilla JavaScript viewer can build accessible headings, requirement anchors, and case-insensitive results without an additional dependency, database, cache, or maintained search index.
- **Link requirements with stable, readable fragment identifiers.** Feature links target their feature heading; requirement and search-result links target the associated requirement heading. The fragment is resolved after rendering, so direct and shared links land on the relevant content.

## Risks / Trade-offs

- [A spec heading rename changes its requirement anchor] → Derive anchors from feature and requirement names, and use the same helper for rendering and search links.
- [A build is required for the generated asset to exist] → Run generation before both Wrangler development and deployment; test the generator and viewer logic directly.
- [Markdown formatting is not fully rendered] → Render structural headings, paragraphs, lists, and requirement/scenario hierarchy while treating source text as text, preserving readable and safe content without a general-purpose renderer.

## Migration Plan

No data migration is required. Add the build step to local development and deployment, then deploy the static viewer with the existing application. Rollback consists of reverting the viewer and build integration; no persistent state is changed.

## Open Questions

None.
