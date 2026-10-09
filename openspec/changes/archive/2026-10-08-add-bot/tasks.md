# Tasks

## 1. Release copy

- [x] 1.1 Add `scripts/update-bot.js` and `npm run update-bot`: install a BMAIR web release only if the release is immutable and its zip matches GitHub's digest and the release's `SHA256SUMS`, then replace `public/bot/` and `bot.lock.json` together.
- [x] 1.2 Add `update-bot.js --verify`, which re-derives `public/bot/` and the lock from the published release, and run it in CI.
- [x] 1.3 Copy BMAIR 0.28.0 into `public/bot/` with the script.
- [x] 1.4 Keep `public/bot/` out of ESLint and byte for byte under `.gitattributes`; serve `.wasm`, `.txt` and `.jsonl` with the right types in the browser fixture server.

## 2. Isolation and cost

- [x] 2.1 Have the Worker add a policy to every `/bot` response that limits connections to `/bot/`, forbids frames and forms, and isolates opened windows.
- [x] 2.2 Cache the content-hashed release folder as immutable.
- [x] 2.3 Apply the same headers, and Cloudflare's `/bot` redirect, in the browser fixture server.

## 3. Tests

- [x] 3.1 Open the AI: everything the page links to is in the release, the Worker passes `/bot/` to the static assets, and a browser opening `/bot` lands on the page showing its version.
- [x] 3.2 Preview a pull request: previews deploy the pull request's whole `public/`, which holds `/bot`.
- [x] 3.3 Ask for a move: a browser test runs a position and sees only GETs, without query strings, of files in the release.
- [x] 3.4 The page reaches for a server: every `/bot` response carries the policy, and in a browser the page can't call the API, fetch the app, frame it, or reach another site.
- [x] 3.5 See what is deployed: the lock names the release, its download URL and checksum, and matches the page's build info.
- [x] 3.6 Served files drift from the release: `public/bot/` matches the lock, and verification rejects an edited page even with a regenerated lock.
- [x] 3.7 Update to another release: a verified release replaces the files and lock; a checksum or digest mismatch, a mutable release, a symlink, a misplaced root, an absolute path or a corrupt zip changes nothing.

## 4. Checks

- [x] 4.1 `npm test`, `npm run lint`, `npm run test:browser`, `update-bot.js --verify`, and `openspec validate --all --strict` pass.
