import { activeGames, currentPlayer, login, logout } from './api.js';
import { gameList } from './games.js';
import { resolveTheme, saveChoice, storedChoice } from './theme.js';

const $ = (id) => document.getElementById(id);
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
  document.documentElement.dataset.bsTheme = resolveTheme(storedChoice(), darkQuery.matches);
}

function show(view, player = '') {
  $('login-view').hidden = view !== 'login';
  $('games-view').hidden = view !== 'games';
  $('player').textContent = player;
  $('logout').hidden = view !== 'games';
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
  show('games', player);
  const list = $('games');
  list.replaceChildren();
  const games = gameList(await activeGames());
  $('no-games').hidden = games.length > 0;
  list.append(...games.map(gameItem));
}

async function start() {
  const player = await currentPlayer();
  if (player) {
    await showGames(player);
  } else {
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
  await logout();
  show('login');
});

start().catch((error) => showError(error.message));
