# bot Specification

## Purpose
Offers BMAIR, the Button Men AI, at `/bot`, running in the visitor's browser, as an exact, verifiable copy of a published BMAIR release.

## Requirements

### Requirement: The Button Men AI at /bot
The site SHALL serve the BMAIR web page at `/bot`, on `button.men` and on every pull request preview, without requiring an account.

#### Scenario: Open the AI
- **WHEN** a visitor opens `https://button.men/bot`
- **THEN** the BMAIR page loads and shows which BMAIR version it runs

#### Scenario: Preview a pull request
- **WHEN** a pull request's preview is deployed
- **THEN** `/bot` on its preview hostname serves the BMAIR that pull request contains

### Requirement: The AI runs in the visitor's browser
BMAIR at `/bot` SHALL compute in the visitor's browser. It SHALL NOT send the positions, settings or results a visitor enters to button.men, buttonweavers or any other server, and SHALL NOT be able to act with the visitor's button.men session.

#### Scenario: Ask for a move
- **WHEN** a visitor runs a position on `/bot`
- **THEN** the AI's answer appears, and the position is not sent to any server

#### Scenario: The page reaches for a server
- **WHEN** the AI page, or anything it runs, tries to call the buttonweavers API through button.men, load another button.men page, or contact another site
- **THEN** the browser refuses

### Requirement: A pinned, verifiable BMAIR release
The site SHALL serve one published BMAIR release, unmodified. The repository SHALL name that release and record checksums that let anyone verify the served files against it.

#### Scenario: See what is deployed
- **WHEN** a dev checks the repository
- **THEN** it names the BMAIR release served at `/bot`, where it was downloaded from, and the download's checksum

#### Scenario: Served files drift from the release
- **WHEN** a file served at `/bot` differs from the published release the repository names, or a file is added or missing
- **THEN** the checks fail, and the change cannot deploy to `button.men`

#### Scenario: Update to another release
- **WHEN** a dev changes `/bot` to another published BMAIR release
- **THEN** the files are verified against that release as published before anything is replaced, and anything that fails verification changes nothing

### Requirement: Linked from the site navigation
Every button.men page with the site navigation SHALL link to `/bot` beside its link to the specifications, whether or not the visitor is logged in.

#### Scenario: Find the AI
- **WHEN** a visitor looks at the site navigation on any page
- **THEN** a link to the AI sits beside the specifications link

#### Scenario: Follow the link
- **WHEN** a visitor follows that link
- **THEN** the BMAIR page opens
