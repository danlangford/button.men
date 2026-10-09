# Design

## Context

BMAIR ([danlangford/bmai](https://github.com/danlangford/bmai)) publishes `bmair-VERSION-web-release.zip` with each release: a static site whose files sit at the zip root, with relative links, an `index.html`, and scripts and the WebAssembly engine in a content-hashed `app-<hash>/` folder. Its releases are immutable once published, GitHub records a SHA-256 digest for every asset, and each release also publishes `SHA256SUMS`. button.men is a Cloudflare Worker that runs before its static assets (`run_worker_first`) and serves them from `public/`. Production deploys `public/` from `main` once CI passes; each pull request preview deploys the pull request's own `public/` with `main`'s trusted scripts (`scripts/preview.js`).

## Goals / Non-Goals

**Goals:**
- Serve an exact BMAIR release at `/bot` in production and in every preview.
- Prove in CI that `/bot` is that release, not just that it matches a manifest.
- Keep `/bot` away from the player's session, even though it shares the site's origin.
- Keep updates to one command.

**Non-Goals:**
- Building BMAIR here, or modifying its files.
- Any server-side component: BMAIR runs in the browser.

## Decisions

- **Commit the release's files under `public/bot/`.** Both deploy paths already publish `public/`, so production and previews serve `/bot` with no workflow change, and a pull request's own preview shows its BMAIR. Fetching the release at deploy time would add a network dependency to every deploy, and previews could not show a new release until `main`'s preview script learned to fetch it. The cost is about 300 KB of compressed history per release.
- **`bot.lock.json` names the release, its URL, the zip's SHA-256, and every file's SHA-256; CI re-derives all of it.** `npm test` checks `public/bot/` against the lock, which catches an accidental edit offline. On its own that proves nothing about the release, because a lock regenerated after an edit still matches. So CI runs `node scripts/update-bot.js --verify`: it requires the release to be immutable, downloads the zip, requires its SHA-256 to equal GitHub's recorded digest, the release's `SHA256SUMS` entry and the lock, extracts it, and requires both the lock's file list and `public/bot/` to be exactly its contents. Deploys wait for CI, so production can't serve anything else. Previews deploy without waiting for CI, as they always have.
- **`npm run update-bot -- VERSION` (`scripts/update-bot.js`) installs a release with the same checks.** Nothing under `public/bot/` changes until every check passes. It extracts with the system `unzip`, which drops `..` from entry names and fails on absolute ones. The updater treats any `unzip` warning as a failure, rejects anything but plain files (so no symlinks), and requires `index.html` at the root. Node has no built-in zip reader, and `unzip` ships with macOS and GitHub's runners, so no dependency is added. Committed fixture zips in `test/fixtures/bot/` exercise each rejection.
- **The Worker, not the release, sets `/bot`'s security policy.** `/bot` shares the origin of the main app: same-origin requests carry the player's session cookie, and the `/api/responder` Origin check only stops other sites. The release's own meta policy allows same-origin requests and doesn't apply to its module workers, which take policy only from their own response headers. `src/bot.js` therefore adds headers to every `/bot` response, workers included:
  - Every fetch directive, `connect-src` included, is limited to `/bot/`. Neither the page nor its workers can call `/api/responder`, fetch other pages, contact other sites, or start a worker from the app's scripts, which carry no policy of their own.
  - `frame-src 'none'` keeps it from framing and scripting the main app.
  - `Cross-Origin-Opener-Policy: same-origin` cuts its access to a window it opens, once that window loads a page that doesn't send the same policy. A test keeps the main app from sending it; if the app ever needs it, `/bot` needs a separate origin.
  - `form-action`, `base-uri` and `object-src` are closed, and `frame-ancestors 'none'` stops others framing it.

  Headers aren't files, so the release stays unmodified. The browser fixture server applies the same headers, and a browser test shows the page can't reach the API, the app, or another site.
- **What `/bot` could still do, if a hostile release got past verification and review:** it can't read the session cookie, which is HttpOnly, or make requests with it. But a policy doesn't govern everything a same-origin page can do:
  - It can write cookies. A cookie set for `path=/api/responder` is sent ahead of the session's, so the app's next API call could carry another account's credentials, signing the visitor out or in as someone else.
  - It can navigate its own tab, or open windows, to another site with data in the address.
  - It can read and write `localStorage`, which holds only the theme choice.

  A separate origin such as `bot.button.men` removes all three, at the cost of the `/bot` address. A smaller mitigation for the cookie case: have the proxy forward only the last cookie of each name, since browsers send the session's `path=/` cookie last.
- **Cache the content-hashed folder for good.** Every request passes through the Worker and counts toward the free plan's 100,000 a day. A gauntlet starts one worker per core, and each loads the engine's three files; revalidating them costs about three requests per core per gauntlet, 63 for a page load and gauntlet on 18 cores. `/bot/app-<hash>/` is named for its contents, so the Worker marks successful responses there `immutable` for a year. Under `wrangler dev`, a cold page load plus a gauntlet on 18 workers then took 10 requests, and further gauntlets none. That is about the cost of an ordinary visit, inside the free allowance the hosting spec relies on.
- **ESLint ignores `public/bot/`, and `.gitattributes` keeps it byte for byte.** The files are BMAIR's, linted and tested in its repository. Line-ending conversion on a Windows clone would otherwise change them.

## Risks / Trade-offs

- [`SHA256SUMS` and the digest prove the download is what the release published, not who built it] → The release must be immutable and was published by bmai's release workflow. Build-provenance attestations in bmai, checked here with `gh attestation verify`, would tie the zip to a workflow run and commit.
- [A tab left open across an update can't start gauntlet workers, because the previous `app-<hash>/` folder is gone] → Reloading fixes it. Files the visitor already has stay cached, so only an uncached file fails.
- [`unzip` missing on a dev machine] → The updater and its tests fail with "unzip is needed to extract …". Building, serving and the other tests don't need it.
- [Binary history grows with each release] → Small, about 300 KB per release. A fetch-at-deploy design can replace it later without changing the spec.

## Migration Plan

Merge to deploy. Rollback is a revert, or `npm run update-bot -- <older version>`.

## Open Questions

- Would a separate origin for the AI (for example `bot.button.men`) be worth giving up the `/bot` address? It is the only complete isolation from the session, its cookies, and the main app's windows.
