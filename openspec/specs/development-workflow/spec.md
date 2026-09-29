# development-workflow

## Purpose

How spec changes become shipped code in this repo: a dev proposes a spec change in a pull request, hands it to an AI agent, reviews the agent's pull request into the spec branch, and merges both.

## Requirements

### Requirement: Spec changes arrive as pull requests
Every change to behaviour SHALL start as a pull request, from a spec branch, that changes files under `openspec/`.

#### Scenario: A dev proposes a change
- **WHEN** a dev pushes a spec branch that changes `openspec/` and opens a pull request into `main`
- **THEN** the pull request shows the proposed spec change and CI validates it

### Requirement: Handing a change to the agent
A dev SHALL hand a spec change to the agent by asking it to implement that change, with the spec branch as the base.

#### Scenario: Handing off
- **WHEN** a dev asks the agent to implement a change and names its spec branch as the base
- **THEN** the agent starts work on a new branch cut from that spec branch

### Requirement: Implementation arrives as a pull request into the spec branch
The agent SHALL deliver its implementation as its own pull request targeting the spec branch, never `main`, so the spec branch stays the dev's.

#### Scenario: Agent opens its pull request
- **WHEN** the agent has implemented a change
- **THEN** its pull request targets the spec branch

#### Scenario: Main stays consistent
- **WHEN** the dev merges the agent's pull request into the spec branch and then the spec pull request into `main`
- **THEN** `main` contains both the spec and the code that implements it, and no unarchived changes

### Requirement: Ready-for-review notification
The agent SHALL tell the dev when its pull request is ready for review.

#### Scenario: Work complete
- **WHEN** implementation is done and checks pass
- **THEN** the agent's pull request describes what changed and how it's tested, is no longer a draft, and asks the dev for a review

#### Scenario: Work blocked
- **WHEN** the agent cannot finish
- **THEN** its pull request explains the blocker

### Requirement: Owner tasks
Anything the agent cannot do itself SHALL be written up with exact steps and tracked as a GitHub issue labelled `owner-task`.

#### Scenario: Manual step needed
- **WHEN** implementation needs an account, DNS change, secret or approval
- **THEN** the agent's pull request lists the steps under "Owner tasks", and each becomes an `owner-task` issue

### Requirement: Follow-up requests
Devs SHALL be able to ask for changes by mentioning the agent on its pull request.

#### Scenario: Follow-up on the agent's pull request
- **WHEN** a dev mentions the agent with a request on its pull request
- **THEN** the agent makes the change on that pull request's branch and replies
