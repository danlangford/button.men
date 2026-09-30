import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeGames,
  currentPlayer,
  forumBoard,
  forumOverview,
  forumThread,
  login,
  logout,
} from '../public/js/api.js';
import { gameList, gameUrl } from '../public/js/games.js';
import {
  buttonweaversThreadUrl,
  forumThreadUrl,
  renderForumBoard,
  renderForumOverview,
  renderForumThread,
} from '../public/js/forum.js';
import { resolveTheme, saveChoice, storedChoice } from '../public/js/theme.js';
import { filterSpecs, renderSpecs } from '../public/js/specs.js';
import { read } from './helpers.js';

const games = {
  gameIdArray: [11, 22, 33],
  opponentNameArray: ['alice', 'bob', 'carol'],
  myButtonNameArray: ['Avis', 'Bauer', 'Coil'],
  opponentButtonNameArray: ['Hammer', 'Iago', 'Jellybean'],
  nWinsArray: [0, 1, 2],
  nLossesArray: [1, 0, 0],
  nDrawsArray: [0, 0, 1],
  nTargetWinsArray: [3, 3, 3],
  gameDescriptionArray: ['', 'grudge match', ''],
  isAwaitingActionArray: [0, 1, 0],
};

function fakeStorage() {
  const values = {};
  return { getItem: (k) => values[k] ?? null, setItem: (k, v) => { values[k] = v; } };
}

function fakeDocument() {
  const document = {
    createElement(tagName) {
      return {
        tagName,
        ownerDocument: document,
        children: [],
        style: {},
        append(...children) { this.children.push(...children); },
        replaceChildren(...children) { this.children = children; },
        scrollIntoView(options) { this.scrollOptions = options; },
        get textContent() {
          return (this.text || '') + this.children.map((child) => child.textContent).join('');
        },
        set textContent(value) { this.text = String(value); },
      };
    },
  };
  return document;
}

function allElements(element) {
  return [element, ...element.children.flatMap(allElements)];
}

test('web-ui: Narrow screen - pages are responsive', () => {
  for (const page of ['public/index.html', 'public/about.html', 'public/specs.html']) {
    const html = read(page);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    assert.match(html, /bootstrap@5\.3\.\d+\/dist\/css\/bootstrap\.min\.css/);
    assert.doesNotMatch(html, /[^-]width:\s*\d{3,}px/);
  }
});

test('web-ui: Specs - feature list is searchable and reachable from the site', () => {
  const specs = [
    { name: 'api-proxy', content: 'Credentials are never kept.' },
    { name: 'web-ui', content: 'The layout supports dark mode.' },
  ];
  assert.deepEqual(filterSpecs(specs, 'CREDENTIALS'), [specs[0]]);
  assert.deepEqual(filterSpecs(specs, '  '), specs);
  assert.deepEqual(filterSpecs(specs, 'missing'), []);
  assert.match(read('public/index.html'), /href="\/specs\.html">Specs<\/a>/);
  assert.match(read('public/specs.html'), /id="spec-search"/);
  assert.match(read('public/specs.html'), /id="spec-index"/);
});

test('web-ui: Specs - feature links are shareable and spec text is safe', () => {
  const document = fakeDocument();
  const index = document.createElement('nav');
  const list = document.createElement('section');
  const status = document.createElement('p');
  const content = '<img src=x onerror=alert(1)>';
  renderSpecs([{ name: 'api-proxy', content }], index, list, status, document);
  const link = allElements(index).find((element) => element.tagName === 'a');
  const details = allElements(list).find((element) => element.tagName === 'details');
  const pre = allElements(list).find((element) => element.tagName === 'pre');
  assert.equal(link.href, '#spec-api-proxy');
  assert.equal(details.id, 'spec-api-proxy');
  assert.equal(pre.textContent, content);
  assert.deepEqual(pre.children, []);
});

test('web-ui: Device in dark mode - auto follows the device', () => {
  assert.equal(resolveTheme('auto', true), 'dark');
  assert.equal(resolveTheme('auto', false), 'light');
});

test('web-ui: Manual choice - remembered on the device and overrides it', () => {
  const storage = fakeStorage();
  assert.equal(storedChoice(storage), 'auto');
  saveChoice('light', storage);
  assert.equal(storedChoice(storage), 'light');
  assert.equal(resolveTheme(storedChoice(storage), true), 'light');
});

