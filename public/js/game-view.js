import { gameUrl } from './games.js';
import { buildReplaySteps } from './game-replay.js';
import { profileUrl } from './links.js';

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
  const role = die.replayRole;
  const roleLabel = { attacker: 'Attacker', target: 'Target', changed: 'Changed' }[role];
  const card = text(
    document,
    'div',
    '',
    `game-die card p-2 text-center${captured ? ' game-die-captured' : ''}${roleLabel ? ` game-die-replay-${role}` : ''}`,
  );
  if (card.dataset) card.dataset.recipe = info.recipe;
  if (captured) card.setAttribute('aria-disabled', 'true');
  if (roleLabel) card.append(text(document, 'span', roleLabel, 'game-die-replay-label badge'));
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

function hudDieText(die) {
  const info = dieLabel(die);
  const role = { attacker: 'Attacker', target: 'Target', changed: 'Changed' }[die.replayRole];
  return [
    role,
    `${info.rolled ?? '—'}·d${info.sides || info.recipe}`,
    info.skills && `Skills: ${info.skills}`,
    info.statuses && `Status: ${info.statuses}`,
  ].filter(Boolean).join(' · ');
}

function appendHudSection(document, card, label, items) {
  if (!items.length) return;
  const row = text(document, 'div', '', 'game-hud-section');
  row.append(text(document, 'span', `${label}:`, 'game-hud-label'));
  const pills = text(document, 'div', '', 'game-hud-pills');
  items.forEach((item) => pills.append(text(document, 'span', item, 'game-hud-pill')));
  row.append(pills);
  card.append(row);
}

function renderHudPlayer(document, player, active, initiative, position, maxWins) {
  const button = player.button || {};
  const card = text(document, 'article', '', `game-hud-player game-hud-player-${position}`);
  const header = text(document, 'div', '', 'game-hud-header');
  const title = text(document, 'div', '', 'game-hud-title');
  const titleCopy = text(document, 'div', '', 'game-hud-title-copy');
  const name = text(document, player.playerName ? 'a' : 'strong', player.playerName || `Player ${position + 1}`, 'game-hud-name');
  if (player.playerName) name.href = profileUrl(player.playerName);
  titleCopy.append(
    name,
    text(document, 'div', `${button.name || 'Unnamed button'}${button.recipe ? ` · ${button.recipe}` : ''}`, 'game-hud-button'),
  );
  title.append(titleCopy);
  const badges = text(document, 'div', '', 'game-hud-badges');
  if (active) badges.append(text(document, 'span', 'Active player', 'badge text-bg-primary'));
  if (initiative) badges.append(text(document, 'span', 'Initiative', 'badge text-bg-warning'));
  header.append(title, badges);
  card.append(header, text(document, 'div', playerScoreText(player, maxWins), 'game-hud-score'));

  appendHudSection(document, card, 'Button skills', list(value(button, 'skillArray', 'skills')));
  appendHudSection(document, card, 'Active dice', list(player.activeDieArray).map(hudDieText));
  appendHudSection(document, card, 'Captured dice', list(player.capturedDieArray).map(hudDieText));
  appendHudSection(document, card, 'Out of play dice', list(player.outOfPlayDieArray).map(hudDieText));
  return card;
}

