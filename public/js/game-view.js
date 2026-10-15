import { gameUrl } from './games.js';
import { renderDiceBoard } from './dice-board.js';
import { buildCapturedHistory, buildReplaySteps } from './game-replay.js';
import { profileUrl } from './links.js';

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

function renderPlayer(document, player, active, initiative, position, maxWins) {
  const button = player.button || {};
  const card = text(document, 'article', '', `game-player card p-3 game-player-${position}`);
  const heading = text(document, player.playerName ? 'a' : 'h2', player.playerName || `Player ${position + 1}`, 'h3 mb-1');
  if (player.playerName) heading.href = profileUrl(player.playerName);
  card.append(heading);
  card.append(text(document, 'div', button.name || 'Unnamed button', 'fw-semibold'));
  card.append(text(document, 'div', button.recipe ? `Recipe: ${button.recipe}` : '', 'small text-body-secondary'));
  const buttonSkills = list(value(button, 'skillArray', 'skills'));
  if (buttonSkills.length) card.append(text(document, 'div', `Skills: ${buttonSkills.join(', ')}`, 'small text-body-secondary'));
  card.append(text(document, 'div', playerScoreText(player, maxWins), 'small d-block'));
  if (active) card.append(text(document, 'span', 'Active player', 'badge text-bg-primary mt-2 me-1'));
  if (initiative) card.append(text(document, 'span', 'Initiative', 'badge text-bg-warning mt-2'));
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
  const current = Number.isInteger(data.currentPlayerIdx) && data.currentPlayerIdx >= 0 ? data.currentPlayerIdx : null;
  const viewing = current === null ? 0 : current;
  let flipped = false;
  const colorPreferences = {
    neutralOpponentColor: replayOptions.colorPreferences?.neutral_color_b || '#dddddd',
    neutralPlayerColor: replayOptions.colorPreferences?.neutral_color_a || '#cccccc',
  };
  const board = text(document, 'div', '', 'game-board');
  const controls = text(document, 'div', '', 'd-flex flex-wrap justify-content-between gap-2 mb-3');
  controls.append(text(document, 'h1', `Game ${data.gameId}`, 'h3 mb-0'));
  const flip = text(document, 'button', 'Flip orientation', 'btn btn-sm btn-outline-secondary');
  flip.type = 'button';
  flip.addEventListener('click', () => {
    flipped = !flipped;
    renderBoard();
  });
  controls.append(flip);
  const action = text(document, 'a', 'Take action on buttonweavers.com', 'btn btn-sm btn-primary');
  action.href = gameUrl(data.gameId);
  action.target = '_blank';
  action.rel = 'noopener';
  controls.append(action);
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
    board,
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
  const renderBoard = () => {
    board.replaceChildren(
      playerAt(1),
      renderDiceBoard(document, viewPlayers, {
        bottomPlayerIndex: playerIndexAt(0),
        currentViewerIndex: current,
        neutralOpponentColor: colorPreferences.neutralOpponentColor,
        neutralPlayerColor: colorPreferences.neutralPlayerColor,
        attackType: selectedStep.type === 'attack' ? selectedStep.attackType : null,
      }),
      playerAt(0),
    );
  };
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
