# development-workflow

## Purpose

How spec changes become shipped code in this repo: Dan edits specs in pull requests, an AI agent implements them on the same branch, and Dan reviews and merges.

## Requirements

### Requirement: Spec changes arrive as pull requests
Every change to behaviour SHALL start as a pull request that changes files under `openspec/`.

#### Scenario: Dan proposes a change
- **WHEN** Dan pushes a branch that changes `openspec/` and opens a pull request
- **THEN** an implementation run starts for that pull request

#### Scenario: Agent pushes do not retrigger
- **WHEN** the agent pushes implementation commits to the pull request
- **THEN** no new implementation run starts

### Requirement: Implementation lands on the same pull request
The agent SHALL implement a spec pull request on its own branch, so spec and code are reviewed and merged together.

#### Scenario: Main stays consistent
- **WHEN** a spec pull request is merged
- **THEN** `main` contains both the spec and the code that implements it, and no unarchived changes

### Requirement: Ready-for-review notification
The agent SHALL tell Dan when a pull request is ready for review.

#### Scenario: Work complete
- **WHEN** implementation is done and checks pass
- **THEN** the pull request gets a summary comment mentioning @danlangford and the `ready-for-review` label

#### Scenario: Work blocked
- **WHEN** the agent cannot finish
- **THEN** the pull request gets a comment explaining the blocker and the `blocked` label

### Requirement: Owner tasks
Anything the agent cannot do itself SHALL be tracked as a GitHub issue labelled `owner-task`, with exact steps.

#### Scenario: Manual step needed
- **WHEN** implementation needs an account, DNS change, secret or approval
- **THEN** an `owner-task` issue describes the steps and is linked from the pull request

### Requirement: Follow-up requests
Dan SHALL be able to ask for changes by mentioning the agent on a pull request or issue.

#### Scenario: Follow-up on a pull request
- **WHEN** Dan mentions the agent with a request on a pull request
- **THEN** the agent makes the change on that pull request's branch and replies
