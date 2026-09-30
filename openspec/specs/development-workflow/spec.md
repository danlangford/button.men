# development-workflow

## Purpose

How ideas and spec changes become shipped code in this repo: usually a dev files an idea, an AI agent drafts the spec in a pull request, the dev approves it there, and the agent implements it on the same pull request.

## Requirements

### Requirement: Spec changes arrive as pull requests
Every change to behaviour SHALL reach `main` through a pull request that changes files under `openspec/`, whether a dev writes the spec or an agent drafts it.

#### Scenario: A change is proposed
- **WHEN** a pull request adds or changes files under `openspec/`
- **THEN** the pull request shows the proposed spec change and CI validates it

### Requirement: Drafting a spec from an idea
A dev SHALL be able to hand the agent a rough idea and get back a spec draft, with no implementation.

#### Scenario: Idea handed to the agent
- **WHEN** a dev assigns an "Idea: …" issue to the agent
- **THEN** the agent opens a pull request into `main` containing only the drafted spec change, and asks the dev for a review

### Requirement: The dev approves the spec before implementation
The agent SHALL NOT implement a drafted spec until a dev explicitly asks it to, and SHALL then implement it on the same pull request.

#### Scenario: Dev approves on the pull request
- **WHEN** a dev comments on the spec-draft pull request asking the agent to implement it
- **THEN** the agent adds the implementation as further commits on that pull request's branch, without opening another pull request

#### Scenario: No approval yet
- **WHEN** the dev hasn't asked for implementation
- **THEN** the pull request contains no implementation code

### Requirement: Stacked implementation as an alternative
When a dev has written a spec pull request themselves, they SHALL be able to hand it to the agent, which then delivers its implementation as its own pull request targeting that spec branch, never `main`.

#### Scenario: Handing off a dev-written spec
- **WHEN** a dev asks the agent to implement a change and names its spec branch as the base
- **THEN** the agent opens a pull request that targets the spec branch

### Requirement: Main stays consistent
Merging SHALL bring a spec and its implementation into `main` together.

#### Scenario: Merging
- **WHEN** the spec and its implementation are merged into `main`, as one pull request or a stack
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
