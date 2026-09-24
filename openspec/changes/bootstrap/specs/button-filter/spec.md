# Spec Delta

## Purpose

Searching and filtering the full button list, replacing ButtonFilter in buttonmen-tools.

## ADDED Requirements

### Requirement: Filter buttons
Players SHALL be able to filter buttons by name, set, die skill and tournament legality, and combine filters.

#### Scenario: Set and skill together
- **WHEN** a player picks a set and a die skill
- **THEN** only buttons in that set with that skill are shown

### Requirement: Current data
The button list SHALL match what buttonweavers offers, without a dev updating it by hand.

#### Scenario: New button added upstream
- **WHEN** buttonweavers adds a button
- **THEN** it appears in the filter within a day

### Requirement: Works without logging in
The filter SHALL work for visitors who aren't logged in.

#### Scenario: Visitor
- **WHEN** someone who isn't logged in opens the filter
- **THEN** they can search the button list
