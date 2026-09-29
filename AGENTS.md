# Working rules for AI agents

These rules apply to whichever AI agent works on this repo (Claude, Codex, Copilot or another).

## Roles

- **Devs own the specs.** Requirement and scenario text in `openspec/` is theirs. Don't change it without asking in a PR comment first.
- **The agent owns everything else:** code, tests, infrastructure, CI, and the `design.md` / `tasks.md` artifacts inside a change.
- **Implementation choices are the agent's.** Specs say *what* (e.g. "the site runs for free"); the agent decides *how* (platform, libraries, layout) and records the reasoning in the change's `design.md`. Keep specs implementation-neutral.

## Implementing a spec change

You'll be given a change name and a **spec branch** (for example `spec/add-forum`).

1. Work on a new branch cut from the spec branch. Your pull request targets **the spec branch, never `main`**.
2. Diff the spec branch against `main` under `openspec/`. Work out which changes (`openspec/changes/<name>/`) or direct spec edits are in scope.
3. For each change, write `design.md` and `tasks.md` if they're missing (`openspec instructions <artifact> --change <name>`).
4. Implement in small, focused commits. Every scenario gets a test that checks the behaviour itself, not just that some code exists.
5. `openspec validate --all --strict` and `npm test` must pass.
6. Archive each completed change with `openspec archive <name> -y`, so `openspec/specs/` matches what ships.
7. Anything only a dev can do (accounts, DNS, secrets, payments, approvals) goes under an "Owner tasks" heading in your pull request, with exact steps; open an `owner-task` issue for each if you can. Never ask for secrets in comments; they go in GitHub or platform secrets.
8. Finish with a pull request description covering what changed, how each scenario is tested, and any owner tasks, then ask the dev for a review. If blocked, say what's blocking.

## Style

- Small diffs, plain code, no speculative abstractions.
- Prefer free tiers and managed services; nothing that needs a server to babysit.
- Never log request bodies or credentials.
