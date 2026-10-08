# Spec Delta

## ADDED Requirements

### Requirement: Spatial 2D dice presentation
The game view SHALL provide a spatial 2D presentation in place of the flat card-grid presentation. It SHALL arrange each player's active dice in a distinct opposing region of the play area, preserve the selected player orientation, and keep captured dice visually separate from active dice. The existing 3D presentation SHALL remain available.

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
- **WHEN** a viewer switches between the spatial 2D and 3D presentations
- **THEN** both presentations remain available and show the same selected game or replay state

### Requirement: Die geometry communicates die size
Each die in the spatial 2D presentation SHALL use a geometric silhouette and scale that communicate its current number of sides, while keeping its rolled value and recipe legible. Dice with the same number of sides SHALL use consistent geometry, dice with meaningfully different side counts SHALL be visually distinguishable without relying only on their text labels, and a die without a supported dedicated geometry SHALL use a clearly labeled fallback.

#### Scenario: Common die sizes are distinguishable
- **WHEN** dice with different common side counts such as 4, 6, 8, 10, 12, and 20 are present
- **THEN** their silhouettes or scales make the side-count differences visually recognizable while their values and recipes remain legible

#### Scenario: Equal-size dice are consistent
- **WHEN** multiple dice have the same current number of sides
- **THEN** they use the same base geometry regardless of owner, rolled value, skills, or statuses

#### Scenario: Unusual or unresolved die size
- **WHEN** a die's current side count has no dedicated geometry or cannot be resolved
- **THEN** the die remains visible through a consistent fallback that clearly displays its value and recipe or side-count information

### Requirement: Responsive and accessible 2D play area
The spatial 2D presentation SHALL remain usable at supported mobile widths without page-level horizontal scrolling, clipped dice, or unreadable die information. Die identity, rolled value, recipe, skills, statuses, ownership, and replay role SHALL remain available to assistive technology, and meaning SHALL NOT be conveyed by colour alone.

#### Scenario: Spatial view on a phone
- **WHEN** the spatial 2D presentation is viewed at 375 CSS pixels wide
- **THEN** both player regions and all dice fit within the page width without page-level horizontal scrolling or clipped dice

#### Scenario: Die information for assistive technology
- **WHEN** assistive technology encounters a die in the spatial 2D presentation
- **THEN** it can determine the die's owner, rolled value, recipe or side count, active skills and statuses, and whether it is an attacker, target, changed, captured, or active die

## MODIFIED Requirements

### Requirement: Attack steps are obvious
For an attack step, both the 3D and spatial 2D presentations SHALL identify attacking dice, targeted dice, attack direction, and attack type using more than colour alone. Attacker and target dice SHALL also have text labels and visual emphasis. The spatial 2D presentation SHALL draw directional connectors from attacking dice to targeted dice so every involved die is connected.

#### Scenario: Attack displayed
- **WHEN** a viewer steps to an attack
- **THEN** the attacking dice and targeted dice are each visibly distinguished from other dice, the direction from attackers to targets is shown, and the attack type is stated

#### Scenario: Both presentations
- **WHEN** the same attack step is viewed in the 3D presentation and in the spatial 2D presentation
- **THEN** attackers, targets and attack type are clearly designated in both

#### Scenario: Spatial attack connections
- **WHEN** an attack step with one or more attacking dice and one or more targeted dice is shown in the spatial 2D presentation
- **THEN** directional connectors run from the attacking side to the targeted side and visibly connect every attacking and targeted die involved in that attack
