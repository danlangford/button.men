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
BMAIR at `/bot` SHALL compute in the visitor's browser and SHALL NOT send the positions, settings or results a visitor enters to button.men, buttonweavers or any other server.

#### Scenario: Ask for a move
- **WHEN** a visitor runs a position on `/bot`
- **THEN** the AI's answer appears, and the position is not sent to any server

### Requirement: A pinned, verifiable BMAIR release
The site SHALL serve one published BMAIR release, unmodified. The repository SHALL name that release and record checksums that let anyone verify the served files against it.

#### Scenario: See what is deployed
- **WHEN** a dev checks the repository
- **THEN** it names the BMAIR release served at `/bot`, where it was downloaded from, and the download's checksum

#### Scenario: Served files drift from the release
- **WHEN** a file served at `/bot` differs from the recorded release, or a file is added or missing
- **THEN** the checks fail before the change can deploy

#### Scenario: Update to a new release
- **WHEN** a dev updates `/bot` to a newer BMAIR release
- **THEN** the download is checked against the checksums that release publishes before anything is replaced, and a download that fails the check changes nothing
