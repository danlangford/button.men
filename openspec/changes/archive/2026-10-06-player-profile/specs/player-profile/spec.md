# Spec Delta

## Purpose

Viewing player profiles, and viewing and editing one's own preferences, using the data buttonweavers already stores. button.men never stores profile or preference data itself.

## ADDED Requirements

### Requirement: Profile requires login
The profile screen SHALL require a logged-in player, matching buttonweavers' own profile page.

#### Scenario: Not logged in
- **WHEN** a player who is not logged in tries to open a profile
- **THEN** they are sent to log in first and then taken to the profile they asked for

### Requirement: View a player's profile
The profile screen SHALL display the profile information buttonweavers provides for the requested player, such as username, real name, pronouns, birthday, homepage, comment, favorite button and button set, profile image, vacation message, and email when the player has made it public. Fields the player has not filled in SHALL be omitted or shown as empty, and private data SHALL NOT be shown to other players.

#### Scenario: Viewing another player
- **WHEN** a logged-in player opens another player's profile
- **THEN** that player's public profile information is displayed and no editing controls are shown

#### Scenario: Email not public
- **WHEN** a player has not made their email address public and someone else views their profile
- **THEN** the email address is not displayed

#### Scenario: Unknown player
- **WHEN** a player opens a profile for a username that does not exist
- **THEN** a clear "player not found" message is shown

### Requirement: Statistics and recent games
The profile screen SHALL display any statistics that buttonweavers returns for the player, and SHALL list some of the player's most recent games, obtained from game history search, each linking to its game.

#### Scenario: Statistics shown
- **WHEN** buttonweavers returns statistics for the viewed player
- **THEN** the profile displays them

#### Scenario: Recent games shown
- **WHEN** a logged-in player opens a profile of a player who has completed games
- **THEN** that player's most recent games are listed, each linking to the game

#### Scenario: No games
- **WHEN** the viewed player has no completed games
- **THEN** the recent games section says so instead of showing an empty list

### Requirement: Shareable profile address
Each player's profile SHALL have a stable address that opens that player's profile directly, so it can be linked from anywhere and bookmarked.

#### Scenario: Opening a profile address
- **WHEN** a logged-in player opens the address of a player's profile
- **THEN** that player's profile is displayed

### Requirement: Usernames link to profiles
Wherever button.men displays a player's username (including forum posts, game views, game lists and search results), the username SHALL link to that player's profile.

#### Scenario: Clicking a username in the forum
- **WHEN** a player clicks a username on a forum post
- **THEN** that user's profile is displayed

#### Scenario: Clicking a username in a game
- **WHEN** a player clicks a player's username in a game view
- **THEN** that user's profile is displayed

### Requirement: Reach own profile and preferences
A logged-in player SHALL be able to get to their own profile and preferences from the site navigation on any screen.

#### Scenario: From the navigation
- **WHEN** a logged-in player activates the profile link in the navigation
- **THEN** their own profile and preferences are displayed

### Requirement: View own preferences
When a player views their own profile, the screen SHALL also display their current preferences as stored by buttonweavers, including game behaviour (auto-accept, auto-pass, fire overshooting, monitoring and redirect options), die appearance (background and the player, opponent and neutral colors), and profile options (favorite button and set, gravatar use and size, vacation message).

#### Scenario: Own preferences shown
- **WHEN** a logged-in player opens their own profile
- **THEN** the current values of their preferences are displayed

#### Scenario: Preferences are private
- **WHEN** a player opens another player's profile
- **THEN** that player's preferences are not displayed

### Requirement: Edit own preferences
A logged-in player SHALL be able to edit the profile and preference fields that buttonweavers allows editing, and save them. Saving SHALL be validated against buttonweavers' limits (for example maximum lengths and allowed ranges) and the screen SHALL show clearly whether the save succeeded.

#### Scenario: Successful save
- **WHEN** a player changes an editable field and saves
- **THEN** the change is stored by buttonweavers, a success message is shown, and the screen displays the new value

#### Scenario: Invalid value
- **WHEN** a player saves a value buttonweavers rejects
- **THEN** the buttonweavers error message is shown, the form keeps the player's entries, and nothing is changed

#### Scenario: Other fields untouched
- **WHEN** a player edits one field and saves
- **THEN** all other fields keep their previous values

### Requirement: Change password and email
A logged-in player SHALL be able to change their password and email address from their own preferences, which MUST require their current password.

#### Scenario: Password changed
- **WHEN** a player enters their current password and a new password and saves
- **THEN** buttonweavers updates the password and the player is told it succeeded

#### Scenario: Wrong current password
- **WHEN** a player enters an incorrect current password
- **THEN** the change is rejected with buttonweavers' error message

### Requirement: Mobile-friendly profile
The profile and preferences screen SHALL be responsive and comfortable on phones as well as desktops.

#### Scenario: Phone viewport
- **WHEN** the profile screen is opened on a narrow viewport
- **THEN** all fields and controls are usable without horizontal scrolling
