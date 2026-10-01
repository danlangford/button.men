# Tasks

## 1. Shared site experience and specification browser

- [ ] 1.1 Add a minimal Playwright smoke-test foundation for anonymous specification browsing; verify that the test runs locally against fixture content.
- [ ] 1.2 Align the public specification page with the site's shared navigation and theme controls while keeping it accessible without login; verify anonymous navigation and saved theme behavior in browser tests.
- [ ] 1.3 Add the shared attribution footer to every site page, including the specification page; obtain maintainer approval for the factual wording and verify it appears without unverified ownership or affiliation claims.
- [ ] 1.4 Rename specification-browser organization and search labels to capabilities, use capability-based fragment identifiers, and test capability search and direct-link behavior.

## 2. Search and API error behavior

- [ ] 2.1 Show the matching-game count and current/total page summary using ButtonWeavers' search summary; test first, middle, last, single-page, and empty-result states.
- [ ] 2.2 Normalize network, HTTP, invalid-JSON, and API-level failures at the API client boundary and surface safe, retryable messages in views; test login and page-data failures without exposing credentials or response bodies.
- [ ] 2.3 Extend browser smoke coverage to critical login-error and responsive interactions using local fixtures; verify the cases pass without real accounts or ButtonWeavers availability.

## 3. Code quality and browser coverage

- [ ] 3.1 Add ESLint for first-party JavaScript and run it with the existing unit tests in pull-request CI; verify lint and test failures make the required check fail.
- [ ] 3.2 Configure automated update pull requests for npm dependencies and GitHub Actions, and verify update pull requests run the normal required checks.
- [ ] 3.3 Run the Playwright suite and existing Node tests in pull-request CI; verify both suites are required checks.
- [ ] 3.4 Update development guidance and the idea template to request a complete user task and testable acceptance criteria for each capability slice; verify the documented workflow matches the development-workflow specification.

## 4. Production deployment safeguards

- [ ] 4.1 Gate production deployment on successful CI validation for the same commit; test that deployment runs after success and is skipped when a required check fails.
- [ ] 4.2 Add a post-deployment public-site smoke check and failure notification; verify it checks public routes without sending credentials or request bodies.
- [ ] 4.3 Configure repository merge rules to require the validation checks and verify a pull request cannot merge while a required check is failing.
