# web-ui Specification

## Purpose
The player-facing button.men site: modern, dark-mode capable, and familiar to buttonweavers players.

## Requirements

### Requirement: Modern layout
Every page SHALL be modern: responsive, and usable on any screen from phone to desktop without horizontal scrolling or zooming.

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

#### Scenario: Logging out
- **WHEN** a logged-in player logs out
- **THEN** they return to the login page

### Requirement: Game list
Logged-in players SHALL see their active games, with the games waiting on them first.

#### Scenario: Games awaiting a move
- **WHEN** a player has games where it is their turn
- **THEN** those games are listed first

### Requirement: Opening a game
For now, opening a game SHALL send the player to that game on buttonweavers.

#### Scenario: Tapping a game
- **WHEN** a player clicks or taps a game in the list
- **THEN** that game opens on buttonweavers
