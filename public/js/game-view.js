import { gameUrl } from './games.js';
import { buildCapturedHistory, buildReplaySteps, formatDieRecipe } from './game-replay.js';
import { profileUrl } from './links.js';

let disposeDiceScene = () => {};
let setDiceOrientation = () => {};
let setDiceZoom = () => {};

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
  const rolled = value(die, 'value', 'currentValue', 'roll');
  const skills = list(value(die, 'skillArray', 'skills')).join(', ');
  const statuses = list(value(die, 'statusArray', 'statuses', 'properties'))
    .filter((status) => status !== 'WasJustCaptured')
    .join(', ');
  return { recipe, recipeLabel: formatDieRecipe(die), rolled, skills, statuses };
}

function renderDie(document, die, captured = false, color = '') {
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
  if (/^#[\da-f]{6}$/i.test(color)) card.style.borderTopColor = color;
  if (captured) card.setAttribute('aria-disabled', 'true');
  if (roleLabel) card.append(text(document, 'span', roleLabel, 'game-die-replay-label badge'));
  card.append(
    text(document, 'strong', info.rolled ?? '—', 'game-die-value d-block'),
    text(document, 'span', info.recipeLabel, 'small'),
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
    `${info.rolled ?? '—'}·${info.recipeLabel}`,
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
  return card;
}

function renderFlatField(document, players, viewing, flipped, colorPreferences, currentViewerIndex, attackStep) {
  const field = text(document, 'div', '', 'game-flat-field');
  for (const slot of [1, 0]) {
    const playerIndex = slot === 0
      ? (flipped ? 1 - viewing : viewing)
      : 1 - (flipped ? 1 - viewing : viewing);
    const player = players[playerIndex];
    const side = text(document, 'section', '', `game-flat-side game-flat-side-${slot}`);
    side.append(text(document, 'h2', `${player.playerName || `Player ${playerIndex + 1}`} dice`, 'h5'));
    const activeDice = text(document, 'div', '', 'game-flat-active-dice');
    list(player.activeDieArray).forEach((die) =>
      activeDice.append(renderDie(document, die, false, player.playerColor)));
    side.append(activeDice);

    const captured = list(player.replayCapturedDieArray);
    if (captured.length) {
      const pile = text(document, 'div', '', 'game-flat-captured-pile');
      pile.append(text(document, 'h3', `Captured by ${player.playerName || `Player ${playerIndex + 1}`}`, 'small fw-semibold'));
      const capturedDice = text(document, 'div', '', 'game-flat-captured-dice');
      captured.forEach((die) => {
        const color = currentViewerIndex !== null && playerIndex === currentViewerIndex
          ? colorPreferences.neutralOpponentColor
          : currentViewerIndex !== null
            ? colorPreferences.neutralPlayerColor
            : players[die.originalPlayerIndex]?.playerColor;
        capturedDice.append(renderDie(document, die, true, color));
      });
      pile.append(capturedDice);
      side.append(pile);
    }
    field.append(side);
  }
  if (attackStep) {
    const attacker = players[attackStep.playerIndex];
    const target = players[attackStep.targetIndex];
    field.append(text(
      document,
      'p',
      `${attacker.playerName} → ${target.playerName} · ${attackStep.attackType} attack`,
      'game-flat-attack-direction',
    ));
  }
  return field;
}

function entry(data, type) {
  return list(data).map((item) => ({
    type,
    timestamp: Number(item.timestamp) || 0,
    player: item.player || '',
    message: item.message || '',
  }));
}

function renderActivity(document, root, data, privateChat, selectLogEntry = () => {}) {
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
      if (item.type === 'action') {
        row.setAttribute('aria-current', selected ? 'step' : 'false');
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.addEventListener('click', (event) => {
          if (event.target?.tagName === 'A') return;
          selectLogEntry(item.logIndex);
        });
        row.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          selectLogEntry(item.logIndex);
        });
      }
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
  setDiceZoom = () => {};
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
  const phaseParam = replayOptions.phase;
  const replayParam = replayOptions.replay;
  const hasReplay = Boolean(replayParam);
  const hasTimestamp = timestampParam !== null && timestampParam !== undefined;
  const requestedStep = hasReplay
    ? replaySteps.findIndex((step) => step.replayId === replayParam)
    : hasTimestamp && /^\d+$/.test(String(timestampParam))
      ? replaySteps.findIndex((step) => step.type !== 'current' &&
      String(step.timestamp) === String(timestampParam) &&
      (!phaseParam || step.type === phaseParam))
      : -1;
  const invalidStep = (hasReplay || hasTimestamp) && requestedStep < 0;
  let stepIndex = invalidStep || (!hasReplay && !hasTimestamp) ? currentStepIndex : requestedStep;
  let viewPlayers = replaySteps[stepIndex].players;
  let selectedStep = replaySteps[stepIndex];
  let sceneVersion = 0;
  const current = Number.isInteger(data.currentPlayerIdx) && data.currentPlayerIdx >= 0 ? data.currentPlayerIdx : null;
  const viewing = current === null ? 0 : current;
  let bottomPlayerIndex = viewing;
  let flipped = false;
  let zoom = 1;
  const colorPreferences = {
    neutralOpponentColor: replayOptions.colorPreferences?.neutral_color_b || '#dddddd',
    neutralPlayerColor: replayOptions.colorPreferences?.neutral_color_a || '#cccccc',
  };
  const board = text(document, 'div', '', 'game-board');
  board.hidden = true;
  const controls = text(document, 'div', '', 'd-flex flex-wrap justify-content-between gap-2 mb-3');
  controls.append(text(document, 'h1', `Game ${data.gameId}`, 'h3 mb-0'));
  const flip = text(document, 'button', 'Flip orientation', 'btn btn-sm btn-outline-secondary');
  flip.type = 'button';
  flip.addEventListener('click', () => {
    flipped = !flipped;
    renderBoard();
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
  const roundLabel = text(document, 'label', 'Round', 'small fw-semibold');
  const roundSelect = text(document, 'select', '', 'form-select form-select-sm w-auto');
  roundSelect.setAttribute('aria-label', 'Replay round');
  const replayRounds = [...new Set(replaySteps
    .filter((step) => step.type !== 'current' && Number.isFinite(step.roundNumber))
    .map((step) => step.roundNumber))];
  replayRounds.forEach((round) => {
    const approximate = replaySteps.some((step) =>
      step.type !== 'current' && step.roundNumber === round && step.approximateRound);
    const option = text(document, 'option', `Round ${round}${approximate ? ' (approximate)' : ''}`);
    option.value = String(round);
    roundSelect.append(option);
  });
  roundLabel.append(roundSelect);
  roundLabel.hidden = replayRounds.length < 2;
  replayControls.append(previous, next, roundLabel, returnToCurrent, stepLink);
  const replayStatus = text(document, 'p', '', 'small text-body-secondary mb-1');
  const zoomControls = text(document, 'div', '', 'game-3d-zoom-controls');
  const zoomOut = text(document, 'button', '−', 'btn btn-sm btn-dark');
  zoomOut.type = 'button';
  zoomOut.setAttribute('aria-label', 'Zoom out');
  const zoomLabel = text(document, 'span', '1×', 'game-3d-zoom-label');
  const zoomIn = text(document, 'button', '+', 'btn btn-sm btn-dark');
  zoomIn.type = 'button';
  zoomIn.setAttribute('aria-label', 'Zoom in');
  const zoomReset = text(document, 'button', 'Reset', 'btn btn-sm btn-dark');
  zoomReset.type = 'button';
  zoomReset.setAttribute('aria-label', 'Reset zoom');
  zoomControls.append(zoomOut, zoomLabel, zoomIn, zoomReset);
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
    replayNotice,
  );
  let highlightActivity = () => {};
  function playerIndexAt(slot) {
    const bottomPlayer = flipped ? 1 - viewing : viewing;
    return slot === 0 ? bottomPlayer : 1 - bottomPlayer;
  }
  function playerAt(slot) {
    const index = playerIndexAt(slot);
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
  canvas.append(zoomControls);
  const topHud = text(document, 'div', '', 'game-3d-hud game-3d-hud-top');
  const bottomHud = text(document, 'div', '', 'game-3d-hud game-3d-hud-bottom');
  scene.append(topHud, canvas, bottomHud);
  root.append(scene, board);
  const renderBoard = () => {
    board.replaceChildren(
      playerAt(1),
      renderFlatField(
        document,
        viewPlayers,
        viewing,
        flipped,
        colorPreferences,
        current,
        selectedStep.type === 'attack' ? selectedStep : null,
      ),
      playerAt(0),
    );
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
      const step = replaySteps[stepIndex];
      const instance = renderDiceScene(canvas, viewPlayers, bottomPlayerIndex, {
        zoom,
        attackType: step.type === 'attack' ? step.attackType : null,
        viewPlayerIndex: current,
        neutralOpponentColor: colorPreferences.neutralOpponentColor,
        neutralPlayerColor: colorPreferences.neutralPlayerColor,
      });
      if (canvas.isConnected && generation === sceneVersion) {
        disposeDiceScene = instance.dispose;
        setDiceOrientation = instance.setBottomPlayerIndex;
        setDiceZoom = instance.setZoom || (() => {});
      } else {
        instance.dispose();
      }
    }).catch(() => {
      if (generation !== sceneVersion) return;
      scene.hidden = true;
      board.hidden = false;
      toggleView.hidden = true;
      zoomControls.hidden = true;
    });
  };
  const setZoom = (nextZoom) => {
    zoom = Math.max(1, Math.min(2.5, nextZoom));
    zoomLabel.textContent = `${zoom.toFixed(1).replace(/\.0$/, '')}×`;
    setDiceZoom(zoom);
  };
  zoomOut.addEventListener('click', () => setZoom(zoom - 0.25));
  zoomIn.addEventListener('click', () => setZoom(zoom + 0.25));
  zoomReset.addEventListener('click', () => setZoom(1));
  const updateStep = (nextStepIndex, updateHash = true) => {
    stepIndex = nextStepIndex;
    const step = replaySteps[stepIndex];
    selectedStep = step;
    const throughLogIndex = step.type === 'current' ? Infinity : step.logIndex;
    const capturedHistory = buildCapturedHistory(
      data.gameActionLog,
      players,
      throughLogIndex,
      step.roundNumber,
      step.type !== 'attack',
    );
    if (step.type === 'result') {
      capturedHistory.forEach((captures) => captures.forEach((die) => {
        if (die.logIndex === step.logIndex) die.replayRole = 'changed';
      }));
    }
    if (step.type === 'current') {
      players.forEach((player, index) => {
        const currentCaptures = list(player.capturedDieArray);
        const counts = new Map();
        capturedHistory[index].forEach((die) => {
          const key = `${die.recipe}:${die.value}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        });
        currentCaptures.forEach((die) => {
          const key = `${value(die, 'recipe', 'originalRecipe')}:${value(die, 'value', 'currentValue', 'roll')}`;
          const count = counts.get(key) || 0;
          if (count < currentCaptures.filter((candidate) =>
            `${value(candidate, 'recipe', 'originalRecipe')}:${value(candidate, 'value', 'currentValue', 'roll')}` === key).length) {
            capturedHistory[index].push({
              ...die,
              originalPlayerIndex: 1 - index,
              capturedByIndex: index,
            });
            counts.set(key, count + 1);
          }
        });
      });
    }
    viewPlayers = step.players.map((player, index) => ({
      ...player,
      replayCapturedDieArray: capturedHistory[index],
    }));
    highlightActivity(step.logIndex);
    renderBoard();
    renderScene();
    const isHistory = step.type !== 'current';
    action.hidden = isHistory;
    previous.disabled = stepIndex === 0;
    next.disabled = stepIndex === currentStepIndex;
    returnToCurrent.hidden = !isHistory;
    if (Number.isFinite(step.roundNumber)) roundSelect.value = String(step.roundNumber);
    if (isHistory) {
      const attackText = step.type === 'attack'
        ? `${step.player} used ${step.attackType} attack against ${step.players[step.targetIndex].playerName}`
        : step.type === 'result'
          ? 'Attack result'
          : step.message;
      const roundText = Number.isFinite(step.roundNumber) ? `Round ${step.roundNumber} · ` : '';
      const approximation = step.approximateRound ? 'Approximate setup · ' : '';
      replayStatus.textContent = `History · ${roundText}${approximation}${attackText} · step ${stepIndex + 1} of ${currentStepIndex}`;
    } else if (!invalidStep) {
      replayStatus.textContent = 'Current game state.';
    }
    const gameHash = `#game?gameId=${encodeURIComponent(data.gameId)}`;
    const stepHash = step.type === 'current' || step.timestamp === null || step.timestamp === undefined
      ? gameHash
      : `${gameHash}&replay=${encodeURIComponent(step.replayId)}`;
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
  roundSelect.addEventListener('change', () => {
    const selectedRound = Number(roundSelect.value);
    const firstStep = replaySteps.findIndex((step) => step.type !== 'current' && step.roundNumber === selectedRound);
    if (firstStep >= 0) updateStep(firstStep);
  });
  updateStep(stepIndex, false);
  const privateChat = current === null && players.some((player) => player.isChatPrivate);
  highlightActivity = renderActivity(document, root, data, privateChat, (logIndex) => {
    const selectedIndex = replaySteps.findIndex((step) =>
      step.type !== 'current' && step.logIndex === logIndex);
    if (selectedIndex >= 0) updateStep(selectedIndex);
  });
  highlightActivity(replaySteps[stepIndex].logIndex);
}
