# Spec Delta

## Purpose

Searching buttonweavers' game history from button.men and linking out to matching games. button.men never indexes games itself and never renders or plays a game found through search.

## ADDED Requirements

### Requirement: Reach game search
Players SHALL be able to get to the game search screen from anywhere on button.men.

#### Scenario: From the game list
- **WHEN** a player is looking at their games
- **THEN** one tap takes them to game search

### Requirement: Search filters
Players SHALL be able to filter game history by any combination of: game ID, either player's name, either player's button name, game status (active, unstarted, complete or cancelled), the winner, and game-started or last-move date ranges.

#### Scenario: Searching by player name
- **WHEN** a player enters another player's name and submits the search
- **THEN** only games involving that player are shown

#### Scenario: No filters given
- **WHEN** a player opens game search without entering any filter
- **THEN** they see a search form and no results until they submit a search

### Requirement: Sortable results
Results SHALL be sortable, one column at a time, ascending or descending, by any of: game ID, either player's name, either player's button name, game start time, last move time, winner, or status.

#### Scenario: Sorting by last move
- **WHEN** a player sorts results by last move, descending
- **THEN** the most recently active game is listed first

### Requirement: Paged results
Results SHALL be delivered a page at a time, with a way to move to the next and previous page.

#### Scenario: More results than fit one page
- **WHEN** a search matches more games than are shown on one page
- **THEN** a player can advance to see the rest

### Requirement: Results link to buttonweavers
Each result SHALL show enough to identify the game (its players, buttons, status and dates) and, on tap, SHALL open that game on buttonweavers.com. button.men SHALL NOT render the game board or accept moves for a game found via search.

#### Scenario: Tapping a result
- **WHEN** a player taps a search result
- **THEN** that game opens on buttonweavers

### Requirement: No local search index
Search SHALL be answered live by buttonweavers' own game history search; button.men SHALL NOT maintain its own copy or index of games for searching.

#### Scenario: A new game is created on buttonweavers
- **WHEN** a game is created or changes status on buttonweavers
- **THEN** it appears correctly in button.men's next search without any action from button.men
