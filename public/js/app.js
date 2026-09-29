import {
  activeGames,
  currentPlayer,
  forumBoard,
  forumOverview,
  forumThread,
  login,
  logout,
} from './api.js';
import { gameList } from './games.js';
import { renderForumBoard, renderForumOverview, renderForumThread } from './forum.js';
import { resolveTheme, saveChoice, storedChoice } from './theme.js';

const $ = (id) => document.getElementById(id);
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
let signedInPlayer = null;
let viewRequest = 0;

function applyTheme() {
  document.documentElement.dataset.bsTheme = resolveTheme(storedChoice(), darkQuery.matches);
}

function show(view, player = '') {
  $('login-view').hidden = view !== 'login';
  $('games-view').hidden = view !== 'games';
  $('forum-view').hidden = view !== 'forum';
  $('player').textContent = player;
  $('forum-link').hidden = view === 'login';
  $('games-link').hidden = view === 'login';
  $('logout').hidden = view === 'login';
}

function showError(message) {
  $('error').textContent = message;
  $('error').hidden = !message;
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

async function start() {
  const player = await currentPlayer();
  signedInPlayer = player;
  if (player) {
    if (window.location.hash.startsWith('#!')) {
      await showForum(player);
    } else {
      await showGames(player);
    }
  } else {
    viewRequest++;
    show('login');
  }
}

$('theme').value = storedChoice();
$('theme').addEventListener('change', (event) => {
  saveChoice(event.target.value);
  applyTheme();
});
darkQuery.addEventListener('change', applyTheme);
applyTheme();

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

window.addEventListener('hashchange', () => {
  if (!signedInPlayer) return;
  if (window.location.hash.startsWith('#!')) {
    showForum(signedInPlayer).catch((error) => showError(error.message));
  } else {
    showGames(signedInPlayer).catch((error) => showError(error.message));
  }
});

start().catch((error) => showError(error.message));
