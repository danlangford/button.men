# button.men

A modern, dark-mode-capable front end for [Button Men Online](https://www.buttonweavers.com), talking to the existing buttonweavers API.

## How this repo works

The specs in [`openspec/`](openspec/) are the source of truth. Devs edit specs; an AI agent implements them.

1. **A dev opens a PR that changes `openspec/`.** Either edit a living spec in `openspec/specs/` directly, or add a change in `openspec/changes/<name>/` (by hand, or with `/opsx:propose` in Claude Code).
2. **The agent implements it on the same PR branch**, with tests, and archives the change so `openspec/specs/` matches what shipped.
3. **The agent comments on the PR and labels it `ready-for-review`** when it's done. Anything the agent can't do itself becomes an [`owner-task`](../../issues?q=is%3Aopen+label%3Aowner-task) issue.
4. **The dev reviews spec + code together and merges.** `main` never has specs that aren't built.

Follow-ups: mention the agent on the PR (currently `@claude ...`).

The workflow itself is specified in [`openspec/specs/development-workflow/spec.md`](openspec/specs/development-workflow/spec.md). See [`AGENTS.md`](AGENTS.md) for the agent's rules.
