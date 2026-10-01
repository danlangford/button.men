import {
  activeGames,
  currentPlayer,
  forumBoard,
  forumOverview,
  forumThread,
  login,
  logout,
  searchGameHistory,
} from './api.js';
import { gameList } from './games.js';
import { renderForumBoard, renderForumOverview, renderForumThread } from './forum.js';
import { applyParamsToForm, paramsFromForm, renderSearchResults, searchArgsFromParams } from './search.js';
import { initThemeControl } from './theme.js';

const $ = (id) => document.getElementById(id);
let signedInPlayer = null;
let viewRequest = 0;

function show(view, player = '') {
  $('login-view').hidden = view !== 'login';
  $('games-view').hidden = view !== 'games';
  $('forum-view').hidden = view !== 'forum';
  $('search-view').hidden = view !== 'search';
  $('player').textContent = player;
  $('forum-link').hidden = view === 'login';
  $('games-link').hidden = view === 'login';
  $('search-link').hidden = view === 'login';
  $('logout').hidden = view === 'login';
}

// retry, when given, is offered as a button so a player can repeat a
// failed, repeatable action without reloading the page.
function showError(message, retry) {
  const errorBox = $('error');
  errorBox.hidden = !message;
  if (!message) {
    errorBox.replaceChildren();
    return;
  }
  const text = document.createElement('span');
  text.textContent = message;
  errorBox.replaceChildren(text);
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm btn-outline-danger ms-2';
    button.textContent = 'Retry';
    button.addEventListener('click', retry);
    errorBox.append(button);
  }
}

function gameItem(game) {
  const item = document.createElement('a');
  item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start gap-2';
  item.href = game.href;

  const text = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'fw-semibold';
  title.textContent = `vs ${game.opponent}`;
  const detail = document.createElement('small');
  detail.className = 'text-body-secondary';
  detail.textContent = `${game.myButton} vs ${game.opponentButton} · ${game.wins}-${game.losses}-${game.draws} (to ${game.target})`;
  text.append(title, detail);
  if (game.description) {
    const description = document.createElement('div');
    description.className = 'small text-body-secondary fst-italic';
    description.textContent = game.description;
    text.append(description);
  }
  item.append(text);

  if (game.yourTurn) {
    const badge = document.createElement('span');
    badge.className = 'badge text-bg-primary';
    badge.textContent = 'Your turn';
    item.append(badge);
  }
  return item;
}

async function showGames(player) {
  const request = ++viewRequest;
  show('games', player);
  showError('');
  const list = $('games');
  list.replaceChildren();
  try {
    const games = gameList(await activeGames());
    if (request !== viewRequest) return;
    $('no-games').hidden = games.length > 0;
    list.append(...games.map(gameItem));
  } catch (error) {
    if (request === viewRequest) throw error;
  }
}

async function showForum(player) {
  const request = ++viewRequest;
  show('forum', player);
  showError('');
  const content = $('forum-content');
  content.replaceChildren();
  const params = new URLSearchParams(window.location.hash.slice(2));
  try {
    if (params.has('threadId')) {
      const data = await forumThread(params.get('threadId'), params.get('postId'));
      if (request !== viewRequest) return;
      renderForumThread(content, data);
    } else if (params.has('boardId')) {
      const data = await forumBoard(params.get('boardId'));
      if (request !== viewRequest) return;
      renderForumBoard(content, data);
    } else {
      const data = await forumOverview();
      if (request !== viewRequest) return;
      renderForumOverview(content, data);
    }
  } catch (error) {
    if (request === viewRequest) throw error;
  }
}

function hashQuery() {
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  return qIndex === -1 ? '' : hash.slice(qIndex + 1);
}

async function showSearch(player) {
  const request = ++viewRequest;
  show('search', player);
  showError('');
  const params = new URLSearchParams(hashQuery());
  applyParamsToForm($('search-form'), params);
  const results = $('search-results');
  if ([...params.keys()].length === 0) {
    results.replaceChildren();
    return;
  }
  try {
    const data = await searchGameHistory(searchArgsFromParams(params));
    if (request !== viewRequest) return;
    renderSearchResults(results, data, params);
  } catch (error) {
    if (request === viewRequest) throw error;
  }
}

function currentView() {
  if (window.location.hash.startsWith('#!')) return 'forum';
  if (window.location.hash.startsWith('#search')) return 'search';
  return 'games';
}

function showView(view, player) {
  if (view === 'forum') return showForum(player);
  if (view === 'search') return showSearch(player);
  return showGames(player);
}

async function start() {
  const player = await currentPlayer();
  signedInPlayer = player;
  if (player) {
    await showView(currentView(), player);
  } else {
    viewRequest++;
    show('login');
  }
}

initThemeControl($('theme'));

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');
  const form = event.target;
  const result = await login(form.username.value.trim(), form.password.value);
  form.password.value = '';
  if (result.ok) {
    await start();
  } else {
    showError(result.message || 'Login failed');
  }
});

$('logout').addEventListener('click', async () => {
  signedInPlayer = null;
  viewRequest++;
  window.location.hash = '';
  await logout();
  show('login');
});

function loadCurrentView() {
  return showView(currentView(), signedInPlayer).catch(
    (error) => showError(error.message, loadCurrentView),
  );
}

window.addEventListener('hashchange', () => {
  if (!signedInPlayer) return;
  loadCurrentView();
});

$('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const params = paramsFromForm(event.target);
  window.location.hash = `#search?${params.toString()}`;
  loadCurrentView();
});

start().catch((error) => showError(error.message, loadCurrentView));
