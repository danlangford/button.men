# Design

## Context

Production is a Cloudflare Worker serving static assets and forwarding `/api/responder` to a fixed Buttonweavers URL. The existing deploy workflow runs on `main` and uses Cloudflare credentials. Pull request previews must have separate Worker deployments, stable pull-request hostnames, and independently configured API endpoints, while preserving the $0 hosting constraint.

## Goals / Non-Goals

**Goals:**

- Deploy one Cloudflare Worker and exact route per pull request.
- Keep Cloudflare credentials out of workflows that execute code from pull request branches.
- Remove previews on PR closure/merge, after 14 days without a new commit, or on an authorized manual request.
- Let a new commit recreate an expired preview.

**Non-Goals:**

- Automatically test or validate arbitrary PR code before it is deployed.
- Run PR-provided build scripts, package scripts, or Wrangler configuration.
- Add paid Cloudflare products or dependencies.

## Decisions

### Use a trusted `pull_request_target` workflow

The preview workflow will be defined on the base branch and triggered by `pull_request_target`. It will check out the base revision for the workflow and deployment helper, and separately check out the PR head into a data-only directory. The workflow will not run `npm install`, `npm ci`, package scripts, or use the PR's `wrangler.jsonc`; a trusted helper will generate the Wrangler configuration and use only the PR Worker entrypoint and static assets as deployment input. Wrangler bundles and uploads that input but does not execute the deployed Worker on the runner. Cloudflare credentials will be exposed only to the trusted deployment or cleanup step, never to a workflow running PR-branch code.

Cloudflare Git integration was considered. It avoids passing a Cloudflare token through GitHub Actions, but the chosen workflow makes the required exact `pr<number>.button.men` route, per-preview API target, inactivity cleanup, and explicit teardown behavior directly manageable. The workflow's trust boundary is deliberately independent of PR scripts and configuration.

### Give each PR its own Worker and route

Use a deterministic Worker name (`button-men-pr-<number>`) and route (`pr<number>.button.men/*`). A trusted config generator supplies the entrypoint, assets path, route, compatibility date, and optional endpoint variable to Wrangler. A single proxied wildcard DNS record provides DNS coverage; exact Worker routes select the matching preview. Cleanup removes the exact route before deleting the Worker so a dangling route cannot remain.

### Track inactivity with GitHub Deployments

Create a GitHub Deployment for each preview update, with an environment name derived from the PR number, and record success/failure status. A daily trusted workflow checks open PRs and their latest deployment creation time. After 14 days without a new preview deployment, it removes the Worker and route and marks the latest deployment inactive. A subsequent PR push creates a new deployment and recreates the preview. Closing or merging a PR invokes the same cleanup path; `workflow_dispatch` provides explicit maintainer teardown.

### Configure API targets per preview

The Worker proxy will continue to use the production endpoint when no deployment variable is set. A GitHub repository variable named `PREVIEW_API_TARGETS` may contain a JSON object mapping PR numbers to non-production Buttonweavers responder URLs. The trusted helper selects only the entry matching the current PR and injects it as a Worker variable. Requests cannot select or override the endpoint. An absent mapping leaves that preview on production, and does not affect any other preview or production.

### Adopt Cloudflare; no paid services

Adopt the proposal's Cloudflare suggestion because the production site already runs there and Worker routes can provide the requested hostnames. Use only existing free-plan Worker/static asset and DNS capabilities. If free-plan limits prevent a preview, the deployment fails without upgrading or incurring charges.

## Risks / Trade-offs

- [A `pull_request_target` workflow has access to secrets] → Keep its definition and helper on the base branch; do not execute PR-provided scripts/config; scope permissions and environment secrets to deployment/cleanup steps.
- [PR code is still untrusted when deployed and served] → Expose no deployment credentials or secrets to the Worker runtime, and make clear that previews are for review rather than trusted production use.
- [Wildcard DNS and exact route configuration require one-time owner setup] → Document the DNS record and token permissions; test one PR preview before relying on automation.
- [Free-plan concurrency or route quotas may be reached] → Do not add billing; report deployment failure and remove only the affected PR's route/Worker.

## Migration Plan

1. The owner configures the Cloudflare zone, wildcard DNS, and GitHub `preview` environment credentials.
2. Merge the trusted preview workflow and helper, then open a test PR to confirm the custom hostname, API target, and cleanup.
3. Existing production deployment remains unchanged. Roll back by disabling the preview workflow and removing preview routes/Workers; do not change the production Worker.

## Owner Setup

- In Cloudflare, ensure `button.men` is an active zone and create one proxied wildcard DNS record for `*.button.men` pointing to a non-production placeholder origin. The Worker routes intercept configured PR hosts.
- Create a Cloudflare API token with the minimum required account Worker script edit and zone Worker route edit permissions for the `button.men` zone. Do not use a token with unrelated account permissions.
- In GitHub, create a `preview` environment, restrict its deployment branch to `main`, and add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_ZONE_ID` environment secrets. Do not make these repository-wide secrets.
- Optionally add the repository variable `PREVIEW_API_TARGETS` as a JSON object such as `{"123":"https://staging.example/api/responder"}`. Only maintainers should edit this setting.

