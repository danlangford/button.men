import { API_BASE } from './config.js';

export async function callApi(args, { base = API_BASE, fetchFn = fetch } = {}) {
  const response = await fetchFn(base, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: JSON.stringify(args),
  });
  return response.json();
}

export async function currentPlayer(call = callApi) {
  const result = await call({ type: 'loadPlayerName' });
  return result.data?.userName ?? null;
}

export async function login(username, password, call = callApi) {
  const result = await call({ type: 'login', username, password, doStayLoggedIn: true });
  return { ok: result.status === 'ok', message: result.message };
}

export async function logout(call = callApi) {
  await call({ type: 'logout' });
}

export async function activeGames(call = callApi) {
  const result = await call({ type: 'loadActiveGames' });
  if (result.status !== 'ok') throw new Error(result.message || 'Could not load games');
  return result.data;
}
