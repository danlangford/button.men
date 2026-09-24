import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeGames, currentPlayer, login, logout } from '../public/js/api.js';
import { gameList, gameUrl } from '../public/js/games.js';
import { resolveTheme, saveChoice, storedChoice } from '../public/js/theme.js';
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

test('web-ui: Narrow screen - pages are responsive', () => {
  for (const page of ['public/index.html', 'public/about.html']) {
    const html = read(page);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    assert.match(html, /bootstrap@5\.3\.\d+\/dist\/css\/bootstrap\.min\.css/);
    assert.doesNotMatch(html, /[^-]width:\s*\d{3,}px/);
  }
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
