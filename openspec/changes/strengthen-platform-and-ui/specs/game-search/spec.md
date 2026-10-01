# Spec Delta

## MODIFIED Requirements

### Requirement: Paged results
Results SHALL be delivered a page at a time, with a way to move to the next and previous page. The results SHALL communicate the total number of matching games and the current page relative to the total number of pages.

#### Scenario: More results than fit one page
- **WHEN** a search matches more games than are shown on one page
- **THEN** a player can advance to see the rest and can see how many matching games and pages there are

#### Scenario: Viewing a later result page
- **WHEN** a player views a page of search results
- **THEN** the result summary identifies the current page and total page count
