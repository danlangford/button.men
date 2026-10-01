import { gameUrl } from './games.js';

let disposeDiceScene = () => {};
let setDiceOrientation = () => {};

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

function wasJustCaptured(die) {
  return list(die.properties).includes('WasJustCaptured');
}

function dieLabel(die) {
  const recipe = value(die, 'recipe', 'originalRecipe') ?? '?';
  const sides = value(die, 'sides', 'size');
  const rolled = value(die, 'value', 'currentValue', 'roll');
  const skills = list(value(die, 'skillArray', 'skills')).join(', ');
  const statuses = list(value(die, 'statusArray', 'statuses', 'properties'))
    .filter((status) => status !== 'WasJustCaptured')
    .join(', ');
  return { recipe, sides, rolled, skills, statuses };
}

function renderDie(document, die, captured = false) {
  const info = dieLabel(die);
  const card = text(document, 'div', '', `game-die card p-2 text-center${captured ? ' game-die-captured' : ''}`);
  if (card.dataset) card.dataset.recipe = info.recipe;
  if (captured) card.setAttribute('aria-disabled', 'true');
  card.append(
    text(document, 'strong', info.rolled ?? '—', 'game-die-value d-block'),
    text(document, 'span', `d${info.sides || info.recipe}`, 'small'),
  );
  if (info.skills) card.append(text(document, 'span', info.skills, 'small d-block'));
  if (info.statuses) card.append(text(document, 'small', info.statuses, 'd-block text-body-secondary'));
  return card;
}

function playerScoreText(player, maxWins) {
  const scores = player.gameScoreArray;
  const wlt = Array.isArray(scores)
    ? scores.join('/')
    : scores && typeof scores === 'object'
      ? [scores.W ?? 0, scores.L ?? 0, scores.D ?? 0].join('/')
      : '–/–/–';
  const sideScore = Number(player.sideScore) > 0 ? `+${player.sideScore}` : player.sideScore ?? 0;
  return `Score: ${player.roundScore ?? 0} (${sideScore} sides) · W/L/T: ${wlt} (${maxWins ?? '—'})`;
}

function renderHudPlayer(document, player, active, initiative, position, maxWins) {
  const button = player.button || {};
  const card = text(document, 'article', '', `game-hud-player game-hud-player-${position}`);
  card.append(text(document, 'strong', player.playerName || `Player ${position + 1}`, 'game-hud-name'));
  card.append(text(document, 'div', `${button.name || 'Unnamed button'}${button.recipe ? ` · ${button.recipe}` : ''}`));
  card.append(text(document, 'div', playerScoreText(player, maxWins)));
  if (active) card.append(text(document, 'span', 'Active player', 'badge text-bg-primary me-1'));
  if (initiative) card.append(text(document, 'span', 'Initiative', 'badge text-bg-warning'));

  const details = text(document, 'details', '', 'game-hud-details');
  details.append(text(document, 'summary', 'Button and dice details'));
  const buttonSkills = list(value(button, 'skillArray', 'skills')).join(', ');
  if (buttonSkills) details.append(text(document, 'div', `Button skills: ${buttonSkills}`));
  for (const [label, dice] of [
    ['Active dice', player.activeDieArray],
    ['Captured dice', player.capturedDieArray],
    ['Out of play dice', player.outOfPlayDieArray],
  ]) {
    if (!list(dice).length) continue;
    const group = text(document, 'div', '', 'game-hud-dice');
    group.append(text(document, 'strong', `${label}: `));
    group.append(text(document, 'span', list(dice).map((die) => {
      const info = dieLabel(die);
      return [
        `${info.rolled ?? '—'} · d${info.sides || info.recipe}`,
        info.skills && `Skills: ${info.skills}`,
        info.statuses && `Status: ${info.statuses}`,
      ].filter(Boolean).join(' · ');
    }).join('  |  ')));
    details.append(group);
  }
  card.append(details);
  return card;
}

