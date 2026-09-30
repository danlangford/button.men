# Tasks

## 1. Preview deployment and API target

- [ ] 1.1 Allow the API proxy to receive an endpoint from Worker deployment configuration while retaining the production default; add tests for the default, configured target, and request-body override attempt.
- [ ] 1.2 Add a trusted preview deployment helper and `pull_request_target` workflow that deploys a dedicated Worker and exact PR hostname without running PR scripts/config; add tests for generated configuration and verify the workflow uses base-branch deployment logic.
- [ ] 1.3 Add per-PR API endpoint selection from trusted deployment configuration and verify an unmapped PR defaults to production while mapped PRs remain isolated.

## 2. Preview teardown and inactivity

- [ ] 2.1 Remove a specific preview route and Worker on PR close/merge or authorized manual dispatch; verify cleanup targets only the requested PR.
- [ ] 2.2 Track preview updates and add a daily cleanup for previews without a new commit for 14 days; test expiration, preservation before the deadline, and recreation after a push.

## 3. Integration and verification

- [ ] 3.1 Run `npm test` and `openspec validate pr-preview-deployments --strict`; verify no production deployment or API target behavior changes.

