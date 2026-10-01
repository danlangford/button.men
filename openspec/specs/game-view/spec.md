# game-view Specification

## Purpose
Displaying the current state of a Button Men game in a modern, perspectival play area with dice, button skills, scores, and chat.

## Requirements

### Requirement: Perspectival game layout
The game view SHALL display the active game state in a perspectival layout with the viewing player's button and dice at the bottom of the play area and the opponent's button and dice across at the top. For a spectator who is not one of the players, the game view SHALL initially display player 1 at the bottom and player 2 at the top. The game view SHALL provide a control to flip the player orientation on any game.

#### Scenario: Viewing player is a participant
- **WHEN** a logged-in player views an active game they are playing in
- **THEN** their button and dice are positioned at the bottom of the play area and their opponent's button and dice are positioned at the top

#### Scenario: Viewing player is a spectator
- **WHEN** a viewer opens a game they are not participating in
- **THEN** player 1's button and dice are displayed at the bottom and player 2's at the top, with clear player identification

#### Scenario: Flipping player orientation
- **WHEN** a viewer activates the flip-orientation control on any game
- **THEN** the players' positions at the top and bottom are reversed

### Requirement: Player and button details
The game view SHALL display both players' usernames, button names, button recipes, active skills, current round scores, and overall match score, and SHALL indicate which player currently has initiative or is active to move.

#### Scenario: Player details displayed
- **WHEN** the game view loads
- **THEN** each player's username, button name, button skills, current round score, and total game wins and target are visible

#### Scenario: Turn indicator
- **WHEN** a game is awaiting action
- **THEN** the game view clearly indicates which player has initiative or is active to move

### Requirement: Dice representation
Each die in play SHALL display its current rolled value, its size or recipe, its active skills, and any special status properties.

#### Scenario: Standard active die
- **WHEN** an active die is displayed
- **THEN** its current rolled value and number of sides or recipe are clearly legible

#### Scenario: Die with special skills or status
- **WHEN** a die has active skills or status conditions such as dizzy, disabled, attacker, or target
- **THEN** the die visually indicates those skills and status conditions

### Requirement: Correlated game activity and chat
The game view SHALL display game action history and chat messages in a unified chronological sequence and SHALL provide "All", "Chat only", and "Actions only" filters. The "Chat only" filter SHALL be selected by default.

#### Scenario: Chronological order
- **WHEN** the viewer selects the "All" filter
- **THEN** they are presented in timestamp order showing the player and message text

#### Scenario: Chat filter selected by default
- **WHEN** the game activity stream first loads
- **THEN** the "Chat only" filter is selected and only chat messages are shown

#### Scenario: Filtering game activity
- **WHEN** the viewer selects "Chat only" or "Actions only"
- **THEN** only messages of the selected type are shown

### Requirement: Chat privacy
The game view SHALL respect game chat privacy rules and conceal private chat messages from non-participants.

#### Scenario: Non-participant views game with private chat
- **WHEN** a user who is not a participant views a game where chat is private
- **THEN** private chat messages are hidden and a privacy notice is shown

### Requirement: External action link
Because move submission is not yet supported in button.men, the game view SHALL provide a direct link to the game on buttonweavers for taking actions, and that link SHALL open in a new tab.

#### Scenario: Taking a move
- **WHEN** a player views a game where action is required
- **THEN** a link is available that opens that game on buttonweavers to take their action

### Requirement: Responsive play area
The game view SHALL be usable on mobile viewports as narrow as 320 CSS pixels without page-level horizontal scrolling.

#### Scenario: Mobile viewport
- **WHEN** the game view is viewed on a screen 375 pixels wide
- **THEN** the player and opponent dice, button info, and game logs fit within the screen width without horizontal scrolling
