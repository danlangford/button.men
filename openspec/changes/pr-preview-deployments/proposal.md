# Proposal

## Why

Reviewers currently have to build or imagine proposed changes locally to try them. A temporary site for each pull request makes changes easy to inspect and test while keeping previews out of production.

## What Changes

- Deploy each pull request to a distinct, stable `pr<number>.button.men` preview site.
- Keep a preview available while its pull request is open, and provide automatic and explicit triggers to tear it down after review.
- Use the production Buttonweavers API for previews by default, with deployment-specific configuration for selected non-production endpoints.
- Keep preview hosting within the existing $0 cost constraint.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hosting`: Define the availability, addressing, cleanup lifecycle, and no-cost constraint for pull request preview sites.
- `api-proxy`: Define the default and configurable Buttonweavers API target for preview deployments.

## Impact

Likely affected areas include pull-request deployment automation, preview hostname routing, and API proxy configuration. Production deployment behavior and its API target remain unchanged. The implementation must use a hosting and DNS approach that meets the existing no-cost constraint.

## Suggestions

- Consider Cloudflare first because production already uses it; consider another service only if it better meets the requirements without introducing costs.

