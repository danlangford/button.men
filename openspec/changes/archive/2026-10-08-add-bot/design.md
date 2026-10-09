# Design

## Context

BMAIR ([danlangford/bmai](https://github.com/danlangford/bmai)) publishes `bmair-VERSION-web-release.zip` with each release: a static site whose files sit at the zip root, with relative links, an `index.html`, and scripts and the WebAssembly engine in a content-hashed `app-<hash>/` folder. The release also publishes `SHA256SUMS` covering every asset. button.men is a Cloudflare Worker whose static assets come from `public/`; production deploys `public/` from `main`, and each pull request preview deploys the pull request's own `public/` using `main`'s trusted scripts (`scripts/preview.js`).

## Goals / Non-Goals

**Goals:**
- Serve an exact BMAIR release at `/bot` in production and in every preview.
- Make the deployed release, and any change to it, visible and verifiable in review.
- Keep updates to one command.

**Non-Goals:**
- Building BMAIR here, or modifying its files.
- Linking `/bot` from the main navigation; that is a separate product decision.
- Any server-side component: BMAIR runs in the browser.

## Decisions

- **Commit the release's files under `public/bot/`.** Both deploy paths already publish `public/`, so production and previews serve `/bot` with no workflow change, and a pull request's own preview shows its BMAIR. Fetching the release at deploy time instead would add a network dependency to every deploy, and previews could not show a new release until `main`'s preview script learned to fetch it. The cost is about 300 KB of compressed history per release.
- **`bot.lock.json` records the release, its download URL, the zip's SHA-256, and every file's SHA-256.** `test/bot.test.js` hashes `public/bot/` and requires an exact match, so a hand edit, a stray file, or a partial update fails CI before deploy. The release name and zip checksum let a reviewer check the lock against GitHub.
- **`npm run update-bot -- VERSION` (`scripts/update-bot.js`) does the update.** It downloads the zip and the release's `SHA256SUMS`, refuses a mismatch before touching `public/bot/`, extracts with the system `unzip` (which drops `..` and leading `/` from entry names), rejects anything but plain files, and rewrites the directory and lock together. Node has no built-in zip reader, and `unzip` is present on macOS and GitHub's runners, so no dependency is added.
- **The page's own protections stay as shipped.** Its Content-Security-Policy limits loads to its own origin and allows WebAssembly compilation; the engine has no file or network access. Cloudflare serves assets with `max-age=0, must-revalidate`, and the hashed folder keeps one release's files together, so a redeploy never mixes releases. Observed with `wrangler dev`: `/bot` redirects to `/bot/`, `.wasm` is served as `application/wasm`.
- **ESLint ignores `public/bot/`.** The files are BMAIR's, linted and tested in its repository; the drift test is what guards them here.

## Risks / Trade-offs

- [A future release changes its zip layout] → The update refuses a zip without a root `index.html`, and the browser test runs the page end to end.
- [`unzip` missing on a dev machine] → The update fails with a clear message and changes nothing; only updates need it, not builds or tests.
- [Binary history grows with each release] → Small (about 300 KB per release); a fetch-at-deploy design can replace it later without changing the spec.

## Migration Plan

Merge to deploy. Rollback is a revert, or `npm run update-bot -- <older version>`.

## Open Questions

- Should the main navigation or About page link to `/bot`?
