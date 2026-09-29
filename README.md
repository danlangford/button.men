# button.men

A modern, dark-mode-capable front end for [Button Men Online](https://www.buttonweavers.com), talking to the existing buttonweavers API.

How Button Men works, including its API, is defined by its source code: [buttonmen-dev/buttonmen](https://github.com/buttonmen-dev/buttonmen) (forked at [danlangford/buttonmen](https://github.com/danlangford/buttonmen)). button.men only displays and relays.

## How this repo works

The specs in [`openspec/`](openspec/) are the source of truth. Devs edit specs; an AI agent implements them.

1. **A dev opens a spec PR** from a branch like `spec/<name>` into `main`. Either edit a living spec in `openspec/specs/` directly, or add a change in `openspec/changes/<name>/` (by hand, or with `/opsx:propose`). Put technical ideas you want considered, but not required, under `## Suggestions` in the proposal; the agent must answer each one in `design.md`.
2. **The dev hands it to the agent** (currently the Copilot cloud agent): open an issue like "Implement OpenSpec change `<name>`", assign it to Copilot, and pick `spec/<name>` as the **base branch**.
3. **The agent opens its own PR into `spec/<name>`**, with code and tests, and archives the change so `openspec/specs/` matches what shipped. When done it asks the dev for a review, and `copilot-ready.yml` takes the PR out of draft (Copilot isn't allowed to). Anything it can't do becomes an [`owner-task`](../../issues?q=is%3Aopen+label%3Aowner-task) issue.
4. **The dev reviews and merges the agent's PR into `spec/<name>`**, then merges the spec PR into `main`, which deploys. `main` never has specs that aren't built.

Follow-ups: comment `@copilot ...` on the agent's PR.

The workflow itself is specified in [`openspec/specs/development-workflow/spec.md`](openspec/specs/development-workflow/spec.md). See [`AGENTS.md`](AGENTS.md) for the agent's rules.

## Develop

Needs Node 20+. No dependencies to install.

- `npm test` runs the tests.
- `npm run dev` serves the site at http://localhost:8787, relaying to the real buttonweavers.
- Pushes to `main` deploy to Cloudflare (`.github/workflows/deploy.yml`).
