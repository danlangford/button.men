import { API_BASE } from './config.js';

// Thrown by callApi for network, HTTP, and malformed-response failures, so
// callers always have a safe, user-facing message rather than a raw error
// or an unusable response body.
export class ApiError extends Error {
  constructor(message, kind) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

export async function callApi(args, { base = API_BASE, fetchFn = fetch } = {}) {
  let response;
  try {
    response = await fetchFn(base, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: JSON.stringify(args),
    });
  } catch {
    throw new ApiError('Could not reach buttonweavers. Check your connection and try again.', 'network');
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('Buttonweavers returned an unexpected response. Please try again.', 'invalid-json');
  }
  // response.ok is only false for a real fetch Response; test fakes that
  // omit it are treated as successful so existing call sites don't need to
  // add it to every mock.
  if (response.ok === false) {
    throw new ApiError('Buttonweavers could not complete that request. Please try again.', 'http');
  }
  return body;
}

function safeMessage(error, fallback) {
  return error instanceof ApiError ? error.message : fallback;
}

export async function currentPlayer(call = callApi) {
  try {
    const result = await call({ type: 'loadPlayerName' });
    return result.data?.userName ?? null;
  } catch {
    return null;
  }
}

export async function login(username, password, call = callApi) {
  try {
    const result = await call({ type: 'login', username, password, doStayLoggedIn: true });
    return { ok: result.status === 'ok', message: result.message };
  } catch (error) {
    return { ok: false, message: safeMessage(error, 'Login could not be completed. Please try again.') };
  }
}

export async function logout(call = callApi) {
  await call({ type: 'logout' });
}

export async function activeGames(call = callApi) {
  const result = await call({ type: 'loadActiveGames' });
  if (result.status !== 'ok') throw new Error(result.message || 'Could not load games');
  return result.data;
}

export async function gameData(gameId, call = callApi) {
  const result = await call({ type: 'loadGameData', game: Number(gameId) });
  if (result.status !== 'ok') throw new Error(result.message || 'Could not load game');
  return result.data;
}

async function forumRequest(args, call) {
  const result = await call(args);
  if (result.status !== 'ok') throw new Error(result.message || 'Could not load forum');
  return result.data;
}

export async function forumOverview(call = callApi) {
  return forumRequest({ type: 'loadForumOverview' }, call);
}

export async function forumBoard(boardId, call = callApi) {
  return forumRequest({ type: 'loadForumBoard', boardId }, call);
}

export async function forumThread(threadId, currentPostId, call = callApi) {
  const args = { type: 'loadForumThread', threadId };
  if (currentPostId !== undefined && currentPostId !== null) {
    args.currentPostId = currentPostId;
  }
  return forumRequest(args, call);
}

export async function searchGameHistory(args, call = callApi) {
  const result = await call({ type: 'searchGameHistory', ...args });
  if (result.status !== 'ok') throw new Error(result.message || 'Game search failed');
  return result.data;
}

export async function playerProfile(playerName, call = callApi) {
  const result = await call({ type: 'loadProfileInfo', playerName });
  if (result.status === 'ok') return result.data?.profile_info ?? null;
  if (/player name does not exist/i.test(result.message || '')) return null;
  throw new Error(result.message || 'Could not load player profile');
}

export async function playerPreferences(call = callApi) {
  const result = await call({ type: 'loadPlayerInfo' });
  if (result.status !== 'ok') throw new Error(result.message || 'Could not load preferences');
  if (!result.data?.user_prefs) throw new Error('Buttonweavers returned incomplete preferences');
  return result.data.user_prefs;
}

export async function savePlayerInfo(args, call = callApi) {
  const result = await call({ type: 'savePlayerInfo', ...args });
  return { ok: result.status === 'ok', message: result.message };
}

export async function recentPlayerGames(playerName, call = callApi) {
  const data = await searchGameHistory({
    playerNameA: playerName,
    status: 'COMPLETE',
    sortColumn: 'lastMove',
    sortDirection: 'DESC',
    numberOfResults: 5,
    page: 1,
  }, call);
  return data.games || [];
}
