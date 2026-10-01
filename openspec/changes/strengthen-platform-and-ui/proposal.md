# Proposal

## Why

button.men is expected to grow from a small companion UI toward a more complete ButtonWeavers alternative, but its current conventions and checks are not yet enough to support that growth reliably. This change defines user-facing consistency, search clarity, and a small set of quality and delivery safeguards before the UI expands further.

## What Changes

- Make API failures, including login failures, visible and recoverable in the UI.
- Establish automated linting, dependency-update checks, browser smoke coverage, and end-to-end delivery slices as development expectations.
- Require successful validation before production deployment.
- Give the specification browser the same public-site navigation, theme controls, and footer as the rest of the site, while keeping it available without login.
- Organize and link specifications by OpenSpec capability and requirement.
- Show search result totals and the total number of result pages.
- Add a consistent site-wide footer with careful Button Men attribution and an appropriate acknowledgment of ButtonWeavers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `development-workflow`: require linting, automated dependency-update checks, browser smoke tests, and incremental end-to-end capability delivery.
- `game-search`: communicate the number of matching results and total pages alongside paged results.
- `hosting`: prevent production deployment unless required validation has passed.
- `spec-browser`: organize specifications by capability, identify requirements in search and direct links, and share the public site shell without requiring login.
- `web-ui`: provide consistent site-wide navigation and footer, and show useful recoverable API errors.

## Impact

The change affects the public web UI, specification viewer, game-search results, automated checks, dependency-update configuration, and production deployment workflow. It does not change the ButtonWeavers API contract or introduce a new hosting platform.

## Suggestions

- **ESLint:** adopt a lightweight JavaScript linter and run it in CI; defer adding a formatter unless the maintainers want one.
- **Dependency updates:** automate update pull requests for npm dependencies and GitHub Actions, with normal CI validation.
- **Browser smoke tests:** retain fast Node tests and add a small browser-level suite for critical user journeys and responsive/accessibility behavior.
- **Deployment checks:** make passing required CI checks a prerequisite to production deployment and verify the deployed site with a minimal smoke check.
- **End-to-end slices:** implement replacement capabilities in small, testable user-facing slices rather than accumulating disconnected screens.
- **Framework and hosting:** keep the current plain JavaScript and Cloudflare approach until a demonstrated product or operational need justifies changing either.
- **Privacy:** preserve the API proxy's no-storage and no-request-body-logging guarantees while improving error visibility.
