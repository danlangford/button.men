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
