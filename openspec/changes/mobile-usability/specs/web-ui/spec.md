## MODIFIED Requirements

### Requirement: Modern layout
Every page SHALL be modern: responsive, and usable on any screen from phone to desktop without page-level horizontal scrolling or zooming. At narrow widths, navigation destinations and account controls SHALL remain reachable without page-level horizontal scrolling.

#### Scenario: Narrow screen
- **WHEN** a page is viewed 375 pixels wide
- **THEN** all content fits the width and every control can be tapped

#### Scenario: Other phone widths
- **WHEN** a page is viewed at a viewport width of 320, 393, or 430 CSS pixels
- **THEN** all content fits the viewport and every control can be used without page-level horizontal scrolling or zooming

#### Scenario: Signed-in phone navigation
- **WHEN** a signed-in player views the navigation at a 393 CSS-pixel viewport with the current destinations and account controls available
- **THEN** every destination and account control can be reached and operated without page-level horizontal scrolling
