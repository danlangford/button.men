// Serves the site, redirects http to https, and hands API calls to the proxy.
// Workers only allow handlers as exports here; everything else is in proxy.js.
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
      return proxy(request);
    }
    return env.ASSETS.fetch(request);
  },
};
