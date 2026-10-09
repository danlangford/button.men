// Serves the site, redirects http to https, and hands API calls to the proxy.
// Workers only allow handlers as exports here; everything else is in proxy.js
// and bot.js.
import { isBotPath, serveBot } from './bot.js';
import { proxy } from './proxy.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // wrangler dev is plain http; it sets LOCAL_DEV from .dev.vars.
    if (url.protocol === 'http:' && !env.LOCAL_DEV) {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/api/responder') {
      if (request.headers.get('Origin') !== url.origin) {
        return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
      }
      return proxy(request, env.BUTTONWEAVERS_API_ENDPOINT || undefined);
    }
    if (isBotPath(url.pathname)) return serveBot(request, env.ASSETS);
    return env.ASSETS.fetch(request);
  },
};
