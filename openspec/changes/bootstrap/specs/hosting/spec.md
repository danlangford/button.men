# Spec Delta

## Purpose

Where button.men runs, what it costs, and what keeping it running asks of Dan.

## ADDED Requirements

### Requirement: Runs for free
The site SHALL run at no ongoing cost at expected traffic, and SHALL NOT start charging without Dan's approval.

#### Scenario: Normal month
- **WHEN** a month passes at normal traffic
- **THEN** the hosting bill is $0

#### Scenario: Free limits reached
- **WHEN** traffic exceeds what is free
- **THEN** the site degrades or stops rather than incurring charges, and Dan is told

### Requirement: Served at button.men over HTTPS
The site SHALL be served at `https://button.men`.

#### Scenario: Plain HTTP
- **WHEN** a player visits `http://button.men`
- **THEN** they are redirected to `https://button.men`

### Requirement: Nothing to babysit
The site SHALL NOT need a server that Dan patches or restarts by hand.

#### Scenario: Deploying
- **WHEN** a change is merged to `main`
- **THEN** it deploys automatically