test('web-ui: Correct password - logging in leads to the player\'s games', async () => {
  const calls = [];
  const call = async (args) => {
    calls.push(args);
    if (args.type === 'login') return { status: 'ok' };
    if (args.type === 'loadPlayerName') return { status: 'ok', data: { userName: 'dan' } };
    return { status: 'ok', data: games };
  };
  assert.deepEqual(await login('dan', 'secret', call), { ok: true, message: undefined });
  assert.equal(await currentPlayer(call), 'dan');
  assert.deepEqual((await activeGames(call)).gameIdArray, [11, 22, 33]);
  assert.deepEqual(calls[0], { type: 'login', username: 'dan', password: 'secret', doStayLoggedIn: true });
});

test('web-ui: wrong password - reports the buttonweavers message', async () => {
  const call = async () => ({ status: 'failed', message: 'Login failed.' });
  assert.deepEqual(await login('dan', 'nope', call), { ok: false, message: 'Login failed.' });
  assert.equal(await currentPlayer(async () => ({ status: 'failed', data: null })), null);
});

test('web-ui: Forum reads - request the overview, board, and selected thread', async () => {
  const calls = [];
  const call = async (args) => {
    calls.push(args);
    return { status: 'ok', data: { boards: [], threads: [], posts: [] } };
  };
  await forumOverview(call);
  await forumBoard(8, call);
  await forumThread(19, 27, call);
  assert.deepEqual(calls, [
    { type: 'loadForumOverview' },
    { type: 'loadForumBoard', boardId: 8 },
    { type: 'loadForumThread', threadId: 19, currentPostId: 27 },
  ]);
  await forumThread(20, undefined, call);
  assert.deepEqual(calls[3], { type: 'loadForumThread', threadId: 20 });
  await assert.rejects(
    forumOverview(async () => ({ status: 'failed', message: 'No forum access.' })),
    /No forum access\./,
  );
});

