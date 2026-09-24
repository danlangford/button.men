# Design

## Context

buttonweavers exposes a JSON API at `POST /api/responder`, authenticated with cookies (`auth_userid`, `auth_key`, `stay_logged_in` and a PHP session cookie). It sends no CORS headers and its cookies aren't `SameSite=None`, so a browser on button.men can't call it directly. Everything button.men needs therefore goes through a same-origin proxy.

## Goals / Non-Goals

**Goals:**
- $0 hosting with no way to be billed by accident
- A proxy small enough to audit in one sitting
- No build step: plain HTML, CSS and ES modules

**Non-Goals:**
- Playing games on button.men (games open on buttonweavers for now)
- Any server-side state, accounts or analytics

## Decisions

**Cloudflare Workers, free plan.** One Worker serves the static site (Workers static assets) and the proxy at `/api/responder`, on a custom domain. `src/worker.js` is the entry point; the relay is `src/proxy.js`.
- Free plan: 100,000 requests a day, and the proxy's CPU time is about 1 ms per request since waiting on buttonweavers doesn't count. A free account has no payment method, so it *cannot* be billed; past the daily limit, requests fail until the next day. That's the "degrades rather than charges" behaviour.
- DNS and TLS are free once button.men's nameservers point at Cloudflare. Namecheap stays the registrar.
- Deploys are `wrangler deploy` from a GitHub Action on every push to `main`.
- Rejected: AWS (Lambda free tier is fine, but CloudFront and a Route 53 zone add small monthly costs, and a card is on file, so a traffic spike can bill); a home server (needs babysitting, and "your password goes through a box in my house" is a harder trust story).

**Worker runs first for every request** (`run_worker_first`), so it can redirect `http:` to `https:` before serving assets.

**Proxy behaviour.**
- Forwards the body byte-for-byte with the request's `Content-Type`, plus the browser's cookies.
- Adds `User-Agent: button.men-proxy/1.0 (+repo URL)` and `X-Forwarded-For: <CF-Connecting-IP>` so maintainers can identify the traffic and the player.
- Returns the upstream status and body. Every upstream `Set-Cookie` is passed back with `Domain` removed and `Secure; HttpOnly; SameSite=Lax` added, so the buttonweavers session lives only in the player's browser, scoped to button.men.
- No logging, no storage bindings, no observability config: nothing can capture a password.

**UI.** Bootstrap 5.3 from jsDelivr with SRI, for responsive layout and built-in dark mode (`data-bs-theme`). A theme picker (Auto / Light / Dark) is stored in `localStorage`; Auto follows `prefers-color-scheme`. Logic lives in small ES modules under `public/js/` that the tests import directly.

**Replaceable.** `public/js/config.js` holds `API_BASE`. Every request uses `credentials: 'include'`, so switching to direct access is changing that one value once buttonweavers allows button.men.

**Tests.** Node's built-in test runner (`node --test`), no dependencies. Each spec scenario maps to a test; hosting scenarios that can only be checked in production (billing, DNS) are tested through the configuration that guarantees them.

## Risks / Trade-offs

- **Trust:** a new domain asking for buttonweavers passwords looks like phishing. The transparency page and public source help; telling the maintainers first matters more (owner task).
- **Shared IP:** buttonweavers sees Cloudflare IPs. `X-Forwarded-For` carries the player's IP, but buttonweavers doesn't read it today.
- **Separate logins:** logging in on button.men doesn't log the player in on buttonweavers, so the first game they open may ask them to log in there.
- **Usage alerts:** Cloudflare's notification emails are the only "limit reached" signal; there's no server to send our own.
