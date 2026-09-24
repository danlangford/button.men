# Tasks

## 1. Hosting

- [x] 1.1 Worker with static assets and custom domain in `wrangler.jsonc`
- [x] 1.2 Redirect `http:` to `https:` in the Worker
- [x] 1.3 Deploy workflow on push to `main`, skipping when Cloudflare secrets are missing
- [x] 1.4 Owner tasks for the Cloudflare account, nameservers, API token and usage alerts

## 2. API proxy

- [x] 2.1 Forward `POST /api/responder` unchanged, rejecting other methods
- [x] 2.2 Relay cookies with `Secure; HttpOnly; SameSite=Lax`, no logging or storage
- [x] 2.3 Identify requests with `User-Agent` and `X-Forwarded-For`
- [x] 2.4 Transparency page linked from the login page
- [x] 2.5 Single `API_BASE` setting

## 3. Web UI

- [x] 3.1 Responsive layout with Bootstrap 5.3
- [x] 3.2 Theme picker: Auto / Light / Dark, remembered per device
- [x] 3.3 Log in and out
- [x] 3.4 Game list, games waiting on the player first
- [x] 3.5 Games open on buttonweavers

## 4. Tests

- [x] 4.1 One test per scenario with `node --test`