test('web-ui: From the game list - one forum link reaches all boards and marks unread boards', () => {
  const html = read('public/index.html');
  assert.match(html, /<a class="navbar-brand fw-bold" href="#games">button\.men<\/a>/);
  assert.match(html, /<a id="forum-link"[^>]*href="#!"[^>]*hidden/);
  assert.match(html, /<a id="games-link" href="#games"[^>]*hidden>Games<\/a>/);
  assert.match(read('public/js/app.js'), /\$\('forum-link'\)\.hidden = view === 'login'/);
  assert.match(read('public/js/app.js'), /if \(window\.location\.hash\.startsWith\('#!'\)\) \{\s*showForum\(signedInPlayer\)/);

  const document = fakeDocument();
  const container = document.createElement('main');
  renderForumOverview(container, {
    boards: [
      { boardId: 1, boardName: 'Announcements', description: 'News', firstNewPostId: null },
      { boardId: 2, boardName: 'Chat', description: 'Talk', firstNewPostId: 42 },
    ],
  });
  const links = allElements(container).filter((element) => element.tagName === 'a');
  assert.deepEqual(links.map((link) => link.href), ['#!boardId=1', '#!boardId=2']);
  assert.equal(links[0].textContent.includes('New posts'), false);
  assert.equal(links[1].textContent.includes('New posts'), true);
});

test('web-ui: Busy board - threads render latest activity first with an unread-post link', () => {
  const document = fakeDocument();
  const container = document.createElement('main');
  renderForumBoard(container, {
    boardName: 'Chat',
    description: 'Talk',
    threads: [
      { threadId: 1, threadTitle: 'Older', latestPosterName: 'alice', latestLastUpdateTime: 10 },
      {
        threadId: 2,
        threadTitle: 'Latest',
        latestPosterName: 'bob',
        latestLastUpdateTime: 20,
        firstNewPostId: 37,
      },
    ],
  });
  const links = allElements(container).filter((element) => element.tagName === 'a');
  assert.deepEqual(links.slice(1).map((link) => link.children[0].textContent), ['Latest', 'Older']);
  assert.equal(links[1].href, forumThreadUrl(2, 37));
  assert.equal(links[1].textContent.includes('New posts'), true);
});

test('web-ui: Thread with unread posts - ordered posts render and the page scrolls to the first unread', () => {
  const document = fakeDocument();
  const container = document.createElement('main');
  const body = '<img src=x onerror=alert(1)> [b]raw[/b]';
  const target = renderForumThread(container, {
    threadId: 19,
    threadTitle: 'A thread',
    boardId: 4,
    boardName: 'Chat',
    currentPostId: null,
    posts: [
      { postId: 27, posterName: 'bob', creationTime: 20, isNew: true, body },
      { postId: 12, posterName: 'alice', creationTime: 10, isNew: false, body: 'Earlier', deleted: true },
      { postId: 31, posterName: 'carol', creationTime: 30, isNew: true, body: 'Later unread' },
    ],
  });
  const elements = allElements(container);
  const posts = elements.filter((element) => element.tagName === 'article');
  assert.deepEqual(posts.map((post) => post.id), [
    'forum-post-12',
    'forum-post-27',
    'forum-post-31',
  ]);
  assert.equal(target.id, 'forum-post-27');
  assert.deepEqual(target.scrollOptions, { block: 'start' });
  const renderedBody = allElements(target).find((element) => element.className?.includes('forum-post-body'));
  assert.equal(renderedBody.textContent, body);
  assert.deepEqual(renderedBody.children, []);
  const deletedBody = allElements(posts[0]).find((element) => element.className?.includes('forum-post-body'));
  assert.match(deletedBody.className, /text-body-secondary/);
  const author = allElements(target).find((element) => element.tagName === 'strong');
  const time = allElements(target).find((element) => element.tagName === 'time');
  assert.equal(author.textContent, 'bob');
  assert.notEqual(time.dateTime, undefined);
});

test('web-ui: Replying - thread reply link opens the same buttonweavers thread', () => {
  const document = fakeDocument();
  const container = document.createElement('main');
  renderForumThread(container, {
    threadId: 19,
    threadTitle: 'A thread',
    boardId: 4,
    boardName: 'Chat',
    posts: [],
  });
  const reply = allElements(container).find((element) => element.textContent === 'Reply on buttonweavers.com');
  assert.equal(reply.href, buttonweaversThreadUrl(19));
  assert.equal(reply.href, 'https://www.buttonweavers.com/ui/forum.html#!threadId=19');
});

test('web-ui: Navigating to games - a late forum response does not replace the games view', async () => {
  const ids = [
    'theme', 'login-view', 'games-view', 'forum-view', 'player', 'forum-link',
    'games-link', 'logout', 'error', 'forum-content', 'games', 'no-games', 'login-form',
  ];
  const document = fakeDocument();
  const elements = Object.fromEntries(ids.map((id) => [id, document.createElement('div')]));
  for (const element of Object.values(elements)) {
    element.addEventListener = (type, handler) => { element[`on${type}`] = handler; };
  }
  document.documentElement = { dataset: {} };
  document.getElementById = (id) => elements[id];

  const listeners = {};
  const window = {
    location: { hash: '#!' },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener: (type, handler) => { listeners[type] = handler; },
  };
  const original = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  let releaseForum;
  let forumStarted;
  const forumRequested = new Promise((resolve) => { forumStarted = resolve; });
  let gamesStarted;
  const gamesRequested = new Promise((resolve) => { gamesStarted = resolve; });
  globalThis.document = document;
  globalThis.window = window;
  globalThis.localStorage = fakeStorage();
  globalThis.fetch = async (_url, init) => {
    const args = JSON.parse(init.body);
    if (args.type === 'loadPlayerName') {
      return { json: async () => ({ status: 'ok', data: { userName: 'dan' } }) };
    }
    if (args.type === 'loadForumOverview') {
      forumStarted();
      return new Promise((resolve) => {
        releaseForum = () => resolve({ json: async () => ({ status: 'ok', data: { boards: [] } }) });
      });
    }
    if (args.type === 'loadActiveGames') {
      gamesStarted();
      return { json: async () => ({ status: 'ok', data: games }) };
    }
    throw new Error(`Unexpected API call: ${args.type}`);
  };

  try {
    await import(`../public/js/app.js?test=${Date.now()}`);
    await forumRequested;
    window.location.hash = '#games';
    listeners.hashchange();
    await gamesRequested;
    await new Promise((resolve) => setImmediate(resolve));
    releaseForum();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(elements['forum-view'].hidden, true);
    assert.equal(elements['games-view'].hidden, false);
    assert.deepEqual(elements['forum-content'].children, []);
  } finally {
    globalThis.document = original.document;
    globalThis.window = original.window;
    globalThis.localStorage = original.localStorage;
    globalThis.fetch = original.fetch;
  }
});

test('web-ui: Logging out - ends the buttonweavers session', async () => {
  let sent;
  await logout(async (args) => { sent = args; return { status: 'ok' }; });
  assert.deepEqual(sent, { type: 'logout' });
  const app = read('public/js/app.js');
  assert.match(app, /await logout\(\);\s*show\('login'\);/);
});

test('web-ui: Games awaiting a move - listed first, otherwise in buttonweavers order', () => {
  assert.deepEqual(gameList(games).map((g) => g.id), [22, 11, 33]);
  assert.equal(gameList(games)[0].yourTurn, true);
});

test('web-ui: Tapping a game - opens it on buttonweavers', () => {
  assert.equal(gameUrl(22), 'https://www.buttonweavers.com/ui/game.html?game=22');
  assert.deepEqual(gameList(games).map((g) => g.href), [gameUrl(22), gameUrl(11), gameUrl(33)]);
});
