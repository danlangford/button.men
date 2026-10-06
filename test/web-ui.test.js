import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeGames,
  ApiError,
  callApi,
  currentPlayer,
  gameData,
  forumBoard,
  forumOverview,
  forumThread,
  login,
  logout,
  playerPreferences,
  playerProfile,
  recentPlayerGames,
  searchGameHistory,
  savePlayerInfo,
} from '../public/js/api.js';
import { gameList, gameUrl, gameViewUrl } from '../public/js/games.js';
import { renderGameView } from '../public/js/game-view.js';
import { buildPreferenceSaveArgs, profileUrl, renderProfile } from '../public/js/profile.js';
import {
  buttonweaversThreadUrl,
  forumThreadUrl,
  renderForumBoard,
  renderForumOverview,
  renderForumThread,
} from '../public/js/forum.js';
import {
  applyParamsToForm,
  dayEndTimestamp,
  dayStartTimestamp,
  PAGE_SIZE,
  pageParams,
  paramsFromForm,
  renderSearchResults,
  searchArgsFromParams,
  sortParams,
  winnerLabel,
} from '../public/js/search.js';
import { initThemeControl, resolveTheme, saveChoice, storedChoice } from '../public/js/theme.js';
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
        attributes: {},
        append(...children) { this.children.push(...children); },
        replaceChildren(...children) { this.children = children; },
        scrollIntoView(options) { this.scrollOptions = options; },
        setAttribute(name, value) { this.attributes[name] = String(value); },
        getAttribute(name) { return this.attributes[name] ?? null; },
        addEventListener(type, handler) { this[`on${type}`] = handler; },
        get textContent() {
          return (this.text || '') + this.children.map((child) => child.textContent).join('');
        },
        set textContent(value) { this.text = String(value); },
      };
    },
  };
  return document;
}

function fakeForm(values = {}) {
  const current = { ...values };
  return {
    elements: {
      namedItem(name) {
        if (!(name in current)) current[name] = '';
        return {
          get value() { return current[name]; },
          set value(value) { current[name] = value; },
        };
      },
    },
  };
}

function allElements(element) {
  return [element, ...element.children.flatMap(allElements)];
}

