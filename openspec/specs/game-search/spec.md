# game-search Specification

## Purpose
Searching buttonweavers' game history from button.men and linking out to matching games. button.men never indexes games itself and never renders or plays a game found through search.

## Requirements

### Requirement: Reach game search
Players SHALL be able to get to the game search screen from anywhere on button.men.

#### Scenario: From the game list
- **WHEN** a player is looking at their games
- **THEN** one tap takes them to game search

### Requirement: Search requires login
Game search SHALL require a logged-in player, matching buttonweavers' own history search, which redirects anonymous visitors to a login page.

#### Scenario: Not logged in
- **WHEN** a player who is not logged in tries to reach game search
- **THEN** they are sent to the login page instead

### Requirement: Search filters
Players SHALL be able to filter game history by any combination of: game ID, either player's name, either player's button name, game status (active, unstarted, complete or cancelled), and the winner.

#### Scenario: Searching by player name
- **WHEN** a player enters another player's name and submits the search
- **THEN** only games involving that player are shown

#### Scenario: No filters given
- **WHEN** a player opens game search without entering any filter
- **THEN** they see a search form and no results until they submit a search

### Requirement: Date range filters
Players SHALL be able to filter by game-started and by last-move date range, each picked with a date-range picker rather than typed dates, and the picker SHALL be clean, friendly and modern to use on both desktop and mobile browsers. The implementing agent has autonomy to build this picker itself or adopt a small, lightweight date-picker library or utility, whichever best serves that usability bar.

#### Scenario: Picking a date range on mobile
- **WHEN** a player on a mobile browser opens the game-started date filter
- **THEN** they can pick a start and end date without typing, using controls comfortable to tap

#### Scenario: Filtering by last-move range
- **WHEN** a player picks a last-move date range and submits the search
- **THEN** only games whose last move falls within that range are shown

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
