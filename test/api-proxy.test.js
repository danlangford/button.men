import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { proxy, secureCookie, UPSTREAM, USER_AGENT } from '../src/proxy.js';
import { callApi } from '../public/js/api.js';
import { API_BASE } from '../public/js/config.js';
import { read, wranglerConfig } from './helpers.js';

let sent;
const realFetch = globalThis.fetch;

function fakeUpstream(body, setCookies = []) {
  globalThis.fetch = async (url, init) => {
    sent = { url, ...init };
    const headers = new Headers({ 'Content-Type': 'application/json' });
    for (const cookie of setCookies) headers.append('Set-Cookie', cookie);
    return new Response(body, { status: 200, headers });
  };
}

function apiRequest(body, headers = {}) {
  return new Request('https://button.men/api/responder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body,
  });
}

beforeEach(() => { sent = undefined; });
afterEach(() => { globalThis.fetch = realFetch; });

test('api-proxy: Any API call - body and response pass through unchanged', async () => {
  const body = JSON.stringify({ type: 'loadActiveGames' });
  const reply = JSON.stringify({ status: 'ok', data: { gameIdArray: [1] } });
  fakeUpstream(reply);
  const response = await worker.fetch(apiRequest(body), {});
  assert.equal(sent.url, UPSTREAM);
  assert.equal(sent.method, 'POST');
  assert.equal(sent.body, body);
  assert.equal(await response.text(), reply);
});

test('api-proxy: only POST is relayed', async () => {
  const response = await proxy(new Request('https://button.men/api/responder'));
  assert.equal(response.status, 405);
});

test('api-proxy: Logging in - nothing is logged or stored', async () => {
  const source = read('src/worker.js') + read('src/proxy.js');
  assert.doesNotMatch(source, /console\./);
  const config = wranglerConfig();
  for (const key of ['kv_namespaces', 'd1_databases', 'r2_buckets', 'durable_objects', 'observability', 'logpush']) {
    assert.equal(config[key], undefined, key);
  }
  fakeUpstream('{"status":"ok"}');
  await worker.fetch(apiRequest('{"type":"login","username":"u","password":"p"}'), {});
  assert.equal(sent.body, '{"type":"login","username":"u","password":"p"}');
});

test('api-proxy: Staying logged in - session cookies live only in the browser, scoped to button.men', async () => {
  fakeUpstream('{}', ['auth_key=abc; expires=Fri, 01-Jan-2027 00:00:00 GMT; path=/', 'PHPSESSID=xyz; path=/; domain=www.buttonweavers.com']);
  const response = await worker.fetch(apiRequest('{}', { Cookie: 'auth_key=abc; PHPSESSID=xyz' }), {});
  assert.equal(sent.headers.Cookie, 'auth_key=abc; PHPSESSID=xyz');
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  for (const cookie of cookies) {
    assert.match(cookie, /; Secure; HttpOnly; SameSite=Lax$/);
    assert.doesNotMatch(cookie, /domain=/i);
  }
});

test('api-proxy: secureCookie replaces existing attributes rather than duplicating them', () => {
  assert.equal(secureCookie('a=1; Path=/; secure; HttpOnly; SameSite=None'), 'a=1; Path=/; Secure; HttpOnly; SameSite=Lax');
});

test('api-proxy: Maintainers read their logs - requests identify button.men and the player IP', async () => {
  fakeUpstream('{}');
  await worker.fetch(apiRequest('{}', { 'CF-Connecting-IP': '203.0.113.7' }), {});
  assert.equal(sent.headers['User-Agent'], USER_AGENT);
  assert.match(USER_AGENT, /button\.men/);
  assert.equal(sent.headers['X-Forwarded-For'], '203.0.113.7');
});

test('api-proxy: Before logging in - the login page links to the transparency page', () => {
  const index = read('public/index.html');
  const loginView = index.slice(index.indexOf('id="login-view"'), index.indexOf('id="games-view"'));
  assert.match(loginView, /href="\/about"/);
  assert.match(read('public/about.html'), /github\.com\/danlangford\/button\.men/);
});

test('api-proxy: Upstream allows direct access - one setting picks where calls go', async () => {
  assert.equal(API_BASE, '/api/responder');
  let request;
  const fetchFn = async (url, init) => { request = { url, ...init }; return new Response('{"status":"ok"}'); };
  await callApi({ type: 'loadPlayerName' }, { base: 'https://www.buttonweavers.com/api/responder', fetchFn });
  assert.equal(request.url, 'https://www.buttonweavers.com/api/responder');
  assert.equal(request.credentials, 'include');
});
