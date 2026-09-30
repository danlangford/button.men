# Spec Delta

## Purpose

Makes the current button.men specifications easy to read, explore, link to, and search in a web browser, using the OpenSpec files as their single authored source.

## ADDED Requirements

### Requirement: Browse specifications by feature
The site SHALL let visitors read the current specifications in a browser, organized by feature, without requiring an account.

#### Scenario: Explore the feature list
- **WHEN** a visitor opens the specification view
- **THEN** they can see and select the available features

#### Scenario: Read a feature specification
- **WHEN** a visitor selects a feature
- **THEN** the current specification for that feature is readable in the browser

### Requirement: Search across features
The site SHALL let visitors search the content of all current feature specifications from one place.

#### Scenario: Find matching requirements
- **WHEN** a visitor searches for text that appears in a specification
- **THEN** matching results identify their feature and requirement and provide enough context to recognize the match

#### Scenario: Search without regard to letter case
- **WHEN** a visitor searches using different capitalization from the specification text
- **THEN** matching content is still found

#### Scenario: No matching content
- **WHEN** a visitor searches for text that does not appear in any current specification
- **THEN** the site makes clear that there are no matching results

### Requirement: Link directly to specification content
The site SHALL provide a shareable browser URL for each feature specification and each requirement.

#### Scenario: Open a shared requirement link
- **WHEN** a visitor opens a requirement's URL directly or follows it from search results
- **THEN** the corresponding requirement is shown in its feature specification

### Requirement: Keep specifications as the single source
The content displayed and searched by the site SHALL be derived from the current specifications in `openspec/specs/` and SHALL NOT require a separately authored copy of their content.

#### Scenario: Specification content changes
- **WHEN** a current specification is updated and the site is updated
- **THEN** the browser view and search reflect the updated specification

### Requirement: Avoid domain registration changes
The specification view SHALL NOT require purchasing or registering a new domain, using a button.men subdomain, or changing domain registrar settings. It MAY use an address provided by an existing platform.

#### Scenario: Publish using an existing platform
- **WHEN** the specification view is published
- **THEN** it can be accessed without purchasing or registering a domain or changing registrar settings

### Requirement: Read specifications on phones and desktops
The specification view SHALL remain readable and usable on phone and desktop screen sizes.

#### Scenario: Read on a phone
- **WHEN** a visitor views or searches specifications on a phone-sized screen
- **THEN** the content and controls fit the screen and remain usable
