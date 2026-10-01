# Spec Delta

## ADDED Requirements

### Requirement: Automated code-quality checks
Automated lint checks and the project's existing tests SHALL run in continuous integration for each pull request, and their successful completion SHALL be required before merge.

#### Scenario: Pull request passes code-quality checks
- **WHEN** a pull request has no lint or test failures
- **THEN** its code-quality checks complete successfully and are eligible to satisfy the merge requirements

#### Scenario: Pull request has a lint or test failure
- **WHEN** a pull request has a lint or test failure
- **THEN** its required code-quality checks fail and the pull request cannot be merged

### Requirement: Automated dependency updates
The repository SHALL use automated update proposals for maintained npm dependencies and GitHub Actions, and dependency updates SHALL pass the same required checks as other pull requests before merging.

#### Scenario: A maintained dependency has an update
- **WHEN** an update is available for a maintained npm dependency or GitHub Action
- **THEN** an automated pull request proposes the update and runs the required checks

#### Scenario: An update fails required checks
- **WHEN** an automated dependency-update pull request fails a required check
- **THEN** it cannot be merged until the failure is resolved

### Requirement: Browser coverage for critical user journeys
Critical user-facing journeys SHALL have automated tests that exercise the site in a browser, in addition to fast unit tests for isolated behavior.

#### Scenario: A critical journey changes
- **WHEN** a change modifies a critical user-facing journey
- **THEN** the browser test suite exercises the changed journey, including relevant interaction and error states

#### Scenario: A pull request is checked
- **WHEN** continuous integration validates a pull request
- **THEN** it runs the browser tests for the critical user-facing journeys

### Requirement: Deliver user-facing capabilities in end-to-end slices
Expansion toward replacing ButtonWeavers' user interface SHALL be delivered as small, testable slices that each complete a user-facing task before unrelated slices are started.

#### Scenario: A replacement capability is selected
- **WHEN** work begins on a new user-facing capability
- **THEN** its scope identifies a complete user task and acceptance criteria that can be validated end to end

#### Scenario: A capability slice is delivered
- **WHEN** a capability slice is ready for review
- **THEN** its tests demonstrate the user-facing task and the implemented behavior matches its approved specification
