import {
  activeGames,
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
  savePlayerInfo,
  searchGameHistory,
} from './api.js';
import { gameList } from './games.js';
import { renderGameView } from './game-view.js';
import { renderForumBoard, renderForumOverview, renderForumThread } from './forum.js';
import { renderProfile } from './profile.js';
import { profileUrl } from './links.js';
import { applyParamsToForm, paramsFromForm, renderSearchResults, searchArgsFromParams } from './search.js';
import { initThemeControl } from './theme.js';

const $ = (id) => document.getElementById(id);
let signedInPlayer = null;
let viewRequest = 0;

function show(view, player = '') {
  $('login-view').hidden = view !== 'login';
  $('games-view').hidden = view !== 'games';
  const gameView = $('game-view');
  if (gameView) gameView.hidden = view !== 'game';
  $('forum-view').hidden = view !== 'forum';
  $('search-view').hidden = view !== 'search';
  $('profile-view').hidden = view !== 'profile';
  $('player').textContent = player;
  $('profile-link').hidden = view === 'login';
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
  const item = document.createElement('div');
  item.className = 'list-group-item d-flex justify-content-between align-items-start gap-2';

  const text = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'fw-semibold';
  const gameLink = document.createElement('a');
  gameLink.href = game.href;
  gameLink.textContent = `Game ${game.id}`;
  title.append(gameLink);
  const opponent = document.createElement('div');
  opponent.textContent = 'vs ';
  const opponentLink = document.createElement('a');
  opponentLink.href = profileUrl(game.opponent);
  opponentLink.textContent = game.opponent;
  opponent.append(opponentLink);
  const detail = document.createElement('small');
  detail.className = 'text-body-secondary';
  detail.textContent = `${game.myButton} vs ${game.opponentButton} · ${game.wins}-${game.losses}-${game.draws} (to ${game.target})`;
  text.append(title, opponent, detail);
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

async function showGame(player) {
  const request = ++viewRequest;
  show('game', player);
  showError('');
  const params = new URLSearchParams(hashQuery());
  const gameId = params.get('gameId');
  if (!gameId || !/^\d+$/.test(gameId)) throw new Error('A game id is required');
  const [data, colorPreferences] = await Promise.all([
    gameData(gameId),
    player ? playerPreferences().catch(() => null) : Promise.resolve(null),
  ]);
  if (request !== viewRequest) return;
  renderGameView($('game-content'), data, {
    replay: params.get('replay'),
    timestamp: params.get('timestamp'),
    phase: params.get('phase'),
    colorPreferences,
  });
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

async function showProfile(player, notice = '') {
  const request = ++viewRequest;
  show('profile', player);
  showError('');
  const content = $('profile-content');
  content.replaceChildren();
  const params = new URLSearchParams(hashQuery());
  const playerName = params.get('player') || player;
  if (!playerName || !/^[a-z\d]+$/i.test(playerName)) {
    renderProfile(content, null);
    return;
  }
  const profile = await playerProfile(playerName);
  if (request !== viewRequest) return;
  if (!profile) {
    renderProfile(content, null);
    return;
  }
  const isOwn = playerName === player;
  const [gamesResult, preferencesResult] = await Promise.allSettled([
    recentPlayerGames(playerName),
    ...(isOwn ? [playerPreferences()] : []),
  ]);
  if (request !== viewRequest) return;
  const preferences = isOwn ? preferencesResult : null;
  renderProfile(content, profile, {
    isOwn,
    preferences: preferences?.status === 'fulfilled' ? preferences.value : undefined,
    preferenceError: preferences?.status === 'rejected' ? preferences.reason.message : '',
    games: gamesResult.status === 'fulfilled' ? gamesResult.value : [],
    gamesError: gamesResult.status === 'rejected' ? gamesResult.reason.message : '',
    notice,
    onRetryGames: () => showProfile(playerName, notice),
    onSave: async (args) => {
      const result = await savePlayerInfo(args);
      if (result.ok) {
        await showProfile(playerName, result.message || 'Preferences saved.');
      }
      return result;
    },
  });
}

function currentView() {
  if (window.location.hash.startsWith('#!')) return 'forum';
  if (window.location.hash.startsWith('#search')) return 'search';
  if (window.location.hash === '#profile' || window.location.hash.startsWith('#profile?')) return 'profile';
  if (window.location.hash === '#game' || window.location.hash.startsWith('#game?')) return 'game';
  return 'games';
}

function showView(view, player) {
  if (view === 'forum') return showForum(player);
  if (view === 'search') return showSearch(player);
  if (view === 'profile') return showProfile(player);
  if (view === 'game') return showGame(player);
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
