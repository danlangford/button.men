# api-proxy Specification

## Purpose
Relaying a player's API calls from button.men to buttonweavers, while keeping their credentials safe and making the traffic easy for buttonweavers to identify.

## Requirements

### Requirement: Pass-through only
The proxy SHALL forward API requests to buttonweavers and return the responses unchanged. It SHALL NOT contain game logic.

#### Scenario: Any API call
- **WHEN** the web UI makes an API call
- **THEN** buttonweavers receives the same request body and the UI receives the same response

### Requirement: Credentials are never kept
The proxy SHALL NOT store or log passwords, session tokens or request bodies.

#### Scenario: Logging in
- **WHEN** a player logs in
- **THEN** their password is forwarded to buttonweavers and not kept anywhere by button.men

#### Scenario: Staying logged in
- **WHEN** a player has logged in
- **THEN** their buttonweavers session lives only in their own browser

### Requirement: Identifies itself
Requests to buttonweavers SHALL identify button.men as their source and carry the player's own IP address.

#### Scenario: Maintainers read their logs
- **WHEN** a buttonweavers maintainer looks at a request from button.men
- **THEN** they can tell it came from button.men and which player IP it was for

### Requirement: Transparency
The site SHALL explain, on a page players can reach before logging in, what passes through button.men and what is never kept, and link to this source code.

#### Scenario: Before logging in
- **WHEN** a player opens the login page
- **THEN** a link to that explanation is visible

### Requirement: Replaceable
The web UI SHALL be able to call buttonweavers directly, without the proxy, once buttonweavers allows it, with no change beyond configuration.

#### Scenario: Upstream allows direct access
- **WHEN** buttonweavers starts accepting requests from button.men
- **THEN** switching the UI to call it directly is a configuration change

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
