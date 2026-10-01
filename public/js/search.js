import { gameUrl } from './games.js';

export const PAGE_SIZE = 20;

export const SORT_COLUMNS = [
  { value: 'gameId', label: 'Game' },
  { value: 'playerNameA', label: 'Player' },
  { value: 'buttonNameA', label: 'Button' },
  { value: 'playerNameB', label: 'Opponent' },
  { value: 'buttonNameB', label: "Opponent's button" },
  { value: 'gameStart', label: 'Started' },
  { value: 'lastMove', label: 'Last move' },
  { value: 'winningPlayer', label: 'Winner' },
  { value: 'status', label: 'Status' },
];

export const STATUS_OPTIONS = ['ACTIVE', 'UNSTARTED', 'COMPLETE', 'CANCELLED'];
export const WINNER_OPTIONS = ['A', 'B', 'Tie'];

const DEFAULT_SORT_COLUMN = 'lastMove';
const DEFAULT_SORT_DIRECTION = 'DESC';

const TEXT_FIELDS = ['gameId', 'playerNameA', 'buttonNameA', 'playerNameB', 'buttonNameB', 'status', 'winningPlayer'];
const DATE_FIELDS = ['gameStartFrom', 'gameStartTo', 'lastMoveFrom', 'lastMoveTo'];

// Buttonweavers timestamps are unix seconds; dates picked in the filter
// form are treated as whole UTC days so results don't depend on the
// player's local timezone.
export function dayStartTimestamp(dateString) {
  return Math.floor(Date.parse(`${dateString}T00:00:00Z`) / 1000);
}

export function dayEndTimestamp(dateString) {
  return Math.floor(Date.parse(`${dateString}T23:59:59Z`) / 1000);
}

// Build the hash query for a freshly submitted search: every non-empty
// field, plus sort and page, which is why this is never an empty string
// even when every filter is left blank.
export function paramsFromForm(form) {
  const params = new URLSearchParams();
  for (const field of [...TEXT_FIELDS, ...DATE_FIELDS]) {
    const value = (form.elements.namedItem(field)?.value || '').trim();
    if (value) params.set(field, value);
  }
  params.set('sortColumn', DEFAULT_SORT_COLUMN);
  params.set('sortDirection', DEFAULT_SORT_DIRECTION);
  params.set('page', '1');
  return params;
}

// Fill the filter form from the current hash query, so reloading, sharing
// a link, or navigating back/forward restores what was searched for.
export function applyParamsToForm(form, params) {
  for (const field of [...TEXT_FIELDS, ...DATE_FIELDS]) {
    const input = form.elements.namedItem(field);
    if (input) input.value = params.get(field) || '';
  }
}

// Translate the hash query into a searchGameHistory API call.
export function searchArgsFromParams(params) {
  const args = {
    sortColumn: params.get('sortColumn') || DEFAULT_SORT_COLUMN,
    sortDirection: params.get('sortDirection') || DEFAULT_SORT_DIRECTION,
    numberOfResults: PAGE_SIZE,
    page: Number(params.get('page') || 1),
  };
  const gameId = params.get('gameId');
  if (gameId) args.gameId = Number(gameId);
  for (const field of ['playerNameA', 'playerNameB', 'buttonNameA', 'buttonNameB', 'status', 'winningPlayer']) {
    const value = params.get(field);
    if (value) args[field] = value;
  }
  const gameStartFrom = params.get('gameStartFrom');
  if (gameStartFrom) args.gameStartMin = dayStartTimestamp(gameStartFrom);
  const gameStartTo = params.get('gameStartTo');
  if (gameStartTo) args.gameStartMax = dayEndTimestamp(gameStartTo);
  const lastMoveFrom = params.get('lastMoveFrom');
  if (lastMoveFrom) args.lastMoveMin = dayStartTimestamp(lastMoveFrom);
  const lastMoveTo = params.get('lastMoveTo');
  if (lastMoveTo) args.lastMoveMax = dayEndTimestamp(lastMoveTo);
  return args;
}

// searchGameHistory's rows carry rounds/target fields, not a winner field;
// the winner shown here is derived, matching upstream's own COMPLETE check.
export function winnerLabel(game) {
  if (game.status !== 'COMPLETE') return '';
  if (game.roundsWonA >= game.targetWins) return game.playerNameA;
  if (game.roundsWonB >= game.targetWins) return game.playerNameB;
  return 'Tie';
}

export function formatDate(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : '';
}

