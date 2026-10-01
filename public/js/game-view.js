import { gameUrl } from './games.js';

const value = (object, ...keys) => keys.reduce((result, key) => result ?? object?.[key], undefined);

function text(document, tag, content, className = '') {
  const element = document.createElement(tag);
  element.textContent = content ?? '';
  if (className) element.className = className;
  return element;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function dieLabel(die) {
  const recipe = value(die, 'recipe', 'originalRecipe') ?? '?';
  const sides = value(die, 'sides', 'size');
  const rolled = value(die, 'value', 'currentValue', 'roll');
  const skills = list(value(die, 'skillArray', 'skills')).join(', ');
  const statuses = list(value(die, 'statusArray', 'statuses', 'properties')).join(', ');
  return { recipe, sides, rolled, skills, statuses };
}

function renderDie(document, die, captured = false) {
  const info = dieLabel(die);
  const card = text(document, 'div', '', 'game-die card p-2 text-center');
  if (captured && card.classList) card.classList.add('game-die-captured');
  if (card.dataset) card.dataset.recipe = info.recipe;
  card.append(
    text(document, 'strong', info.rolled ?? '—', 'game-die-value d-block'),
    text(document, 'span', `d${info.sides || info.recipe}`, 'small'),
  );
  if (info.skills) card.append(text(document, 'span', info.skills, 'small d-block'));
  if (info.statuses) card.append(text(document, info.statuses, 'small d-block text-body-secondary'));
  return card;
}

function renderPlayer(document, player, active, initiative, position) {
  const button = player.button || {};
  const card = text(document, 'article', '', `game-player card p-3 game-player-${position}`);
  const heading = text(document, 'h2', player.playerName || `Player ${position + 1}`, 'h3 mb-1');
  card.append(heading);
  card.append(text(document, 'div', button.name || 'Unnamed button', 'fw-semibold'));
  card.append(text(document, 'div', button.recipe ? `Recipe: ${button.recipe}` : '', 'small text-body-secondary'));
  card.append(text(
    document,
    'div',
    `Round ${player.roundScore ?? 0} · Match ${list(player.gameScoreArray).join('-') || (player.sideScore ?? 0)}`,
    'small d-block',
  ));
  if (active) card.append(text(document, 'span', 'Active player', 'badge text-bg-primary mt-2 me-1'));
  if (initiative) card.append(text(document, 'span', 'Initiative', 'badge text-bg-warning mt-2'));
  const dice = text(document, 'div', '', 'game-dice d-flex flex-wrap gap-2 mt-3');
  list(player.activeDieArray).forEach((die) => dice.append(renderDie(document, die)));
  list(player.capturedDieArray).forEach((die) => dice.append(renderDie(document, die, true)));
  list(player.outOfPlayDieArray).forEach((die) => dice.append(renderDie(document, die, true)));
  card.append(dice);
  return card;
}

function entry(data, type) {
  return list(data).map((item) => ({
    type,
    timestamp: Number(item.timestamp) || 0,
    player: item.player || '',
    message: item.message || '',
  }));
}

function renderActivity(document, root, data, privateChat) {
  const controls = text(document, 'div', '', 'btn-group mb-3');
  const stream = text(document, 'div', '', 'game-activity');
  const entries = [...entry(data.gameActionLog, 'action'), ...entry(data.gameChatLog, 'chat')]
    .sort((a, b) => a.timestamp - b.timestamp);
  let filter = 'chat';
  const render = () => {
    stream.replaceChildren();
    const visible = entries.filter((item) => filter === 'all' || item.type === filter);
    visible.forEach((item) => {
      const row = text(document, 'article', '', `game-event game-event-${item.type} border-bottom py-2`);
      row.append(text(document, 'strong', item.player || (item.type === 'chat' ? 'Chat' : 'Game')), text(document, 'span', ` · ${item.message}`));
      stream.append(row);
    });
    if (!visible.length) stream.append(text(document, 'p', 'No activity for this filter.', 'text-body-secondary'));
  };
  for (const [label, selected] of [['All', 'all'], ['Chat only', 'chat'], ['Actions only', 'action']]) {
    const button = text(document, 'button', label, `btn btn-sm ${selected === filter ? 'btn-primary' : 'btn-outline-primary'}`);
    button.type = 'button';
    button.addEventListener('click', () => {
      filter = selected;
      [...controls.children].forEach((child) => {
        child.className = `btn btn-sm ${child.textContent === label ? 'btn-primary' : 'btn-outline-primary'}`;
      });
      render();
    });
    controls.append(button);
  }
  root.append(text(document, 'h2', 'Activity', 'h3 mt-4'), controls);
  if (privateChat) root.append(text(document, 'p', 'Private chat is hidden for spectators.', 'alert alert-secondary'));
  render();
  root.append(stream);
}

export function renderGameView(root, data) {
  root.replaceChildren();
  const players = list(data.playerDataArray);
  if (players.length < 2) {
    root.append(text(root.ownerDocument, 'p', 'Game data is incomplete.', 'alert alert-warning'));
    return;
  }
  const document = root.ownerDocument;
  const current = Number.isInteger(data.currentPlayerIdx) && data.currentPlayerIdx >= 0 ? data.currentPlayerIdx : null;
  const viewing = current === null ? 0 : current;
  let flipped = false;
  const board = text(document, 'div', '', 'game-board');
  const controls = text(document, 'div', '', 'd-flex flex-wrap justify-content-between gap-2 mb-3');
  controls.append(text(document, 'h1', `Game ${data.gameId}`, 'h3 mb-0'));
  const flip = text(document, 'button', 'Flip orientation', 'btn btn-sm btn-outline-secondary');
  flip.type = 'button';
  flip.addEventListener('click', () => {
    flipped = !flipped;
    board.replaceChildren(playerAt(0), playerAt(1));
  });
  controls.append(flip);
  const action = text(document, 'a', 'Take action on buttonweavers.com', 'btn btn-sm btn-primary');
  action.href = gameUrl(data.gameId);
  action.target = '_blank';
  action.rel = 'noopener';
  controls.append(action);
  root.append(controls, text(document, 'p', `${data.gameState || 'Game'} · Round ${data.roundNumber ?? '—'}`, 'text-body-secondary'));
  function playerAt(slot) {
    const index = flipped ? 1 - (viewing === slot ? viewing : 1 - viewing) : (viewing === slot ? viewing : 1 - viewing);
    return renderPlayer(
      document,
      players[index],
      data.activePlayerIdx === index,
      data.playerWithInitiativeIdx === index,
      slot,
    );
  }
  board.append(playerAt(1), playerAt(0));
  root.append(board);
  const privateChat = current === null && players.some((player) => player.isChatPrivate);
  renderActivity(document, root, data, privateChat);
}
