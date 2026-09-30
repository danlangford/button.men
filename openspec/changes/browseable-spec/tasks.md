# Tasks

## 1. Specification content generation

- [x] 1.1 Generate a browser data asset from current `openspec/specs/` Markdown and verify it includes every feature file without reading change deltas.
- [x] 1.2 Add generator tests that verify feature names and source content are preserved and verify an empty or missing specification directory is handled clearly.

## 2. Specification viewer

- [ ] 2.1 Add a responsive `/specs/` view that presents current specifications by feature and requirement; verify the page has a viewport and accessible controls.
- [ ] 2.2 Add case-insensitive search with matching feature, requirement, and context; verify matching, capitalization differences, and no-results behavior.
- [ ] 2.3 Add shareable feature and requirement links; verify direct fragments resolve to the matching rendered sections.
- [ ] 2.4 Add viewer tests covering source-text-safe rendering, search, and link generation.

## 3. Build and site integration

- [ ] 3.1 Run content generation for local Wrangler development and production deployment; verify both workflows build the generated asset before serving it.
- [ ] 3.2 Link the specification view from the existing site and verify visitors can discover it without signing in.
- [ ] 3.3 Run `npm test` and `openspec validate --all --strict` and verify both pass.
