# Spec Delta

## MODIFIED Requirements

### Requirement: Browse specifications by feature
The site SHALL let visitors read the current specifications in a browser, organized by OpenSpec capability, without requiring an account.

#### Scenario: Explore the feature list
- **WHEN** a visitor opens the specification view
- **THEN** they can see and select the available capabilities

#### Scenario: Read a feature specification
- **WHEN** a visitor selects a capability
- **THEN** the current specification for that capability is readable in the browser

### Requirement: Search across features
The site SHALL let visitors search the content of all current capability specifications from one place.

#### Scenario: Find matching requirements
- **WHEN** a visitor searches for text that appears in a specification
- **THEN** matching results identify the capability and requirement and provide enough context to recognize the match

#### Scenario: Search without regard to letter case
- **WHEN** a visitor searches using different capitalization from the specification text
- **THEN** matching content is still found

#### Scenario: No matching content
- **WHEN** a visitor searches for text that does not appear in any current specification
- **THEN** the site makes clear that there are no matching results

### Requirement: Link directly to specification content
The site SHALL provide a shareable browser URL for each capability specification and each requirement.

#### Scenario: Open a shared requirement link
- **WHEN** a visitor opens a requirement's URL directly or follows it from search results
- **THEN** the corresponding requirement is shown in its capability specification

## ADDED Requirements

### Requirement: Share the public site navigation and theme
The specification browser SHALL use the site's shared navigation and theme controls, including links that let visitors navigate to other public site areas, without requiring login.

#### Scenario: Anonymous visitor opens specifications
- **WHEN** a visitor who is not logged in opens the specification browser
- **THEN** the shared site navigation and theme controls are available without prompting for login

#### Scenario: Visitor navigates from specifications
- **WHEN** a visitor uses the specification browser's navigation
- **THEN** they can reach other site areas, with login required only for areas that require an account
