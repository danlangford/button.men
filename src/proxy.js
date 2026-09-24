// Relays API calls to buttonweavers.
// Never logs or stores anything: see the api-proxy spec.

export const UPSTREAM = 'https://www.buttonweavers.com/api/responder';
export const USER_AGENT = 'button.men-proxy/1.0 (+https://github.com/danlangford/button.men)';

export async function proxy(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  const headers = {
    'Content-Type': request.headers.get('Content-Type') || 'application/x-www-form-urlencoded',
    'User-Agent': USER_AGENT,
  };
  const cookie = request.headers.get('Cookie');
  if (cookie) headers.Cookie = cookie;
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) headers['X-Forwarded-For'] = ip;

  const upstream = await fetch(UPSTREAM, {
    method: 'POST',
    headers,
    body: await request.text(),
  });

  const out = new Headers({
    'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
    'Cache-Control': 'no-store',
  });
  for (const setCookie of upstream.headers.getSetCookie()) {
    out.append('Set-Cookie', secureCookie(setCookie));
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

// Scope a buttonweavers cookie to button.men and keep it away from scripts.
export function secureCookie(setCookie) {
  const parts = setCookie
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !/^(domain|secure|httponly|samesite)(=|$)/i.test(part));
  return [...parts, 'Secure', 'HttpOnly', 'SameSite=Lax'].join('; ');
}