function renderPlayer(document, player, active, initiative, position, maxWins) {
  const button = player.button || {};
  const card = text(document, 'article', '', `game-player card p-3 game-player-${position}`);
  const heading = text(document, player.playerName ? 'a' : 'h2', player.playerName || `Player ${position + 1}`, 'h3 mb-1');
  if (player.playerName) heading.href = profileUrl(player.playerName);
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
    .map((item, index) => ({ ...item, logIndex: item.type === 'action' ? index : null }))
    .sort((a, b) => b.timestamp - a.timestamp);
  let filter = 'chat';
  let selectedLogIndex = null;
  const render = () => {
    stream.replaceChildren();
    const visible = entries.filter((item) =>
      (item.type === 'action' && item.logIndex === selectedLogIndex) ||
      filter === 'all' ||
      item.type === filter);
    visible.forEach((item) => {
      const selected = item.type === 'action' && item.logIndex === selectedLogIndex;
      const row = text(
        document,
        'article',
        '',
        `game-event game-event-${item.type} border-bottom py-2${selected ? ' game-event-current-step' : ''}`,
      );
      if (item.type === 'action') row.setAttribute('aria-current', selected ? 'step' : 'false');
      const author = text(document, item.player ? 'a' : 'strong', item.player || (item.type === 'chat' ? 'Chat' : 'Game'));
      if (item.player) author.href = profileUrl(item.player);
      row.append(author, text(document, 'span', ` · ${item.message}`));
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
  return (logIndex) => {
    selectedLogIndex = logIndex ?? null;
    if (selectedLogIndex !== null && filter === 'chat') {
      filter = 'all';
      [...controls.children].forEach((child) => {
        child.className = `btn btn-sm ${child.textContent === 'Chat & Game Log' ? 'btn-primary' : 'btn-outline-primary'}`;
      });
    }
    render();
  };
}

export function renderGameView(root, data, replayOptions = {}) {
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
  const replaySteps = buildReplaySteps(data.gameActionLog, players, data.roundNumber);
  const currentStepIndex = replaySteps.length - 1;
  const timestampParam = replayOptions.timestamp;
  const hasTimestamp = timestampParam !== null && timestampParam !== undefined;
  const requestedStep = hasTimestamp && /^\d+$/.test(String(timestampParam))
    ? replaySteps.findIndex((step) => step.type !== 'current' && String(step.timestamp) === String(timestampParam))
    : -1;
  const invalidStep = hasTimestamp && requestedStep < 0;
  let stepIndex = invalidStep || !hasTimestamp ? currentStepIndex : requestedStep;
  let viewPlayers = replaySteps[stepIndex].players;
  let sceneVersion = 0;
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
  const replayControls = text(document, 'div', '', 'd-flex flex-wrap align-items-center gap-2 mb-2');
  const previous = text(document, 'button', 'Previous step', 'btn btn-sm btn-outline-primary');
  previous.type = 'button';
  const next = text(document, 'button', 'Next step', 'btn btn-sm btn-outline-primary');
  next.type = 'button';
  const returnToCurrent = text(document, 'button', 'Return to current game', 'btn btn-sm btn-outline-secondary');
  returnToCurrent.type = 'button';
  const stepLink = text(document, 'a', 'Link to this step', 'btn btn-sm btn-link');
  replayControls.append(previous, next, returnToCurrent, stepLink);
  const replayStatus = text(document, 'p', '', 'small text-body-secondary mb-1');
  const attackDirection = text(document, 'p', 'Attack direction: attackers → targets.', 'game-replay-attack-direction');
  attackDirection.hidden = true;
  const replayNotice = text(
    document,
    'p',
    'Replay is approximate and uses only attacks found in the available game log.',
    'small text-body-secondary',
  );
  if (invalidStep) {
    replayStatus.textContent = 'Replay step not found; showing the current game state.';
  }
  root.append(
    controls,
    text(document, 'p', `${data.gameState || 'Game'} · Round ${data.roundNumber ?? '—'}`, 'text-body-secondary'),
    replayControls,
    replayStatus,
    attackDirection,
    replayNotice,
  );
  let highlightActivity = () => {};
  function playerAt(slot) {
    const bottomPlayer = flipped ? 1 - viewing : viewing;
    const index = slot === 0 ? bottomPlayer : 1 - bottomPlayer;
    return renderPlayer(
      document,
      viewPlayers[index],
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
      viewPlayers[index],
      data.activePlayerIdx === index,
      data.playerWithInitiativeIdx === index,
      slot,
      data.maxWins,
    );
  }
  const scene = text(document, 'div', '', 'game-play-area');
  const canvas = text(document, 'div', '', 'game-3d-board');
  canvas.setAttribute('aria-hidden', 'true');
  const topHud = text(document, 'div', '', 'game-3d-hud game-3d-hud-top');
  const bottomHud = text(document, 'div', '', 'game-3d-hud game-3d-hud-bottom');
  scene.append(topHud, canvas, bottomHud);
  root.append(scene, board);
  const renderBoard = () => {
    board.replaceChildren(playerAt(1), playerAt(0));
    topHud.replaceChildren(hudPlayerAt(1));
    bottomHud.replaceChildren(hudPlayerAt(0));
  };
  const renderScene = () => {
    const generation = ++sceneVersion;
    disposeDiceScene();
    disposeDiceScene = () => {};
    if (!document.defaultView) return;
    import('./dice-scene.js').then(({ renderDiceScene }) => {
      if (!canvas.isConnected || generation !== sceneVersion) return;
      const instance = renderDiceScene(canvas, viewPlayers, bottomPlayerIndex);
      if (canvas.isConnected && generation === sceneVersion) {
        disposeDiceScene = instance.dispose;
        setDiceOrientation = instance.setBottomPlayerIndex;
      } else {
        instance.dispose();
      }
    }).catch(() => {
      if (generation !== sceneVersion) return;
      scene.hidden = true;
      board.hidden = false;
      toggleView.hidden = true;
    });
  };
  const updateStep = (nextStepIndex, updateHash = true) => {
    stepIndex = nextStepIndex;
    const step = replaySteps[stepIndex];
    viewPlayers = step.players;
    highlightActivity(step.logIndex);
    renderBoard();
    renderScene();
    const isHistory = step.type !== 'current';
    action.hidden = isHistory;
    previous.disabled = stepIndex === 0;
    next.disabled = stepIndex === currentStepIndex;
    returnToCurrent.hidden = !isHistory;
    if (isHistory) {
      const attackText = step.type === 'attack'
        ? `${step.player} used ${step.attackType} attack against ${step.players[step.targetIndex].playerName}`
        : step.type === 'result'
          ? 'Attack result'
          : step.message;
      replayStatus.textContent = `History · ${attackText} · step ${stepIndex + 1} of ${currentStepIndex}`;
      attackDirection.hidden = step.type !== 'attack';
    } else if (!invalidStep) {
      replayStatus.textContent = 'Current game state.';
      attackDirection.hidden = true;
    }
    const gameHash = `#game?gameId=${encodeURIComponent(data.gameId)}`;
    const stepHash = step.type === 'current' || step.timestamp === null || step.timestamp === undefined
      ? gameHash
      : `${gameHash}&timestamp=${encodeURIComponent(String(step.timestamp))}`;
    stepLink.href = stepHash;
    if (updateHash && document.defaultView?.history?.replaceState) {
      document.defaultView.history.replaceState(null, '', stepHash);
    }
  };
  previous.addEventListener('click', () => {
    if (stepIndex > 0) updateStep(stepIndex - 1);
  });
  next.addEventListener('click', () => {
    if (stepIndex < currentStepIndex) updateStep(stepIndex + 1);
  });
  returnToCurrent.addEventListener('click', () => updateStep(currentStepIndex));
  updateStep(stepIndex, false);
  const privateChat = current === null && players.some((player) => player.isChatPrivate);
  highlightActivity = renderActivity(document, root, data, privateChat);
  highlightActivity(replaySteps[stepIndex].logIndex);
}
