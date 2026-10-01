# Design

## Context

See `proposal.md` for motivation. The site is a small, plain-JavaScript application with Node tests, separate main-site and specifications pages, and distinct CI and production-deployment workflows. `public/js/api.js` currently parses API responses as JSON without checking HTTP status; the search renderer already receives `summary.matchesFound`. The specification build and viewer currently use “feature” as their data and display term.

ButtonWeavers remains authoritative for API behavior. Its `ApiResponder::get_interface_response_searchGameHistory` delegates to `BMInterfaceHistory::search_game_history`; the upstream `src/ui/js/History.js` derives the last page from `summary.matchesFound` and page size. The local search renderer can use the same response summary for a page count without changing the API.

## Goals / Non-Goals

**Goals:**
- Define a low-dependency path from the current app to a more reliable, consistent, and testable UI.
- Keep public specifications accessible and preserve existing shared specification URLs while changing their displayed organization to capabilities.
- Make user-facing failures understandable without exposing credentials or request/response payloads.

**Non-Goals:**
- Select or implement new game rules, alter the ButtonWeavers API, or replace its game engine.
- Migrate the site to a frontend framework, build system, database, or hosting provider.
- Decide legal ownership of Button Men or claim an affiliation with ButtonWeavers.

## Decisions

### Reuse the existing application shell and theme behavior

Bring the specification page into visual and navigation alignment with the main site using the existing Bootstrap-based design and `public/js/theme.js` behavior. Keep the specification page public and static; navigation to account-protected areas may continue to lead to login. Use common shell elements rather than adding a separate design system or router.

The specification builder and viewer should refer to their entries as capabilities, matching OpenSpec's existing directory and document model. Preserve current fragment identifiers as aliases when introducing capability terminology, so links already shared with users continue to work.

### Use upstream search summary for clear pagination

Show the matching-game count and the current page out of the total page count. Calculate the page count from the upstream `matchesFound` total and the selected page size; keep the count sourced from ButtonWeavers rather than estimating it from the current page. Do not add a local search index or alter API arguments.

### Normalize API failures at the client boundary

Have the API client distinguish network failures, unsuccessful HTTP responses, invalid JSON, and API-level errors, then expose a safe message to the affected view. Views should present a useful retry path where repeating the action is safe. Do not automatically retry requests, display raw response data, or log request bodies or credentials.

### Add lightweight quality automation

Adopt ESLint for first-party JavaScript, without requiring a formatter or type-system migration. Use Dependabot update pull requests for npm dependencies and GitHub Actions; let the normal CI checks validate those updates. Keep the locked dependency installation and current Node test runner.

Add a small Playwright browser suite for critical, deterministic journeys, such as anonymous specification browsing and login/API error states. Stub API responses rather than requiring real accounts or depending on ButtonWeavers availability. Keep unit tests for fast, isolated logic checks and avoid turning browser tests into a replacement for them.

### Make validation a deployment prerequisite

Place production deployment behind the successful validation job in the same workflow, so it cannot race an independent CI workflow. Run a small post-deployment request check against the public site and report failures without sending user data. Require the same validation checks before pull-request merge through repository rules; that setting may need maintainer configuration outside the repository.

### Keep legal attribution factual and privacy constraints intact

Use a shared footer that thanks ButtonWeavers and describes Button Men as the game, without claiming unverified copyright or trademark ownership or implying endorsement. Have the maintainer confirm the final wording before release; do not invent a legal ownership statement. Preserve the proxy's existing no-storage and no-request-body-logging guarantees.

### Answer to proposal suggestions

- **ESLint — Adopted:** use ESLint as a narrowly scoped source-quality check; defer a formatter until maintainers request one.
- **Dependency updates — Adopted:** use Dependabot for npm and GitHub Actions updates, with standard CI validation.
- **Browser smoke tests — Adopted:** add a small Playwright suite for critical journeys and keep Node unit tests.
- **Deployment checks — Adopted:** gate deployment on checks and run a minimal public-site smoke check after deployment.
- **End-to-end slices — Adopted:** prioritize complete, acceptance-testable user tasks instead of disconnected screens.
- **Framework and hosting — Rejected for now:** retain plain JavaScript and Cloudflare unless scale, product needs, or operational evidence justify a change.
- **Privacy — Adopted:** improve user-visible error handling without storing or logging credentials or request bodies.

## Risks / Trade-offs

- [Browser tests add runtime and maintenance cost] → Keep the suite small, use stable local fixtures, and reserve it for critical journeys.
- [Changed terminology could break shared spec links] → Preserve existing fragment identifiers as aliases.
- [An attribution statement may imply legal rights or affiliation] → Use factual, cautious wording and require maintainer review before release.
- [A post-deploy smoke check detects but does not itself reverse a failed deployment] → Report failure promptly and retain the existing Cloudflare deployment recovery process.
- [Branch-protection settings are not fully represented by source files] → Document the required status checks and have a repository maintainer configure them.

## Migration Plan

Implement the change in order: client error handling and UI shell/search updates; lint, dependency automation, and browser tests; then deployment gating and post-deploy verification. Roll out the new required checks before enforcing them on merges. Verify attribution wording before shipping the footer. If deployment verification fails, notify maintainers and use the established Cloudflare recovery process.

## Open Questions

None that block specification review. The maintainer must approve the exact footer wording during implementation.