function renderPlayer(document, player, active, initiative, position, maxWins) {
  const button = player.button || {};
  const card = text(document, 'article', '', `game-player card p-3 game-player-${position}`);
  const heading = text(document, 'h2', player.playerName || `Player ${position + 1}`, 'h3 mb-1');
  card.append(heading);
  card.append(text(document, 'div', button.name || 'Unnamed button', 'fw-semibold'));
  card.append(text(document, 'div', button.recipe ? `Recipe: ${button.recipe}` : '', 'small text-body-secondary'));
  card.append(text(document, 'div', playerScoreText(player, maxWins), 'small d-block'));
  if (active) card.append(text(document, 'span', 'Active player', 'badge text-bg-primary mt-2 me-1'));
  if (initiative) card.append(text(document, 'span', 'Initiative', 'badge text-bg-warning mt-2'));
  const dice = text(document, 'div', '', 'game-dice d-flex flex-wrap gap-2 mt-3');
  list(player.activeDieArray).forEach((die) => dice.append(renderDie(document, die)));
  list(player.capturedDieArray)
    .filter(wasJustCaptured)
    .forEach((die) => dice.append(renderDie(document, die, true)));
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
    .sort((a, b) => b.timestamp - a.timestamp);
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
  for (const [label, selected] of [['Chat & Game Log', 'all'], ['Chat', 'chat'], ['Game Log', 'action']]) {
    const button = text(document, 'button', label, `btn btn-sm ${selected === filter ? 'btn-primary' : 'btn-outline-primary'}`);
    button.type = 'button';
    button.addEventListener('click', () => {
      filter = selected;
      [...controls.children].forEach((child) => {
        child.className = `btn btn-sm ${child === button ? 'btn-primary' : 'btn-outline-primary'}`;
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
  disposeDiceScene();
  disposeDiceScene = () => {};
  setDiceOrientation = () => {};
  root.replaceChildren();
  const players = list(data.playerDataArray);
  if (players.length < 2) {
    root.append(text(root.ownerDocument, 'p', 'Game data is incomplete.', 'alert alert-warning'));
    return;
  }
  const document = root.ownerDocument;
  const current = Number.isInteger(data.currentPlayerIdx) && data.currentPlayerIdx >= 0 ? data.currentPlayerIdx : null;
  const viewing = current === null ? 0 : current;
  let bottomPlayerIndex = viewing;
  let flipped = false;
  const board = text(document, 'div', '', 'game-board');
  board.hidden = true;
  const controls = text(document, 'div', '', 'd-flex flex-wrap justify-content-between gap-2 mb-3');
  controls.append(text(document, 'h1', `Game ${data.gameId}`, 'h3 mb-0'));
  const flip = text(document, 'button', 'Flip orientation', 'btn btn-sm btn-outline-secondary');
  flip.type = 'button';
  flip.addEventListener('click', () => {
    flipped = !flipped;
    board.replaceChildren(playerAt(1), playerAt(0));
    topHud.replaceChildren(hudPlayerAt(1));
    bottomHud.replaceChildren(hudPlayerAt(0));
    bottomPlayerIndex = flipped ? 1 - viewing : viewing;
    setDiceOrientation(bottomPlayerIndex);
  });
  controls.append(flip);
  const action = text(document, 'a', 'Take action on buttonweavers.com', 'btn btn-sm btn-primary');
  action.href = gameUrl(data.gameId);
  action.target = '_blank';
  action.rel = 'noopener';
  controls.append(action);
  const toggleView = text(document, 'button', 'Show flat game state', 'btn btn-sm btn-outline-secondary');
  toggleView.type = 'button';
  toggleView.addEventListener('click', () => {
    const show3d = !scene.hidden;
    scene.hidden = show3d;
    board.hidden = !show3d;
    toggleView.textContent = show3d ? 'Show 3D game view' : 'Show flat game state';
  });
  controls.append(toggleView);
  root.append(controls, text(document, 'p', `${data.gameState || 'Game'} · Round ${data.roundNumber ?? '—'}`, 'text-body-secondary'));
  function playerAt(slot) {
    const bottomPlayer = flipped ? 1 - viewing : viewing;
    const index = slot === 0 ? bottomPlayer : 1 - bottomPlayer;
    return renderPlayer(
      document,
      players[index],
      data.activePlayerIdx === index,
      data.playerWithInitiativeIdx === index,
      slot,
      data.maxWins,
    );
  }
  function hudPlayerAt(slot) {
    const bottomPlayer = flipped ? 1 - viewing : viewing;
    const index = slot === 0 ? bottomPlayer : 1 - bottomPlayer;
    return renderHudPlayer(
      document,
      players[index],
      data.activePlayerIdx === index,
      data.playerWithInitiativeIdx === index,
      slot,
      data.maxWins,
    );
  }
  board.append(playerAt(1), playerAt(0));
  const scene = text(document, 'div', '', 'game-play-area');
  const canvas = text(document, 'div', '', 'game-3d-board');
  canvas.setAttribute('aria-hidden', 'true');
  const topHud = text(document, 'div', '', 'game-3d-hud game-3d-hud-top');
  topHud.append(hudPlayerAt(1));
  const bottomHud = text(document, 'div', '', 'game-3d-hud game-3d-hud-bottom');
  bottomHud.append(hudPlayerAt(0));
  scene.append(topHud, canvas, bottomHud);
  root.append(scene, board);
  if (document.defaultView) {
    import('./dice-scene.js').then(({ renderDiceScene }) => {
      if (!canvas.isConnected) return;
      const instance = renderDiceScene(canvas, players, bottomPlayerIndex);
      if (canvas.isConnected) {
        disposeDiceScene = instance.dispose;
        setDiceOrientation = instance.setBottomPlayerIndex;
      } else {
        instance.dispose();
      }
    }).catch(() => {
      scene.hidden = true;
      board.hidden = false;
      toggleView.hidden = true;
    });
  }
  const privateChat = current === null && players.some((player) => player.isChatPrivate);
  renderActivity(document, root, data, privateChat);
}
