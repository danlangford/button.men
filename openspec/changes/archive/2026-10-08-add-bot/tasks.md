# Tasks

## 1. Release copy

- [x] 1.1 Add `scripts/update-bot.js` and `npm run update-bot`: download a BMAIR web release, verify it against the release's `SHA256SUMS`, and replace `public/bot/` and `bot.lock.json` only when it matches.
- [x] 1.2 Copy BMAIR 0.28.0 into `public/bot/` with the script.
- [x] 1.3 Keep `public/bot/` out of ESLint and serve `.wasm`, `.txt` and `.jsonl` with the right types in the browser fixture server.

## 2. Tests

- [x] 2.1 Open the AI: the page, its scripts and engine are present, and the Worker passes `/bot/` to the static assets.
- [x] 2.2 Preview a pull request: previews deploy the pull request's `public/`, which holds `/bot`.
- [x] 2.3 Ask for a move: a browser test runs a position and sees only same-origin GET requests; the page's policy allows only its own origin.
- [x] 2.4 See what is deployed: the lock names the release, its download URL and checksum, and matches the page's build info.
- [x] 2.5 Served files drift from the release: every file under `public/bot/` matches the lock exactly.
- [x] 2.6 Update to a new release: a verified download replaces the files and lock; a checksum mismatch leaves both untouched.

## 3. Checks

- [x] 3.1 `npm test`, `npm run lint`, `npm run test:browser`, and `openspec validate --all --strict` pass.
