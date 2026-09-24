# Spec Delta

## Purpose

The player-facing button.men site: mobile-first, dark-mode capable, and familiar to buttonweavers players.

## ADDED Requirements

### Requirement: Works on phones
Every page SHALL be usable on a phone-sized screen without horizontal scrolling or zooming.

#### Scenario: Narrow screen
- **WHEN** a page is viewed 375 pixels wide
- **THEN** all content fits the width and every control can be tapped

### Requirement: Dark mode
The site SHALL follow the device's light or dark setting, and let the player override it.

#### Scenario: Device in dark mode
- **WHEN** a player's device is set to dark mode
- **THEN** the site is dark

#### Scenario: Manual choice
- **WHEN** a player picks light or dark
- **THEN** the site remembers that choice on that device

### Requirement: Log in and out
Players SHALL log in and out with their buttonweavers username and password.

#### Scenario: Correct password
- **WHEN** a player logs in with valid buttonweavers credentials
- **THEN** they see their games

### Requirement: Game list
Logged-in players SHALL see their active games, with the games waiting on them first.

#### Scenario: Games awaiting a move
- **WHEN** a player has games where it is their turn
- **THEN** those games are listed first

### Requirement: Game page
Players SHALL be able to view a game: both buttons, dice, scores and the log. Anything the site can't do yet SHALL link to the same game on buttonweavers.

#### Scenario: Reading a skill
- **WHEN** a player taps a skill in a game
- **THEN** its description is shown without leaving the page

#### Scenario: Unsupported action
- **WHEN** the player needs to do something button.men doesn't support yet
- **THEN** a link opens that game on buttonweavers
