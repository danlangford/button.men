# Spec Delta

## Purpose

Reading the buttonweavers forum on button.men. Writing posts stays on buttonweavers for now.

## ADDED Requirements

### Requirement: Reach the forum
Logged-in players SHALL be able to get to the forum from anywhere on button.men.

#### Scenario: From the game list
- **WHEN** a player is looking at their games
- **THEN** one tap takes them to the forum

### Requirement: Boards
The forum SHALL list every board, and show which boards have posts the player hasn't read.

#### Scenario: New posts on a board
- **WHEN** a board has posts the player hasn't read
- **THEN** that board is marked as having new posts

### Requirement: Threads
Opening a board SHALL list its threads, most recently active first.

#### Scenario: Busy board
- **WHEN** a player opens a board
- **THEN** the thread with the latest post is at the top

### Requirement: Reading a thread
Opening a thread SHALL show all its posts in order, with each post's author and time.

#### Scenario: Thread with unread posts
- **WHEN** a player opens a thread that has posts they haven't read
- **THEN** the thread opens at the first unread post

### Requirement: Posting stays on buttonweavers
For now, replying or starting a thread SHALL send the player to the same place on buttonweavers.

#### Scenario: Replying
- **WHEN** a player wants to reply to a thread
- **THEN** a link opens that thread on buttonweavers
