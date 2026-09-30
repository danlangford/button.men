# Spec Delta

## MODIFIED Requirements

### Requirement: Runs for free
The site, including pull request preview deployments, SHALL run at no ongoing cost at expected traffic, and SHALL NOT start charging without a dev's approval.

#### Scenario: Normal month
- **WHEN** a month passes at normal traffic
- **THEN** the hosting bill is $0

#### Scenario: Free limits reached
- **WHEN** traffic exceeds what is free
- **THEN** the site degrades or stops rather than incurring charges, and the devs are told

## ADDED Requirements

### Requirement: Pull request previews have a temporary address and lifecycle
Each pull request preview SHALL be available at a distinct, stable hostname that identifies its pull request, such as `pr21.button.men`. It SHALL remain available while the pull request is open and SHALL be torn down when the pull request is closed or merged. The preview lifecycle SHALL also provide an explicit trigger that can tear down a preview.

#### Scenario: Pull request is opened or updated
- **WHEN** a pull request is opened or updated
- **THEN** its preview is deployed or updated at its distinct pull-request hostname and is available for review

#### Scenario: Pull request is closed or merged
- **WHEN** a pull request is closed or merged
- **THEN** its preview deployment and hostname are removed

#### Scenario: Preview teardown is explicitly triggered
- **WHEN** an authorized maintainer triggers teardown for a preview
- **THEN** that preview deployment and hostname are removed