// Clone the current query with one column sorted; clicking the
// already-sorted column flips its direction, otherwise sort ascending.
export function sortParams(params, column) {
  const next = new URLSearchParams(params);
  const sameColumn = params.get('sortColumn') === column;
  const flipped = params.get('sortDirection') === 'ASC' ? 'DESC' : 'ASC';
  next.set('sortColumn', column);
  next.set('sortDirection', sameColumn ? flipped : 'ASC');
  next.set('page', '1');
  return next;
}

export function pageParams(params, page) {
  const next = new URLSearchParams(params);
  next.set('page', String(page));
  return next;
}

function makeElement(document, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeLink(document, text, href, className = '') {
  const link = makeElement(document, 'a', className, text);
  link.href = href;
  return link;
}

export function buttonweaversGameUrl(gameId) {
  return gameUrl(gameId);
}

function pagerItem(document, text, href, disabled) {
  if (disabled) {
    const span = makeElement(document, 'span', 'btn btn-outline-secondary btn-sm disabled', text);
    span.setAttribute('aria-disabled', 'true');
    return span;
  }
  return makeLink(document, text, href, 'btn btn-outline-secondary btn-sm');
}

export function renderSearchResults(container, data, params) {
  const document = container.ownerDocument;
  const games = data.games || [];
  const matchesFound = Number(data.summary?.matchesFound ?? games.length);
  const page = Number(params.get('page') || 1);

  if (games.length === 0) {
    container.replaceChildren(makeElement(document, 'p', 'text-body-secondary', 'No games matched that search.'));
    return;
  }

  const table = makeElement(document, 'table', 'table table-hover align-middle');
  const thead = makeElement(document, 'thead');
  const headRow = makeElement(document, 'tr');
  for (const column of SORT_COLUMNS) {
    const th = makeElement(document, 'th');
    th.scope = 'col';
    const isSorted = params.get('sortColumn') === column.value;
    const direction = params.get('sortDirection') || DEFAULT_SORT_DIRECTION;
    th.setAttribute('aria-sort', isSorted ? (direction === 'ASC' ? 'ascending' : 'descending') : 'none');
    const link = makeLink(
      document,
      column.label + (isSorted ? (direction === 'ASC' ? ' ▲' : ' ▼') : ''),
      `#search?${sortParams(params, column.value).toString()}`,
    );
    th.append(link);
    headRow.append(th);
  }
  thead.append(headRow);

  const tbody = makeElement(document, 'tbody');
  for (const game of games) {
    const row = makeElement(document, 'tr');
    const link = (text) => makeLink(document, text, buttonweaversGameUrl(game.gameId));
    const gameCell = makeElement(document, 'td');
    gameCell.append(link(String(game.gameId)));
    const playerCell = makeElement(document, 'td', game.waitingOnA ? 'fw-semibold' : '', game.playerNameA || '');
    const buttonACell = makeElement(document, 'td', '', game.buttonNameA || '');
    const opponentCell = makeElement(document, 'td', game.waitingOnB ? 'fw-semibold' : '', game.playerNameB || '');
    const buttonBCell = makeElement(document, 'td', '', game.buttonNameB || '');
    const startedCell = makeElement(document, 'td', '', formatDate(game.gameStart));
    const lastMoveCell = makeElement(document, 'td', '', formatDate(game.lastMove));
    const winnerCell = makeElement(document, 'td', '', winnerLabel(game));
    const statusCell = makeElement(document, 'td', '', game.status || '');
    row.append(
      gameCell,
      playerCell,
      buttonACell,
      opponentCell,
      buttonBCell,
      startedCell,
      lastMoveCell,
      winnerCell,
      statusCell,
    );
    tbody.append(row);
  }
  table.append(thead, tbody);

  const wrapper = makeElement(document, 'div', 'table-responsive');
  wrapper.append(table);

  const totalPages = Math.max(1, Math.ceil(matchesFound / PAGE_SIZE));
  const nav = makeElement(document, 'div', 'd-flex justify-content-between align-items-center mt-3');
  const summaryText = makeElement(
    document,
    'span',
    'text-body-secondary small',
    `Page ${page} of ${totalPages} · ${matchesFound} game${matchesFound === 1 ? '' : 's'} found`,
  );
  const pager = makeElement(document, 'div', 'btn-group');
  const prev = pagerItem(document, 'Previous', `#search?${pageParams(params, page - 1).toString()}`, page <= 1);
  const next = pagerItem(document, 'Next', `#search?${pageParams(params, page + 1).toString()}`, page * PAGE_SIZE >= matchesFound);
  pager.append(prev, next);
  nav.append(summaryText, pager);

  container.replaceChildren(wrapper, nav);
}
