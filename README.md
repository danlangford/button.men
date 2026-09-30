# button.men

A modern, dark-mode-capable front end for [Button Men Online](https://www.buttonweavers.com), talking to the existing buttonweavers API.

How Button Men works, including its API, is defined by its source code: [buttonmen-dev/buttonmen](https://github.com/buttonmen-dev/buttonmen) (forked at [danlangford/buttonmen](https://github.com/danlangford/buttonmen)). button.men only displays and relays.

## How this repo works

The specs in [`openspec/`](openspec/) are the source of truth. Devs own the specs; an AI agent (currently the Copilot cloud agent) drafts and implements them.

**The usual way: one issue, one PR**

1. **File the idea:** new issue → **Idea** template. Rough is fine; put tech ideas you want considered under Suggestions.
2. **Get a spec draft:** assign the issue to Copilot with the **Assign agent** dialog (agent **OpenSpec**, base branch `main`). It opens a PR into `main` containing only `openspec/changes/<name>/`, and asks for your review. (`copilot-ready.yml` takes Copilot's PRs out of draft, since Copilot isn't allowed to.)
3. **Shape the spec:** edit it, or comment `@copilot …` until it reads right.
4. **Approve and implement:** comment `@copilot the spec looks great, implement it on this branch, following AGENTS.md "Implementing a spec change"`. The design, code, tests and archive arrive as more commits on the same PR. Anything it can't do becomes an [`owner-task`](../../issues?q=is%3Aopen+label%3Aowner-task) issue.
5. **Review and merge the PR** into `main`, which deploys. `main` never has specs that aren't built.

To review just the implementation, pick the commits after your approval comment in the PR's "Changes from" menu.

**Alternative: you write the spec**

Open a spec PR yourself from `spec/<name>` into `main` (edit `openspec/specs/` directly, or add `openspec/changes/<name>/`). Then open an issue "Implement OpenSpec change `<name>`", assign it to Copilot with `spec/<name>` as the **base branch**, and it stacks its own PR on yours. Merge its PR into your branch, then yours into `main` (or merge the stack).

The workflow itself is specified in [`openspec/specs/development-workflow/spec.md`](openspec/specs/development-workflow/spec.md). See [`AGENTS.md`](AGENTS.md) for the agent's rules.

## Develop

Needs Node 22+. Run `npm ci` to install the locked dependencies.

- `npm test` runs the tests.
- `npm run dev` serves the site at http://localhost:8787, relaying to the real buttonweavers.
- Pushes to `main` deploy to Cloudflare (`.github/workflows/deploy.yml`).
