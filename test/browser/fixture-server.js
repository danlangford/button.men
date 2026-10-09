// A minimal static file + stubbed API server for Playwright smoke tests.
// It serves public/ exactly like the Cloudflare Worker's static assets, and
// answers /api/responder with canned, deterministic fixtures instead of
// talking to buttonweavers, so browser tests never need real accounts or
// network access to buttonweavers.com.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { botHeaders, isBotPath } from '../../src/bot.js';

const root = fileURLToPath(new URL('../../public/', import.meta.url));
const port = Number(process.env.PORT) || 4173;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.jsonl': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

// Scripted buttonweavers responses, keyed by API call type, for the
// journeys the smoke suite exercises. Anonymous visitors (no cookie) are
// always "not logged in"; any login attempt fails, matching a reliable,
// repeatable wrong-password scenario.
function apiResponse(args) {
  if (args.type === 'loadPlayerName') return { status: 'failed', message: 'Not logged in.', data: null };
  if (args.type === 'login') return { status: 'failed', message: 'That username and password do not match.' };
  return { status: 'failed', message: `No fixture for ${args.type}` };
}

// Like the Worker, /bot responses carry the policy that keeps the AI to itself.
function headersFor(req, status, headers) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (!isBotPath(url.pathname)) return headers;
  return Object.fromEntries(botHeaders(url, status, new Headers(headers)));
}

async function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  // Cloudflare's assets redirect a folder without its slash, which relative links rely on.
  if (pathname === '/bot') {
    res.writeHead(307, headersFor(req, 307, { Location: '/bot/' })).end();
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, headersFor(req, 200, { 'Content-Type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream' }));
    res.end(body);
  } catch {
    // Pages like /about have no extension in their links; the main app is
    // a single page, so unknown routes fall back to index.html.
    if (extname(pathname)) {
      res.writeHead(404).end('Not found');
      return;
    }
    const fallback = await readFile(join(root, `${pathname}.html`)).catch(() => readFile(join(root, 'index.html')));
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES['.html'] }).end(fallback);
  }
}

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/responder') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const args = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(apiResponse(args)));
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Fixture server listening on http://127.0.0.1:${port}`);
});