test('web-ui: Narrow screen - pages are responsive', () => {
  for (const page of ['public/index.html', 'public/about.html']) {
    const html = read(page);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    assert.match(html, /bootstrap@5\.3\.\d+\/dist\/css\/bootstrap\.min\.css/);
    assert.doesNotMatch(html, /[^-]width:\s*\d{3,}px/);
  }

  const html = read('public/index.html');
  assert.match(html, /@media \(max-width: 575\.98px\)/);
  assert.match(html, /game-play-area \{[\s\S]*?height: calc\(100dvh - 8rem\);/);
  assert.match(html, /game-play-area \{[\s\S]*?display: flex;/);
  assert.match(html, /flex-direction: column;/);
  assert.match(html, /game-die-captured \{ opacity: \.45; filter: grayscale\(1\); \}/);
  assert.match(html, /game-die-captured \.game-die-value \{ text-decoration: line-through; \}/);
  assert.match(html, /game-3d-board \{[\s\S]*?flex: 1 1 auto;/);
  assert.match(html, /@media \(max-height: 700px\)/);
  assert.match(html, /background: rgb\(13 24 22 \/ 98%\);/);
  assert.match(html, /game-hud-pill \{/);
  assert.match(html, /class="navbar-controls d-flex flex-wrap align-items-center gap-2 ms-auto"/);
  assert.match(html, /class="navbar-player text-body-secondary"/);
  assert.match(html, /main \{ min-width: 0; overflow-wrap: anywhere; \}/);
});

test('web-ui: Device in dark mode - auto follows the device', () => {
  assert.equal(resolveTheme('auto', true), 'dark');
  assert.equal(resolveTheme('auto', false), 'light');
});

test('web-ui: Every page - shares the attribution footer and gives thanks to ButtonWeavers', () => {
  for (const page of ['public/index.html', 'public/about.html', 'public/specs/index.html']) {
    const html = read(page);
    assert.match(html, /<footer\b/, `${page} has a footer`);
    assert.match(html, /Button Men/, `${page} identifies Button Men`);
    assert.match(html, /ButtonWeavers\.com/, `${page} thanks ButtonWeavers`);
    assert.match(html, /not affiliated with or endorsed by/, `${page} avoids implying endorsement`);
  }
});

test('web-ui: Pages available without login - share site navigation and a theme control', () => {
  for (const page of ['public/about.html', 'public/specs/index.html']) {
    const html = read(page);
    assert.match(html, /href="\/#games"/, `${page} links to games`);
    assert.match(html, /href="\/#!"/, `${page} links to the forum`);
    assert.match(html, /href="\/#search"/, `${page} links to search`);
    assert.match(html, /href="\/#profile"/, `${page} links to the signed-in player's profile`);
    assert.match(html, /id="theme"/, `${page} has a theme control`);
  }
});

test('web-ui: Manual choice - remembered on the device and overrides it', () => {
  const storage = fakeStorage();
  assert.equal(storedChoice(storage), 'auto');
  saveChoice('light', storage);
  assert.equal(storedChoice(storage), 'light');
  assert.equal(resolveTheme(storedChoice(storage), true), 'light');
});

test('web-ui: Shared theme control - selecting a theme updates the saved choice and the page immediately', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = fakeStorage();
  try {
    const root = { dataset: {} };
    const listeners = {};
    const select = {
      value: '',
      addEventListener(type, handler) { listeners[type] = handler; },
    };
    const media = { matches: true, addEventListener() {} };
    initThemeControl(select, { root, media });
    assert.equal(select.value, 'auto');
    assert.equal(root.dataset.bsTheme, 'dark');

    select.value = 'light';
    listeners.change({ target: select });
    assert.equal(root.dataset.bsTheme, 'light');
    assert.equal(storedChoice(), 'light');
  } finally {
    globalThis.localStorage = original;
  }
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

test('web-ui: Login request fails - a network error is caught and reported, not thrown', async () => {
  const call = async () => { throw new ApiError('Could not reach buttonweavers. Check your connection and try again.', 'network'); };
  assert.deepEqual(
    await login('dan', 'secret', call),
    { ok: false, message: 'Could not reach buttonweavers. Check your connection and try again.' },
  );
});

test('web-ui: Checking who is logged in - a failed request is treated as signed out rather than thrown', async () => {
  const call = async () => { throw new ApiError('network failure', 'network'); };
  assert.equal(await currentPlayer(call), null);
});

test('web-ui: callApi - a fetch rejection becomes a safe network ApiError', async () => {
  const fetchFn = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    callApi({ type: 'loadPlayerName' }, { fetchFn }),
    (error) => error instanceof ApiError && error.kind === 'network',
  );
});

test('web-ui: callApi - an unsuccessful HTTP response becomes a safe ApiError', async () => {
  const fetchFn = async () => ({ ok: false, json: async () => ({ error: 'internal detail' }) });
  await assert.rejects(
    callApi({ type: 'loadPlayerName' }, { fetchFn }),
    (error) => error instanceof ApiError && error.kind === 'http' && !error.message.includes('internal detail'),
  );
});

test('web-ui: callApi - a response that is not valid JSON becomes a safe ApiError', async () => {
  const fetchFn = async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <'); } });
  await assert.rejects(
    callApi({ type: 'loadPlayerName' }, { fetchFn }),
    (error) => error instanceof ApiError && error.kind === 'invalid-json',
  );
});

test('web-ui: callApi - a mock response without an ok flag still succeeds', async () => {
  const fetchFn = async () => ({ json: async () => ({ status: 'ok' }) });
  assert.deepEqual(await callApi({ type: 'loadPlayerName' }, { fetchFn }), { status: 'ok' });
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
  assert.match(read('public/js/app.js'), /if \(window\.location\.hash\.startsWith\('#!'\)\) return 'forum'/);
  assert.match(read('public/js/app.js'), /showView\(currentView\(\), signedInPlayer\)/);

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
    'theme', 'login-view', 'games-view', 'forum-view', 'search-view', 'profile-view', 'player',
    'forum-link', 'search-link', 'games-link', 'profile-link', 'logout', 'error', 'forum-content',
    'profile-content', 'search-form', 'search-results', 'games', 'no-games', 'login-form',
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

test('web-ui: Tapping a game - opens the button.men game view', () => {
  assert.equal(gameUrl(22), 'https://www.buttonweavers.com/ui/game.html?game=22');
  assert.deepEqual(gameList(games).map((g) => g.href), [gameViewUrl(22), gameViewUrl(11), gameViewUrl(33)]);
});

test('web-ui: Game data - loads a game by numeric id', async () => {
  let request;
  const data = { gameId: 22 };
  assert.deepEqual(await gameData('22', async (args) => {
    request = args;
    return { status: 'ok', data };
  }), data);
  assert.deepEqual(request, { type: 'loadGameData', game: 22 });
});

test('web-ui: Game view - renders players, dice, orientation, and filtered activity', () => {
  const document = fakeDocument();
  const root = document.createElement('main');
  renderGameView(root, {
    gameId: 22,
    gameState: 'ACTIVE',
    maxWins: 3,
    currentPlayerIdx: 1,
    activePlayerIdx: 1,
    playerWithInitiativeIdx: 0,
    playerDataArray: [
      {
        playerName: 'alice',
        button: { name: 'Avis', recipe: '1234' },
        roundScore: 2,
        sideScore: 3,
        gameScoreArray: { W: 2, L: 1, D: 0 },
        activeDieArray: [{ value: 4, recipe: 6, skillArray: ['Poison'], statusArray: ['attacker'] }],
        capturedDieArray: [
          { value: 3, recipe: 4, properties: ['WasJustCaptured'] },
          { value: 1, recipe: 6, properties: [] },
        ],
        isChatPrivate: false,
      },
      {
        playerName: 'dan',
        button: { name: 'Bauer', recipe: '6789' },
        roundScore: 1,
        sideScore: 4,
        activeDieArray: [{ value: 2, recipe: 8 }],
        isChatPrivate: false,
      },
    ],
    gameActionLog: [{ timestamp: 2, player: 'alice', message: 'attacked' }],
    gameChatLog: [{ timestamp: 1, player: 'dan', message: 'hello' }],
  });
  assert.match(root.textContent, /alice/);
  assert.match(root.textContent, /Score: 2 \(\+3 sides\) · W\/L\/T: 2\/1\/0 \(3\)/);
  assert.match(root.textContent, /Poison/);
  assert.doesNotMatch(root.textContent, /WasJustCaptured/);
  assert.match(root.textContent, /hello/);
  assert.doesNotMatch(root.textContent, /attacked/);
  assert.doesNotMatch(root.textContent, /small d-block text-body-secondary/);
  const canvas = allElements(root).find((element) => element.className === 'game-3d-board');
  assert.ok(canvas);
  assert.equal(canvas.getAttribute('aria-hidden'), 'true');
  const status = allElements(root).find((element) => element.tagName === 'small' && element.textContent === 'attacker');
  assert.ok(status);
  const board = allElements(root).find((element) => element.className === 'game-board');
  assert.equal(board.hidden, true);
  assert.match(board.children[0].textContent, /alice/);
  assert.match(board.children[1].textContent, /dan/);
  const aliceDice = board.children[0].children.find((element) => element.className?.startsWith('game-dice '));
  assert.equal(aliceDice.children.length, 2);
  const recentlyCaptured = aliceDice.children.find((element) => element.className.includes('game-die-captured'));
  assert.match(recentlyCaptured.textContent, /3/);
  assert.equal(recentlyCaptured.getAttribute('aria-disabled'), 'true');
  assert.doesNotMatch(aliceDice.textContent, /1/);
  const playArea = allElements(root).find((element) => element.className === 'game-play-area');
  assert.equal(playArea.children[0].className, 'game-3d-hud game-3d-hud-top');
  assert.equal(playArea.children[1], canvas);
  assert.equal(playArea.children[2].className, 'game-3d-hud game-3d-hud-bottom');
  const hud = allElements(root).filter((element) => element.className?.startsWith('game-3d-hud '));
  assert.equal(hud.length, 2);
  const hudPills = allElements(root).filter((element) => element.className === 'game-hud-pill');
  assert.ok(hudPills.length >= 3);
  assert.ok(hudPills.some((element) => element.textContent === '4·d6 · Skills: Poison · Status: attacker'));
  assert.ok(hudPills.some((element) => element.textContent === '3·d4'));
  assert.match(hud.map((element) => element.textContent).join(' '), /Score: 2 \(\+3 sides\) · W\/L\/T: 2\/1\/0 \(3\)/);
  assert.match(hud.map((element) => element.textContent).join(' '), /Status: attacker/);
  const toggle = allElements(root).find((element) => element.textContent === 'Show flat game state');
  toggle.onclick();
  assert.equal(allElements(root).find((element) => element.className === 'game-play-area').hidden, true);
  assert.equal(board.hidden, false);
  assert.equal(toggle.textContent, 'Show 3D game view');
  toggle.onclick();
  assert.equal(allElements(root).find((element) => element.className === 'game-play-area').hidden, false);
  assert.equal(board.hidden, true);
  const flip = allElements(root).find((element) => element.textContent === 'Flip orientation');
  assert.ok(flip);
  flip.onclick();
  assert.match(board.children[0].textContent, /dan/);
  assert.match(board.children[1].textContent, /alice/);
  const all = allElements(root).find((element) => element.textContent === 'Chat & Game Log');
  assert.ok(all);
  all.onclick();
  assert.match(root.textContent, /attacked/);
  const events = allElements(root).filter((element) => element.className?.startsWith('game-event '));
  assert.match(events[0].textContent, /attacked/);
  assert.match(events[1].textContent, /hello/);
  assert.ok(allElements(root).some((element) => element.textContent === 'Chat'));
  assert.ok(allElements(root).some((element) => element.textContent === 'Game Log'));
});

test('web-ui: Reach game search - one search link and nav wiring reach the search view', () => {
  const html = read('public/index.html');
  assert.match(html, /<a id="search-link" href="#search"[^>]*hidden>Search<\/a>/);
  assert.match(read('public/js/app.js'), /\$\('search-link'\)\.hidden = view === 'login'/);
  assert.match(read('public/js/app.js'), /if \(window\.location\.hash\.startsWith\('#search'\)\) return 'search'/);
});

test('web-ui: Search reads - request the sort, page and given filters', async () => {
  const calls = [];
  const call = async (args) => {
    calls.push(args);
    return { status: 'ok', data: { games: [], summary: { matchesFound: 0 } } };
  };
  await searchGameHistory(
    { sortColumn: 'lastMove', sortDirection: 'DESC', numberOfResults: PAGE_SIZE, page: 1, playerNameA: 'alice' },
    call,
  );
  assert.deepEqual(calls, [{
    type: 'searchGameHistory',
    sortColumn: 'lastMove',
    sortDirection: 'DESC',
    numberOfResults: PAGE_SIZE,
    page: 1,
    playerNameA: 'alice',
  }]);
  await assert.rejects(
    searchGameHistory({}, async () => ({ status: 'failed', message: 'Game search failed.' })),
    /Game search failed\./,
  );
});

test('web-ui: Profile API - loads public profiles, handles missing players and reports errors', async () => {
  const profile = { name_ingame: 'alice', email: null, n_games_won: 5 };
  let request;
  assert.deepEqual(await playerProfile('alice', async (args) => {
    request = args;
    return { status: 'ok', data: { profile_info: profile } };
  }), profile);
  assert.deepEqual(request, { type: 'loadProfileInfo', playerName: 'alice' });
  assert.equal(await playerProfile('nobody', async () => ({
    status: 'failed', message: 'Player name does not exist.',
  })), null);
  await assert.rejects(
    playerProfile('alice', async () => ({ status: 'failed', message: 'Profile unavailable.' })),
    /Profile unavailable\./,
  );
});

test('web-ui: Preference API - loads private preferences and submits saves with upstream messages', async () => {
  const prefs = { email: 'alice@example.test', autoaccept: true };
  let request;
  assert.deepEqual(await playerPreferences(async (args) => {
    request = args;
    return { status: 'ok', data: { user_prefs: prefs } };
  }), prefs);
  assert.deepEqual(request, { type: 'loadPlayerInfo' });
  await assert.rejects(
    playerPreferences(async () => ({ status: 'failed', message: 'Login required.' })),
    /Login required\./,
  );

  assert.deepEqual(await savePlayerInfo({ name_irl: 'Alice' }, async (args) => {
    request = args;
    return { status: 'ok', message: 'Saved.' };
  }), { ok: true, message: 'Saved.' });
  assert.deepEqual(request, { type: 'savePlayerInfo', name_irl: 'Alice' });
  assert.deepEqual(await savePlayerInfo({}, async () => ({
    status: 'failed', message: 'Current password is incorrect.',
  })), { ok: false, message: 'Current password is incorrect.' });
});

test('web-ui: Recent profile games - search completed games newest first', async () => {
  const games = [{ gameId: 12 }, { gameId: 9 }];
  let request;
  assert.deepEqual(await recentPlayerGames('alice', async (args) => {
    request = args;
    return { status: 'ok', data: { games } };
  }), games);
  assert.deepEqual(request, {
    type: 'searchGameHistory',
    playerNameA: 'alice',
    status: 'COMPLETE',
    sortColumn: 'lastMove',
    sortDirection: 'DESC',
    numberOfResults: 5,
    page: 1,
  });
  await assert.rejects(
    recentPlayerGames('alice', async () => ({ status: 'failed', message: 'History unavailable.' })),
    /History unavailable\./,
  );
});

test('web-ui: Public profile - shows public fields, statistics and linked recent games safely', () => {
  const document = fakeDocument();
  const container = document.createElement('main');
  const unsafeComment = '<img src=x onerror=alert(1)>';
  renderProfile(container, {
    name_ingame: 'alice',
    name_irl: 'Alice',
    email: null,
    comment: unsafeComment,
    n_games_won: 4,
    n_games_lost: 2,
  }, {
    games: [{
      gameId: 22,
      playerNameA: 'alice',
      playerNameB: 'bob',
      status: 'COMPLETE',
      lastMove: 1760000000,
    }],
  });
  assert.match(container.textContent, /Alice/);
  assert.match(container.textContent, /4 wins · 2 losses/);
  assert.match(container.textContent, new RegExp(unsafeComment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(allElements(container).some((element) => element.tagName === 'img' && element.textContent === unsafeComment), false);
  assert.equal(container.textContent.includes('alice@example.test'), false);
  const links = allElements(container).filter((element) => element.tagName === 'a');
  assert.ok(links.some((element) => element.textContent === 'Game 22' && element.href === '#game?gameId=22'));
  assert.ok(links.some((element) => element.textContent === 'bob' && element.href === profileUrl('bob')));
});

test('web-ui: Own profile - shows preferences privately and reports missing players or games', () => {
  const document = fakeDocument();
  const container = document.createElement('main');
  const preferences = {
    email: 'alice@example.test',
    name_irl: 'Alice',
    dob_month: 1,
    dob_day: 2,
    is_email_public: false,
    pronouns: 'she/her',
    uses_gravatar: true,
    image_size: 100,
    favorite_button: 'Avis',
    favorite_buttonset: 'Classic',
    homepage: 'https://example.test',
    comment: 'Hello',
    vacation_message: '',
    autoaccept: true,
    autopass: false,
    fire_overshooting: false,
    monitor_redirects_to_game: true,
    monitor_redirects_to_forum: false,
    automatically_monitor: false,
    player_color: '#dd99dd',
    opponent_color: '#ddffdd',
    neutral_color_a: '#cccccc',
    neutral_color_b: '#dddddd',
    die_background: 'circle',
  };
  renderProfile(container, {
    name_ingame: 'alice',
    email: null,
    uses_gravatar: true,
    email_hash: '0123456789abcdef0123456789abcdef',
    image_size: 100,
  }, {
    isOwn: true,
    preferences,
  });
  assert.match(container.textContent, /Preferences/);
  assert.equal(
    allElements(container).find((element) => element.tagName === 'input' && element.name === 'email')?.value,
    'alice@example.test',
  );
  assert.equal(
    allElements(container).find((element) => element.tagName === 'img')?.src,
    'https://www.gravatar.com/avatar/0123456789abcdef0123456789abcdef?s=100',
  );

  const other = document.createElement('main');
  renderProfile(other, { name_ingame: 'bob', email: null }, { preferences });
  assert.doesNotMatch(other.textContent, /Preferences/);
  assert.equal(allElements(other).some((element) => element.value === 'alice@example.test'), false);
  assert.match(other.textContent, /No completed games\./);

  const missing = document.createElement('main');
  renderProfile(missing, null);
  assert.equal(missing.textContent, 'Player not found.');
});

test('web-ui: Saving one preference - retains other fields and sends account changes only when supplied', () => {
  const preferences = {
    name_irl: 'Alice',
    is_email_public: true,
    dob_month: 4,
    dob_day: 12,
    pronouns: 'they/them',
    comment: 'Existing',
    homepage: 'https://example.test',
    autoaccept: true,
    autopass: false,
    fire_overshooting: true,
    monitor_redirects_to_game: true,
    monitor_redirects_to_forum: false,
    automatically_monitor: true,
    die_background: 'circle',
    player_color: '#dd99dd',
    opponent_color: '#ddffdd',
    neutral_color_a: '#cccccc',
    neutral_color_b: '#dddddd',
    uses_gravatar: true,
    vacation_message: 'Away',
    favorite_button: 'Avis',
    favorite_buttonset: 'Classic',
    image_size: 120,
  };
  const args = buildPreferenceSaveArgs(preferences, { name_irl: 'Alice Example' });
  assert.equal(args.name_irl, 'Alice Example');
  assert.equal(args.comment, 'Existing');
  assert.equal(args.autoaccept, true);
  assert.equal(args.player_color, '#dd99dd');
  assert.equal(args.favorite_button, 'Avis');
  assert.equal(args.image_size, 120);
  assert.equal('current_password' in args, false);
  assert.equal('new_email' in args, false);

  const accountChange = buildPreferenceSaveArgs(preferences, {
    current_password: 'secret',
    new_password: 'new-secret',
    new_email: 'alice2@example.test',
    image_size: '',
    favorite_button: '',
    favorite_buttonset: '',
  });
  assert.equal(accountChange.current_password, 'secret');
  assert.equal(accountChange.new_password, 'new-secret');
  assert.equal(accountChange.new_email, 'alice2@example.test');
  assert.equal('image_size' in accountChange, false);
  assert.equal('favorite_button' in accountChange, false);
  assert.equal('favorite_buttonset' in accountChange, false);
});

test('web-ui: No filters given - submitting always carries sort and page even with blank fields', () => {
  const blank = paramsFromForm(fakeForm());
  assert.equal(blank.get('sortColumn'), 'lastMove');
  assert.equal(blank.get('sortDirection'), 'DESC');
  assert.equal(blank.get('page'), '1');
  assert.equal(blank.has('playerNameA'), false);
  assert.notEqual(blank.toString(), '');

  const filled = paramsFromForm(fakeForm({ gameId: '42', playerNameA: ' alice ', buttonNameA: '' }));
  assert.equal(filled.get('gameId'), '42');
  assert.equal(filled.get('playerNameA'), 'alice');
  assert.equal(filled.has('buttonNameA'), false);
});

test('web-ui: Searching by player name - filter values reach the search form and the API call', () => {
  const form = fakeForm();
  const params = new URLSearchParams({ playerNameA: 'bob', gameStartFrom: '2026-02-01' });
  applyParamsToForm(form, params);
  assert.equal(form.elements.namedItem('playerNameA').value, 'bob');
  assert.equal(form.elements.namedItem('gameStartFrom').value, '2026-02-01');
  assert.equal(form.elements.namedItem('buttonNameA').value, '');

  const args = searchArgsFromParams(new URLSearchParams({
    gameId: '123',
    playerNameA: 'alice',
    buttonNameA: 'Bauer',
    status: 'ACTIVE',
    sortColumn: 'lastMove',
    sortDirection: 'DESC',
    page: '2',
  }));
  assert.deepEqual(args, {
    sortColumn: 'lastMove',
    sortDirection: 'DESC',
    numberOfResults: PAGE_SIZE,
    page: 2,
    gameId: 123,
    playerNameA: 'alice',
    buttonNameA: 'Bauer',
    status: 'ACTIVE',
  });
});

test('web-ui: Picking a date range on mobile - dates convert to UTC day boundaries only for the API call', () => {
  assert.equal(dayStartTimestamp('2026-01-01'), Date.parse('2026-01-01T00:00:00Z') / 1000);
  assert.equal(dayEndTimestamp('2026-01-01'), Math.floor(Date.parse('2026-01-01T23:59:59Z') / 1000));

  const params = new URLSearchParams({
    sortColumn: 'gameStart', sortDirection: 'ASC', page: '1',
    gameStartFrom: '2026-01-01', gameStartTo: '2026-01-31',
  });
  const args = searchArgsFromParams(params);
  assert.equal(args.gameStartMin, dayStartTimestamp('2026-01-01'));
  assert.equal(args.gameStartMax, dayEndTimestamp('2026-01-31'));
  assert.equal(args.lastMoveMin, undefined);

  // The raw dates, not timestamps, are what round-trips through the URL and the form.
  assert.equal(params.get('gameStartFrom'), '2026-01-01');
});

test('web-ui: Filtering by last-move range - a last-move range converts independently of game-started', () => {
  const params = new URLSearchParams({
    sortColumn: 'lastMove', sortDirection: 'DESC', page: '1',
    lastMoveFrom: '2026-03-01', lastMoveTo: '2026-03-15',
  });
  const args = searchArgsFromParams(params);
  assert.equal(args.lastMoveMin, dayStartTimestamp('2026-03-01'));
  assert.equal(args.lastMoveMax, dayEndTimestamp('2026-03-15'));
  assert.equal(args.gameStartMin, undefined);
});

test('web-ui: Sorting by last move - clicking a header sorts, clicking again flips direction', () => {
  const params = new URLSearchParams({ sortColumn: 'lastMove', sortDirection: 'DESC', page: '3' });
  const sameColumn = sortParams(params, 'lastMove');
  assert.equal(sameColumn.get('sortColumn'), 'lastMove');
  assert.equal(sameColumn.get('sortDirection'), 'ASC');
  assert.equal(sameColumn.get('page'), '1');

  const otherColumn = sortParams(params, 'gameId');
  assert.equal(otherColumn.get('sortColumn'), 'gameId');
  assert.equal(otherColumn.get('sortDirection'), 'ASC');
});

test('web-ui: More results than fit one page - paging changes only the page parameter', () => {
  const params = new URLSearchParams({ sortColumn: 'lastMove', sortDirection: 'DESC', page: '2', playerNameA: 'alice' });
  const next = pageParams(params, 3);
  assert.equal(next.get('page'), '3');
  assert.equal(next.get('playerNameA'), 'alice');
});

const searchGame = {
  gameId: 42,
  playerNameA: 'alice',
  buttonNameA: 'Avis',
  waitingOnA: false,
  playerNameB: 'bob',
  buttonNameB: 'Hammer',
  waitingOnB: true,
  gameStart: 1750000000,
  lastMove: 1750100000,
  roundsWonA: 1,
  roundsWonB: 3,
  roundsDrawn: 0,
  targetWins: 3,
  status: 'COMPLETE',
};

test('web-ui: Tapping a result - opens the game on buttonweavers and shows a computed winner', () => {
  const document = fakeDocument();
  const container = document.createElement('div');
  const params = new URLSearchParams({ sortColumn: 'lastMove', sortDirection: 'DESC', page: '1' });
  renderSearchResults(container, { games: [searchGame], summary: { matchesFound: 1 } }, params);

  assert.equal(winnerLabel(searchGame), 'bob');

  const [wrapper] = container.children;
  const [table] = wrapper.children;
  const [, tbody] = table.children;
  const [row] = tbody.children;
  const [gameCell, playerCell, buttonACell, opponentCell, , , , winnerCell, statusCell] = row.children;
  assert.equal(gameCell.children[0].href, gameUrl(42));
  assert.equal(gameCell.children[0].textContent, '42');
  assert.equal(playerCell.textContent, 'alice');
  assert.equal(buttonACell.textContent, 'Avis');
  assert.equal(opponentCell.textContent, 'bob');
  assert.equal(winnerCell.textContent, 'bob');
  assert.equal(statusCell.textContent, 'COMPLETE');
});

test('web-ui: No games matched - an empty result set shows a message instead of a table', () => {
  const document = fakeDocument();
  const container = document.createElement('div');
  const params = new URLSearchParams({ sortColumn: 'lastMove', sortDirection: 'DESC', page: '1' });
  renderSearchResults(container, { games: [], summary: { matchesFound: 0 } }, params);
  assert.equal(container.children.length, 1);
  assert.match(container.textContent, /No games matched/);
});

test('web-ui: More results than fit one page - next/previous are disabled at the ends', () => {
  const document = fakeDocument();
  const container = document.createElement('div');

  const firstPage = new URLSearchParams({ sortColumn: 'lastMove', sortDirection: 'DESC', page: '1' });
  renderSearchResults(container, { games: [searchGame], summary: { matchesFound: 25 } }, firstPage);
  const [, nav] = container.children;
  const [, pager] = nav.children;
  const [prev, next] = pager.children;
  assert.equal(prev.getAttribute('aria-disabled'), 'true');
  assert.equal(prev.tagName, 'span');
  assert.equal(prev.href, undefined);
  assert.equal(next.getAttribute('aria-disabled'), null);
  assert.equal(next.tagName, 'a');

  const lastPage = new URLSearchParams({ sortColumn: 'lastMove', sortDirection: 'DESC', page: '2' });
  renderSearchResults(container, { games: [searchGame], summary: { matchesFound: 25 } }, lastPage);
  const [, nav2] = container.children;
  const [, pager2] = nav2.children;
  const [prev2, next2] = pager2.children;
  assert.equal(prev2.getAttribute('aria-disabled'), null);
  assert.equal(prev2.tagName, 'a');
  assert.equal(next2.getAttribute('aria-disabled'), 'true');
  assert.equal(next2.tagName, 'span');
  assert.equal(next2.href, undefined);
});

test('web-ui: Viewing search results - the summary states the current page, total pages, and match count', () => {
  const document = fakeDocument();
  const container = document.createElement('div');

  const firstPage = new URLSearchParams({ sortColumn: 'lastMove', sortDirection: 'DESC', page: '1' });
  renderSearchResults(container, { games: [searchGame], summary: { matchesFound: 25 } }, firstPage);
  const [, nav] = container.children;
  const [summary] = nav.children;
  assert.equal(summary.textContent, 'Page 1 of 2 · 25 games found');

  const singlePage = new URLSearchParams({ sortColumn: 'lastMove', sortDirection: 'DESC', page: '1' });
  renderSearchResults(container, { games: [searchGame], summary: { matchesFound: 1 } }, singlePage);
  const [, nav2] = container.children;
  const [summary2] = nav2.children;
  assert.equal(summary2.textContent, 'Page 1 of 1 · 1 game found');
});

function fakeSearchIds() {
  return [
    'theme', 'login-view', 'games-view', 'forum-view', 'search-view', 'profile-view', 'player',
    'forum-link', 'search-link', 'games-link', 'profile-link', 'logout', 'error', 'forum-content',
    'search-results', 'profile-content', 'games', 'no-games', 'login-form',
  ];
}

function withFakeApp({ hash, fetchFn }, run) {
  return async () => {
    const document = fakeDocument();
    const elements = Object.fromEntries(fakeSearchIds().map((id) => [id, document.createElement('div')]));
    for (const element of Object.values(elements)) {
      element.addEventListener = (type, handler) => { element[`on${type}`] = handler; };
    }
    const formValues = {};
    elements['search-form'] = document.createElement('form');
    elements['search-form'].addEventListener = (type, handler) => {
      elements['search-form'][`on${type}`] = handler;
    };
    elements['search-form'].elements = {
      namedItem(name) {
        if (!(name in formValues)) formValues[name] = '';
        return {
          get value() { return formValues[name]; },
          set value(value) { formValues[name] = value; },
        };
      },
    };
    document.documentElement = { dataset: {} };
    document.getElementById = (id) => elements[id];

    const listeners = {};
    const window = {
      location: { hash },
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      addEventListener: (type, handler) => { listeners[type] = handler; },
    };
    const original = {
      document: globalThis.document,
      window: globalThis.window,
      localStorage: globalThis.localStorage,
      fetch: globalThis.fetch,
    };
    const calls = [];
    globalThis.document = document;
    globalThis.window = window;
    globalThis.localStorage = fakeStorage();
    globalThis.fetch = async (_url, init) => {
      const args = JSON.parse(init.body);
      calls.push(args);
      return fetchFn(args);
    };

    try {
      await import(`../public/js/app.js?test=${Date.now()}-${Math.random()}`);
      await new Promise((resolve) => setImmediate(resolve));
      await run({ elements, window, listeners, calls });
    } finally {
      globalThis.document = original.document;
      globalThis.window = original.window;
      globalThis.localStorage = original.localStorage;
      globalThis.fetch = original.fetch;
    }
  };
}

test('web-ui: Not logged in - reaching game search sends an anonymous visitor to log in', withFakeApp(
  {
    hash: '#search?playerNameA=alice',
    fetchFn: (args) => {
      if (args.type === 'loadPlayerName') return { json: async () => ({ status: 'failed', data: null }) };
      throw new Error(`Unexpected API call: ${args.type}`);
    },
  },
  async ({ elements, calls }) => {
    assert.equal(elements['login-view'].hidden, false);
    assert.equal(elements['search-view'].hidden, true);
    assert.equal(calls.some((c) => c.type === 'searchGameHistory'), false);
  },
));

test('web-ui: Not logged in - opening a profile waits for login without loading profile data', withFakeApp(
  {
    hash: '#profile?player=alice',
    fetchFn: (args) => {
      if (args.type === 'loadPlayerName') return { json: async () => ({ status: 'failed', data: null }) };
      throw new Error(`Unexpected API call: ${args.type}`);
    },
  },
  async ({ elements, calls }) => {
    assert.equal(elements['login-view'].hidden, false);
    assert.equal(elements['profile-view'].hidden, true);
    assert.equal(calls.some((call) => call.type === 'loadProfileInfo'), false);
  },
));

test('web-ui: Viewing another player - profile and games load without private preferences', withFakeApp(
  {
    hash: '#profile?player=alice',
    fetchFn: (args) => {
      if (args.type === 'loadPlayerName') return { json: async () => ({ status: 'ok', data: { userName: 'dan' } }) };
      if (args.type === 'loadProfileInfo') {
        return { json: async () => ({ status: 'ok', data: { profile_info: { name_ingame: 'alice', email: null } } }) };
      }
      if (args.type === 'searchGameHistory') return { json: async () => ({ status: 'ok', data: { games: [] } }) };
      throw new Error(`Unexpected API call: ${args.type}`);
    },
  },
  async ({ elements, calls }) => {
    assert.equal(elements['profile-view'].hidden, false);
    assert.match(elements['profile-content'].textContent, /alice/);
    assert.equal(calls.some((call) => call.type === 'loadPlayerInfo'), false);
    assert.equal(elements['profile-link'].hidden, false);
  },
));

test('web-ui: Profile shortcut - #profile opens the signed-in player profile and preferences', withFakeApp(
  {
    hash: '#profile',
    fetchFn: (args) => {
      if (args.type === 'loadPlayerName') return { json: async () => ({ status: 'ok', data: { userName: 'alice' } }) };
      if (args.type === 'loadProfileInfo') {
        return { json: async () => ({ status: 'ok', data: { profile_info: { name_ingame: 'alice', email: null } } }) };
      }
      if (args.type === 'searchGameHistory') return { json: async () => ({ status: 'ok', data: { games: [] } }) };
      if (args.type === 'loadPlayerInfo') {
        return { json: async () => ({ status: 'ok', data: { user_prefs: { email: 'alice@example.test' } } }) };
      }
      throw new Error(`Unexpected API call: ${args.type}`);
    },
  },
  async ({ elements, calls }) => {
    assert.equal(elements['profile-view'].hidden, false);
    assert.equal(calls.some((call) => call.type === 'loadPlayerInfo'), true);
    assert.equal(
      allElements(elements['profile-content']).some((element) => element.value === 'alice@example.test'),
      true,
    );
  },
));

test('web-ui: Searching by player name - a signed-in search renders results from the submitted filters', withFakeApp(
  {
    hash: `#search?${new URLSearchParams({
      sortColumn: 'lastMove', sortDirection: 'DESC', page: '1', playerNameA: 'alice',
    }).toString()}`,
    fetchFn: (args) => {
      if (args.type === 'loadPlayerName') return { json: async () => ({ status: 'ok', data: { userName: 'dan' } }) };
      if (args.type === 'searchGameHistory') {
        return { json: async () => ({ status: 'ok', data: { games: [searchGame], summary: { matchesFound: 1 } } }) };
      }
      throw new Error(`Unexpected API call: ${args.type}`);
    },
  },
  async ({ elements, calls }) => {
    assert.equal(elements['search-view'].hidden, false);
    assert.deepEqual(calls.find((c) => c.type === 'searchGameHistory'), {
      type: 'searchGameHistory',
      sortColumn: 'lastMove',
      sortDirection: 'DESC',
      numberOfResults: PAGE_SIZE,
      page: 1,
      playerNameA: 'alice',
    });
    assert.notEqual(elements['search-results'].children.length, 0);
  },
));

test('web-ui: A page data request fails - the error is shown with a retry that reloads the view', withFakeApp(
  {
    hash: '',
    fetchFn: (() => {
      let attempts = 0;
      return (args) => {
        if (args.type === 'loadPlayerName') return { json: async () => ({ status: 'ok', data: { userName: 'dan' } }) };
        if (args.type === 'loadActiveGames') {
          attempts += 1;
          if (attempts === 1) return { json: async () => ({ status: 'failed', message: 'Could not load games' }) };
          return { json: async () => ({ status: 'ok', data: games }) };
        }
        throw new Error(`Unexpected API call: ${args.type}`);
      };
    })(),
  },
  async ({ elements }) => {
    assert.equal(elements['error'].hidden, false);
    assert.match(elements['error'].textContent, /Could not load games/);
    const retryButton = elements['error'].children.find((child) => child.tagName === 'button');
    assert.ok(retryButton, 'a retry button is shown');
    await retryButton.onclick();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(elements['error'].hidden, true);
    assert.equal(elements['games'].children.length, 3);
  },
));
