// /bot serves a BMAIR release on the same origin as the player's session.
// The release's own meta policy allows /api/responder and doesn't reach its
// workers, so the Worker sets the policy that keeps /bot to itself.
const CONTENT_HASHED = /^\/bot\/app-[0-9a-f]+\//;

export const isBotPath = (pathname) => pathname === '/bot' || pathname.startsWith('/bot/');

export function botPolicy(origin) {
  return [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    // Only its own files: no /api/responder, and nowhere else.
    `connect-src ${origin}/bot/`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/** Adds the /bot policy, and long caching for the content-hashed folder, to a response's headers. */
export function botHeaders(url, status, headers) {
  headers.set('Content-Security-Policy', botPolicy(url.origin));
  // A window /bot opens, such as the main app, can't be scripted from it.
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (CONTENT_HASHED.test(url.pathname) && (status === 200 || status === 304)) {
    // Each shard worker loads the engine; cached, they don't spend the Worker's request quota.
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  return headers;
}

export async function serveBot(request, assets) {
  const response = await assets.fetch(request);
  const headers = botHeaders(new URL(request.url), response.status, new Headers(response.headers));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
