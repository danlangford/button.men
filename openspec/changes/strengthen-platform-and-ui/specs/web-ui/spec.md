# Spec Delta

## ADDED Requirements

### Requirement: Consistent site navigation and theme controls
Every button.men page SHALL provide consistent site navigation and theme controls, including on pages available without login.

#### Scenario: Visitor moves between site areas
- **WHEN** a visitor uses navigation on any button.men page
- **THEN** they can reach the site's available areas and are prompted to log in only when the destination requires an account

#### Scenario: Visitor changes the theme
- **WHEN** a visitor selects a theme on any button.men page
- **THEN** the selected theme is applied consistently across the site and remains their saved choice on that device

### Requirement: Site-wide attribution footer
Every button.men page SHALL display a consistent footer that acknowledges ButtonWeavers and identifies Button Men with an owner-approved copyright or trademark notice when its rights-holder is verified, or otherwise with neutral wording that makes no ownership claim. The footer SHALL NOT imply endorsement or affiliation.

#### Scenario: Footer appears throughout the site
- **WHEN** a visitor opens any button.men page, including a page available before login
- **THEN** the page displays the shared attribution footer and an acknowledgment expressing gratitude to ButtonWeavers

#### Scenario: Attribution is displayed
- **WHEN** a visitor reads the footer
- **THEN** it identifies Button Men as the game and includes only verified, owner-approved copyright or trademark attribution without implying an unapproved relationship

#### Scenario: Rights-holder is not verified
- **WHEN** Button Men's copyright or trademark rights-holder has not been verified
- **THEN** the footer uses neutral identification and makes no copyright or trademark ownership claim

### Requirement: Communicate API failures
When a user-facing action fails because an API call cannot be completed or its response cannot be used, the site SHALL present a clear, actionable error without exposing credentials or raw response data.

#### Scenario: Login API request fails
- **WHEN** a login request fails because of a network error, unsuccessful HTTP response, or unusable response
- **THEN** the login page explains that login could not be completed and allows the player to try again

#### Scenario: A page data request fails
- **WHEN** a request to load user-facing page data fails or returns an unusable response
- **THEN** the site explains the failure in the affected view and provides a way to retry when the action is repeatable

#### Scenario: API error is shown
- **WHEN** the site displays an API error
- **THEN** the message does not include passwords, session credentials, or raw response contents
