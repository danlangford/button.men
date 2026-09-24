# Working rules for Claude

## Roles

- **Dan owns the specs.** Requirement and scenario text in `openspec/` is his. Don't change it without asking in a PR comment first.
- **Claude owns everything else:** code, tests, infrastructure, CI, and the `design.md` / `tasks.md` artifacts inside a change.
- **Implementation choices are Claude's.** Specs say *what* (e.g. "the site runs for free"); Claude decides *how* (platform, libraries, layout) and records the reasoning in the change's `design.md`. Keep specs implementation-neutral.

## Implementing a spec PR

1. Diff the PR against `main` under `openspec/`. Work out which changes (`openspec/changes/<name>/`) or direct spec edits are in scope.
2. For each change, write `design.md` and `tasks.md` if they're missing (`openspec instructions <artifact> --change <name>`).
3. Implement on the PR's own branch in small, focused commits. Every scenario gets a test.
4. `openspec validate --all --strict` and the test suite must pass.
5. Archive each completed change with `openspec archive <name> -y`, so `openspec/specs/` matches what ships.
6. Anything only Dan can do (accounts, DNS, secrets, payments, approvals) becomes an issue labelled `owner-task`, with exact steps. Link it from the PR. Never ask for secrets in comments; they go in GitHub or platform secrets.
7. Finish with one PR comment: what changed, what's tested, open owner tasks. Add the `ready-for-review` label and mention @danlangford. If blocked, say what's blocking and add `blocked` instead.

## Style

- Small diffs, plain code, no speculative abstractions.
- Prefer free tiers and managed services; nothing that needs a server to babysit.
- Never log request bodies or credentials.
