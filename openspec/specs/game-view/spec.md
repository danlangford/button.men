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

### Requirement: Step through game history
The game view SHALL let a viewer step backward and forward through the action-log entries returned for the game without leaving the game screen, and SHALL show the best-effort board state for the selected step. Replay SHALL be read-only and SHALL NOT allow game actions to be taken from a past position. Chat entries SHALL NOT create replay steps.

#### Scenario: Stepping back
- **WHEN** a viewer on a game at its current state steps backward
- **THEN** the board shows the position before the most recent move and the view indicates it is showing history, not the current state

#### Scenario: Stepping forward
- **WHEN** a viewer is on a past step and steps forward
- **THEN** the board shows the next step in order

#### Scenario: Returning to the present
- **WHEN** a viewer steps forward through the last step or activates a control to return to the current state
- **THEN** the board shows the current game state and normal game actions are available again

#### Scenario: Limits of history
- **WHEN** a viewer is on the earliest available step and tries to step backward, or on the current state and tries to step forward
- **THEN** the board does not change and the corresponding control is unavailable

#### Scenario: Non-attack action entries
- **WHEN** a viewer steps through a pass, option selection, or another non-chat action-log entry
- **THEN** the entry is shown as its own replay step with the best-effort board state, while chat entries do not add steps

#### Scenario: No actions from the past
- **WHEN** a viewer who is the active player is viewing a past step
- **THEN** no attack, pass or other game action can be submitted until they return to the current state

### Requirement: Attack steps are obvious
For a step that shows an attack, the game view SHALL clearly designate the dice that attacked, the dice that were targeted, the direction from attackers to targets, and the type of attack, using more than colour alone, in both the existing 3D and flat 2D dice presentations. Attacker and target dice SHALL be visually prominent through labels and emphasis such as an outline, enlargement, or foreground placement.

#### Scenario: Attack displayed
- **WHEN** a viewer steps to an attack
- **THEN** the attacking dice and targeted dice are each visibly distinguished from other dice, the direction from attackers to targets is shown, and the attack type is stated

#### Scenario: Both presentations
- **WHEN** the same attack step is viewed in the 3D presentation and in the flat 2D presentation
- **THEN** attackers, targets and attack type are clearly designated in both

### Requirement: Highlight the selected game-log entry
While replay is on an action-log step, the game view SHALL visibly highlight the corresponding row in the game log. The attack and result steps for one attack SHALL highlight the same row.

#### Scenario: Current log entry
- **WHEN** a viewer selects an attack, its result, or another action-log step
- **THEN** the corresponding game-log row is visibly highlighted

### Requirement: Results of attacks are separate steps
After each attack step, the game view SHALL provide a following step showing the dice after the attack: captured dice removed and re-rolled dice showing their new values, with the changed dice designated. The sequence of steps SHALL end at the current game state.

#### Scenario: Result after an attack
- **WHEN** a viewer steps forward from an attack step
- **THEN** the board shows captured dice gone and re-rolled dice with their new values, with the changed dice designated

#### Scenario: Sequence ends at the present
- **WHEN** a viewer steps forward through all steps of a game
- **THEN** the final step is identical to the current game state

### Requirement: Link to a point in the game
The game view SHALL provide a link to any history step, and opening such a link SHALL display that game at that step.

#### Scenario: Sharing a step
- **WHEN** a viewer copies the link for a step and another viewer with access opens it
- **THEN** the game opens showing that same step

#### Scenario: Link to a step that does not exist
- **WHEN** a viewer opens a link whose step is not in the game's history
- **THEN** the game opens at its current state and the viewer is told the step was not found

#### Scenario: Link to the current state
- **WHEN** a viewer opens a game with no step in the link
- **THEN** the game opens at its current state as before
