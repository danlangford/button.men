# Working rules for AI agents

These rules apply to whichever AI agent works on this repo (Claude, Codex, Copilot or another).

## Roles

- **Devs own the specs.** Requirement and scenario text in `openspec/` is theirs. Don't change it without asking in a PR comment first. The exception is when a dev asks you to draft a spec from an idea (below); then writing it is the task, and the dev reviews and owns the result.
- **The agent owns everything else:** code, tests, infrastructure, CI, and the `design.md` / `tasks.md` artifacts inside a change.
- **Implementation choices are the agent's.** Specs say *what* (e.g. "the site runs for free"); the agent decides *how* (platform, libraries, layout) and records the reasoning in the change's `design.md`. Keep specs implementation-neutral.

## Button Men source of truth

button.men only displays and relays; Button Men Online itself is the source of truth for how anything works: game rules, API arguments and responses, forum behaviour, edge cases.

- **Upstream:** https://github.com/buttonmen-dev/buttonmen (`master`) is what runs on buttonweavers.com. Use it for current behaviour.
- **Dan's fork:** https://github.com/danlangford/buttonmen may carry unmerged work on other branches. Its `master` tracks upstream.
- **Consult it freely** whenever you're deciding how to do something, or what happens if X, Y or Z. Don't guess at buttonweavers' behaviour when the code can tell you.
  - A shallow clone of upstream is at `/tmp/buttonmen` in the Copilot environment (see `copilot-setup-steps.yml`). Elsewhere, clone it outside this repo: `git clone --depth 1 https://github.com/buttonmen-dev/buttonmen /tmp/buttonmen`.
  - Good places to start: `src/api/ApiSpec.php` (every API call's arguments and response fields), `src/api/ApiResponder.php`, `src/engine/BMInterface*.php` (behaviour), and `src/ui/js/` (how the official site does it, e.g. `Env.prepareRawTextForDisplay` for forum markup).
- Cite what you relied on (file and function) in `design.md`.
- It's BSD-licensed: learn from it freely, but don't copy code into this repo without keeping its copyright notice.

## Drafting a spec from an idea

When a dev asks you to turn an idea (usually an issue) into a spec:

1. Pick a short kebab-case name and create only `openspec/changes/<name>/proposal.md` and its spec deltas (`specs/<capability>/spec.md`). Use `openspec instructions proposal --change <name>` and `openspec instructions specs --change <name>`.
2. Keep requirements implementation-neutral, with SHALL/MUST, and make every scenario testable (WHEN/THEN). Check upstream behaviour (see "Button Men source of truth") so the spec matches how buttonweavers actually works.
3. Put the dev's technical ideas under `## Suggestions` in the proposal, not in requirements, unless the dev said they're required.
4. Write no code, no `design.md` or `tasks.md`, and don't archive; that happens when the change is implemented.
5. `openspec validate <name> --strict` must pass. In the pull request, list anything in the idea you were unsure how to specify, as questions for the dev.

## Implementing a spec change

You'll be given a change name and a **spec branch** (for example `spec/add-forum`).

1. Work on a new branch cut from the spec branch. Your pull request targets **the spec branch, never `main`**.
2. Diff the spec branch against `main` under `openspec/`. Work out which changes (`openspec/changes/<name>/`) or direct spec edits are in scope.
3. For each change, write `design.md` and `tasks.md` if they're missing (`openspec instructions <artifact> --change <name>`). If the proposal has a `## Suggestions` section, `design.md` must answer each suggestion by name: adopted, adapted or rejected, and why.
4. Implement in small, focused commits. Every scenario gets a test that checks the behaviour itself, not just that some code exists.
5. `openspec validate --all --strict` and `npm test` must pass.
6. Archive each completed change with `openspec archive <name> -y`, so `openspec/specs/` matches what ships.
7. Anything only a dev can do (accounts, DNS, secrets, payments, approvals) goes under an "Owner tasks" heading in your pull request, with exact steps; open an `owner-task` issue for each if you can. Never ask for secrets in comments; they go in GitHub or platform secrets.
8. Finish with a pull request description covering what changed, how each scenario is tested, and any owner tasks, then ask the dev for a review. If blocked, say what's blocking.

## Style

- Small diffs, plain code, no speculative abstractions.
- Prefer free tiers and managed services; nothing that needs a server to babysit.
- Never log request bodies or credentials.
