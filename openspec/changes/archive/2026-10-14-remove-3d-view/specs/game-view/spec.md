## MODIFIED Requirements

### Requirement: Spatial 2D dice presentation
The game view SHALL present dice in a spatial 2D play area. It SHALL arrange each player's active dice in a distinct opposing region of the play area, preserve the selected player orientation, and keep captured dice visually separate from active dice. The spatial 2D presentation SHALL be shown when a game opens and SHALL be the only dice presentation.

#### Scenario: Opposing player regions
- **WHEN** a viewer opens the spatial 2D presentation
- **THEN** the player oriented at the bottom has active dice in the lower region and the other player has active dice in the opposing upper region

#### Scenario: Flipping the spatial view
- **WHEN** a viewer flips the player orientation while using the spatial 2D presentation
- **THEN** the players and their dice exchange upper and lower regions without changing the game state

#### Scenario: Captured dice remain distinct
- **WHEN** either player has captured dice
- **THEN** those dice are visibly grouped apart from both players' active dice and identified as captured

#### Scenario: Switching presentations
- **WHEN** a viewer opens a game
- **THEN** the spatial 2D presentation is shown without any further action and no 3D presentation or control to switch presentations is offered

## REMOVED Requirements

### Requirement: Attack steps are obvious
**Reason**: It required attack steps to be identified in both the 3D and spatial 2D presentations, and the 3D presentation is removed.
**Migration**: Replaced by "Attack steps are clear in the 2D view", which keeps every 2D obligation and drops the 3D one.

## ADDED Requirements

### Requirement: Attack steps are clear in the 2D view
For an attack step, the spatial 2D presentation SHALL identify attacking dice, targeted dice, attack direction, and attack type using more than colour alone. Attacker and target dice SHALL also have text labels and visual emphasis. The spatial 2D presentation SHALL draw directional connectors from attacking dice to targeted dice so every involved die is connected.

#### Scenario: Attack displayed
- **WHEN** a viewer steps to an attack
- **THEN** the attacking dice and targeted dice are each visibly distinguished from other dice, the direction from attackers to targets is shown, and the attack type is stated

#### Scenario: Spatial attack connections
- **WHEN** an attack step with one or more attacking dice and one or more targeted dice is shown in the spatial 2D presentation
- **THEN** directional connectors run from the attacking side to the targeted side and visibly connect every attacking and targeted die involved in that attack
