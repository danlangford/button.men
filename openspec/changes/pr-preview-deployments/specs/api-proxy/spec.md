# Spec Delta

## ADDED Requirements

### Requirement: Preview API target is configurable per deployment
The API proxy SHALL send preview API requests to the production Buttonweavers endpoint by default. A maintainer SHALL be able to configure an individual preview deployment to use a non-production Buttonweavers endpoint without changing the target used by other previews or production. The target SHALL be selected by deployment configuration, not by user-supplied request data.

#### Scenario: Preview uses the default target
- **WHEN** a preview has no non-production API target configured
- **THEN** its API requests are sent to the production Buttonweavers endpoint

#### Scenario: A preview uses a configured non-production target
- **WHEN** a maintainer configures a preview to use a non-production Buttonweavers endpoint
- **THEN** that preview's API requests are sent to the configured endpoint and production and other previews retain their configured targets

#### Scenario: A request attempts to select its API target
- **WHEN** a user-supplied API request contains data that would change the API target
- **THEN** the proxy continues using the endpoint selected by deployment configuration
