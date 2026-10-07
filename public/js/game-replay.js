const skillNames = {
  '+': 'Auxiliary',
  B: 'Berserk',
  b: 'Boom',
  c: 'Chance',
  D: 'Doppelganger',
  F: 'Fire',
  f: 'Focus',
  I: 'Insult',
  J: 'Jolt',
  k: 'Konstant',
  '&': 'Mad',
  M: 'Maximum',
  H: 'Mighty',
  '?': 'Mood',
  m: 'Morphing',
  n: 'Null',
  o: 'Ornery',
  p: 'Poison',
  q: 'Queer',
  '%': 'Radioactive',
  G: 'Rage',
  r: 'Reserve',
  '#': 'Rush',
  s: 'Shadow',
  w: 'Slow',
  z: 'Speed',
  d: 'Stealth',
  g: 'Stinger',
  '^': 'TimeAndSpace',
  t: 'Trip',
  '!': 'Turbo',
  v: 'Value',
  '`': 'Warrior',
  h: 'Weak',
};

const list = (value) => Array.isArray(value) ? value : [];

function parsedSkills(recipe) {
  const prefix = recipe.split('(')[0].replace(/=[\d/]+$/, '');
  return [...prefix].map((code) => skillNames[code]).filter(Boolean);
}

export function parseDieNotation(notation) {
  if (typeof notation !== 'string') return null;
  const match = notation.trim().match(/^(.+):([A-Za-z0-9]+)$/);
  if (!match) return null;

  const recipe = match[1].trim();
  const sideMatch = recipe.match(/=(\d+)(?=[^=]*$)/) ||
    recipe.match(/\((\d+)\)[!?]*$/) ||
    recipe.match(/^(\d+)$/);
  return {
    recipe,
    sides: sideMatch ? Number(sideMatch[1]) : null,
    value: /^\d+$/.test(match[2]) ? Number(match[2]) : match[2],
    skillArray: parsedSkills(recipe),
  };
}

function parseDice(notation) {
  if (!notation.trim()) return [];
  const parts = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < notation.length; index += 1) {
    if (notation[index] === '(') depth += 1;
    if (notation[index] === ')') depth -= 1;
    if (notation[index] === ',' && depth === 0) {
      parts.push(notation.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(notation.slice(start));
  const dice = parts.map(parseDieNotation);
  return dice.every(Boolean) ? dice : null;
}

export function parseAttackMessage(message) {
  if (typeof message !== 'string') return null;
  const match = message.match(/\bperformed\s+(.+?)\s+attack\s+using\s+\[([^\]]*)\]\s+against\s+\[([^\]]*)\]/i);
  if (!match) return null;

  const attackers = parseDice(match[2]);
  const targets = parseDice(match[3]);
  if (!attackers?.length || !targets?.length) return null;
  return { attackType: match[1], attackers, targets };
}

function clonePlayers(players) {
  return list(players).map((player) => ({
    ...player,
    activeDieArray: list(player.activeDieArray).map((die) => ({ ...die })),
    capturedDieArray: list(player.capturedDieArray).map((die) => ({ ...die })),
    outOfPlayDieArray: list(player.outOfPlayDieArray).map((die) => ({ ...die })),
  }));
}

function clearReplayRoles(players) {
  players.forEach((player) => {
    for (const die of [
      ...player.activeDieArray,
      ...player.capturedDieArray,
      ...player.outOfPlayDieArray,
    ]) {
      delete die.replayRole;
    }
  });
}

function recipeKey(recipe) {
  return String(recipe ?? '').replace(/^\((.*)\)$/, '$1');
}

function dieMatches(die, parsed) {
  const recipe = recipeKey(die.recipe ?? die.originalRecipe);
  if (recipe && recipe === recipeKey(parsed.recipe)) return true;
  if (parsed.sides === null) return false;
  const sides = Number(die.sides ?? die.size ?? die.recipe);
  if (sides !== parsed.sides) return false;
  return parsed.skillArray.every((skill) => list(die.skillArray ?? die.skills).includes(skill));
}

function findDice(player, parsedDice, includeCaptured = true) {
  const used = new Set();
  return parsedDice.map((parsed) => {
    const groups = [player.activeDieArray, ...(includeCaptured ? [player.capturedDieArray] : [])];
    for (const group of groups) {
      const index = group.findIndex((die) => !used.has(die) && dieMatches(die, parsed));
      if (index !== -1) {
        const die = group[index];
        used.add(die);
        return { die, group, index, parsed };
      }
    }
    return { die: null, parsed };
  });
}

function restoreDice(player, parsedDice) {
  const restored = [];
  for (const match of findDice(player, parsedDice)) {
    let die = match.die;
    if (die && match.group === player.capturedDieArray) {
      player.capturedDieArray.splice(match.index, 1);
      player.activeDieArray.push(die);
    }
    if (!die) {
      die = {
        recipe: match.parsed.recipe,
        sides: match.parsed.sides,
        skillArray: match.parsed.skillArray,
        properties: [],
      };
      player.activeDieArray.push(die);
    } else {
      die.value = match.parsed.value;
      if (match.parsed.sides !== null && !die.sides && !die.size) die.sides = match.parsed.sides;
      if (!die.recipe) die.recipe = match.parsed.recipe;
      if (!list(die.skillArray).length && match.parsed.skillArray.length) {
        die.skillArray = match.parsed.skillArray;
      }
      die.properties = list(die.properties).filter((property) => property !== 'WasJustCaptured');
    }
    die.replayRole = match.parsed.replayRole;
    restored.push(die);
  }
  return restored;
}

function markDice(player, parsedDice, role) {
  findDice(player, parsedDice).forEach(({ die }) => {
    if (die) die.replayRole = role;
  });
}

function loggedAttackResults(message) {
  const rerolls = [];
  const captures = [];
  const recipeChanges = [];
  for (const match of message.matchAll(/\b(Attacker|Defender)\s+(\S+)(?:(?!;).)*?\brerolled\s+(\d+)\s*=>\s*(\d+)/gi)) {
    rerolls.push({
      role: match[1].toLowerCase(),
      recipe: match[2],
      from: Number(match[3]),
      to: Number(match[4]),
    });
  }
  for (const match of message.matchAll(/\bDefender\s+(\S+)(?:(?!;).)*?\bwas captured\b/gi)) {
    captures.push(match[1]);
  }
  for (const match of message.matchAll(/\b(Attacker|Defender)\s+(\S+)\s+recipe changed (?:from\s+\S+\s+)?to\s+(\S+)/gi)) {
    recipeChanges.push({ role: match[1].toLowerCase(), from: match[2], to: match[3].replace(/,$/, '') });
  }
  return { rerolls, captures, recipeChanges };
}

function changedRecipe(results, role, recipe) {
  return results.recipeChanges.find((change) =>
    change.role === role && recipeKey(change.from) === recipeKey(recipe))?.to;
}

function capturedTargets(attack, captureRecipes) {
  const used = new Set();
  return new Set(captureRecipes.map((recipe) => {
    const target = attack.targets.find((die) =>
      !used.has(die) && recipeKey(die.recipe) === recipeKey(recipe));
    if (target) used.add(target);
    return target;
  }).filter(Boolean));
}

function takeActiveDie(player, parsed) {
  const index = player.activeDieArray.findIndex((die) => dieMatches(die, parsed));
  return index < 0 ? null : player.activeDieArray.splice(index, 1)[0];
}

function takeCapturedDie(player, parsed) {
  const index = player.capturedDieArray.findIndex((die) => dieMatches(die, parsed));
  return index < 0 ? null : player.capturedDieArray.splice(index, 1)[0];
}

function restoreTargetDice(attacker, defender, parsedDice, captured, results) {
  const used = new Set();
  return parsedDice.map((parsed) => {
    let die = null;
    let restoredTransformed = false;
    if (captured.has(parsed)) {
      die = takeCapturedDie(attacker, parsed);
      const resultRecipe = changedRecipe(results, 'defender', parsed.recipe);
      if (!die && resultRecipe) {
        die = takeCapturedDie(attacker, { ...parsed, recipe: resultRecipe });
        restoredTransformed = Boolean(die);
      }
    }
    if (!die) {
      const index = defender.activeDieArray.findIndex((candidate) =>
        !used.has(candidate) && dieMatches(candidate, parsed));
      if (index >= 0) die = defender.activeDieArray.splice(index, 1)[0];
    }
    if (!die) {
      die = {
        recipe: parsed.recipe,
        sides: parsed.sides,
        skillArray: parsed.skillArray,
        properties: [],
      };
    }
    used.add(die);
    if (restoredTransformed) die.recipe = parsed.recipe;
    die.value = parsed.value;
    die.properties = list(die.properties).filter((property) => property !== 'WasJustCaptured');
    defender.activeDieArray.push(die);
    return die;
  });
}

function applyAttackResult(players, playerIndex, targetIndex, attack, results, captured) {
  const attacker = players[playerIndex];
  const defender = players[targetIndex];
  const capturedDice = [];
  for (const parsed of captured) {
    let die = takeActiveDie(defender, parsed);
    const resultRecipe = changedRecipe(results, 'defender', parsed.recipe);
    if (!die) die = attacker.capturedDieArray.find((candidate) =>
      dieMatches(candidate, parsed) || (resultRecipe && dieMatches(candidate, { ...parsed, recipe: resultRecipe }))) || null;
    if (!die) {
      die = {
        recipe: parsed.recipe,
        sides: parsed.sides,
        skillArray: parsed.skillArray,
        properties: [],
      };
    }
    die.recipe = resultRecipe || die.recipe || parsed.recipe;
    die.value = parsed.value;
    die.properties = [...list(die.properties).filter((property) => property !== 'WasJustCaptured'), 'WasJustCaptured'];
    if (!attacker.capturedDieArray.includes(die)) attacker.capturedDieArray.push(die);
    capturedDice.push(die);
  }

  const usedRerollDice = new Set();
  for (const reroll of results.rerolls) {
    const player = reroll.role === 'attacker' ? attacker : defender;
    const parsedDice = reroll.role === 'attacker' ? attack.attackers : attack.targets;
    const parsed = parsedDice.find((die) =>
      !usedRerollDice.has(die) &&
      recipeKey(die.recipe) === recipeKey(reroll.recipe) &&
      die.value === reroll.from);
    if (!parsed) continue;
    usedRerollDice.add(parsed);
    const die = reroll.role === 'defender' && captured.has(parsed)
      ? capturedDice.find((candidate) => dieMatches(candidate, parsed) ||
        dieMatches(candidate, { ...parsed, recipe: changedRecipe(results, 'defender', parsed.recipe) }))
      : findDice(player, [parsed], true)[0].die;
    if (die) die.value = reroll.to;
  }
  return capturedDice;
}

function roundBoundaryIndex(entries, roundNumber) {
  if (!Number.isFinite(Number(roundNumber))) return -1;
  let boundary = -1;
  entries.forEach((entry, index) => {
    const message = String(entry.message || '');
    const match = message.match(/\bEnd of round:.*won round (\d+)\b/i) ||
      message.match(/\bRound (\d+) ended in a draw\b/i);
    if (match && Number(match[1]) < Number(roundNumber)) boundary = index;
  });
  return boundary;
}

function completedRoundSegments(entries) {
  const segments = [];
  let start = 0;
  entries.forEach((entry, index) => {
    const message = String(entry.message || '');
    const end = message.match(/\bEnd of round:.*won round (\d+)\b/i) ||
      message.match(/\bRound (\d+) ended in a draw\b/i);
    if (!end) return;
    segments.push({ roundNumber: Number(end[1]), entries: entries.slice(start, index + 1) });
    start = index + 1;
  });
  return segments;
}

function initialRoundPlayers(entry, currentPlayers) {
  const message = String(entry.message || '');
  if (!/\bInitial die values:/i.test(message)) return null;
  const players = clonePlayers(currentPlayers);
  for (const player of players) {
    const escapedName = String(player.playerName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = message.match(new RegExp(`${escapedName} rolled \\[([^\\]]*)\\]`, 'i'));
    const dice = match ? parseDice(match[1]) : null;
    if (!dice) return null;
    player.activeDieArray = dice.map((die) => ({ ...die, properties: [] }));
    player.capturedDieArray = [];
    player.outOfPlayDieArray = [];
  }
  return players;
}

function addRoundMetadata(steps, roundNumber) {
  return steps.map((step) => ({ ...step, roundNumber }));
}

function buildRoundForward(entries, initialPlayers, roundNumber) {
  let state = clonePlayers(initialPlayers);
  const steps = [];
  for (const entry of entries) {
    if (!entry.attack) {
      const players = clonePlayers(state);
      clearReplayRoles(players);
      steps.push({
        type: 'event', player: entry.player, message: entry.message,
        timestamp: entry.timestamp, logIndex: entry.originalIndex, players, roundNumber,
      });
      continue;
    }
    const playerIndex = state.findIndex((player) => player.playerName === entry.player);
    const targetIndex = state.findIndex((_, index) => index !== playerIndex);
    if (playerIndex < 0 || targetIndex < 0) continue;

    const beforePlayers = clonePlayers(state);
    clearReplayRoles(beforePlayers);
    markDice(beforePlayers[playerIndex], entry.attack.attackers, 'attacker');
    markDice(beforePlayers[targetIndex], entry.attack.targets, 'target');
    steps.push({
      type: 'attack', player: entry.player, playerIndex, targetIndex,
      attackType: entry.attack.attackType, message: entry.message,
      timestamp: entry.timestamp, logIndex: entry.originalIndex, players: beforePlayers, roundNumber,
    });

    const afterPlayers = clonePlayers(state);
    clearReplayRoles(afterPlayers);
    const results = loggedAttackResults(entry.message);
    const captured = capturedTargets(entry.attack, results.captures);
    const capturedDice = applyAttackResult(afterPlayers, playerIndex, targetIndex, entry.attack, results, captured);
    markDice(afterPlayers[playerIndex], entry.attack.attackers, 'changed');
    markDice(afterPlayers[targetIndex], entry.attack.targets, 'changed');
    capturedDice.forEach((die) => { die.replayRole = 'changed'; });
    steps.push({
      type: 'result', player: entry.player, message: entry.message,
      timestamp: entry.timestamp, logIndex: entry.originalIndex, players: afterPlayers, roundNumber,
    });
    state = afterPlayers;
  }
  return steps;
}

export function buildReplaySteps(actionLog, currentPlayers, roundNumber) {
  const entries = list(actionLog)
    .map((entry, index) => ({
      ...entry,
      originalIndex: index,
      attack: parseAttackMessage(entry.message),
    }))
    .sort((first, second) => (Number(first.timestamp) || 0) - (Number(second.timestamp) || 0) ||
      first.originalIndex - second.originalIndex);
  const roundStart = roundBoundaryIndex(entries, roundNumber);
  const replayEntries = roundStart < 0 ? entries : entries.slice(roundStart + 1);
  const earlierEntries = roundStart < 0 ? [] : entries.slice(0, roundStart + 1);
  const earlierSteps = [];
  for (const segment of completedRoundSegments(earlierEntries)) {
    const initial = segment.entries
      .map((entry) => initialRoundPlayers(entry, currentPlayers))
      .find(Boolean);
    if (initial) {
      earlierSteps.push(...buildRoundForward(segment.entries, initial, segment.roundNumber));
    }
  }

  let state = clonePlayers(currentPlayers);
  const reversedSteps = [];
  const addEventStep = (entry) => {
    const players = clonePlayers(state);
    clearReplayRoles(players);
    reversedSteps.push({
      type: 'event',
      player: entry.player,
      message: entry.message,
      timestamp: entry.timestamp,
      logIndex: entry.originalIndex,
      players,
    });
  };
  for (const entry of replayEntries.slice().reverse()) {
    if (!entry.attack) {
      addEventStep(entry);
      continue;
    }
    const playerIndex = state.findIndex((player) => player.playerName === entry.player);
    if (playerIndex < 0) {
      addEventStep(entry);
      continue;
    }
    const targetIndex = state.findIndex((_, index) => index !== playerIndex);
    if (targetIndex < 0) continue;

    const afterPlayers = clonePlayers(state);
    clearReplayRoles(afterPlayers);
    const results = loggedAttackResults(entry.message);
    const captured = capturedTargets(entry.attack, results.captures);
    const capturedDice = applyAttackResult(afterPlayers, playerIndex, targetIndex, entry.attack, results, captured);
    markDice(afterPlayers[playerIndex], entry.attack.attackers, 'changed');
    markDice(afterPlayers[targetIndex], entry.attack.targets, 'changed');
    capturedDice.forEach((die) => { die.replayRole = 'changed'; });
    reversedSteps.push({
      type: 'result',
      player: entry.player,
      message: entry.message,
      timestamp: entry.timestamp,
      logIndex: entry.originalIndex,
      players: afterPlayers,
    });

    const beforePlayers = clonePlayers(afterPlayers);
    clearReplayRoles(beforePlayers);
    const attackers = restoreDice(beforePlayers[playerIndex], entry.attack.attackers);
    const targets = restoreTargetDice(
      beforePlayers[playerIndex],
      beforePlayers[targetIndex],
      entry.attack.targets,
      captured,
      results,
    );
    attackers.forEach((die) => { die.replayRole = 'attacker'; });
    targets.forEach((die) => { die.replayRole = 'target'; });
    reversedSteps.push({
      type: 'attack',
      player: entry.player,
      playerIndex,
      targetIndex,
      attackType: entry.attack.attackType,
      message: entry.message,
      timestamp: entry.timestamp,
      logIndex: entry.originalIndex,
      players: beforePlayers,
    });
    state = beforePlayers;
  }

  return [
    ...earlierSteps,
    ...addRoundMetadata(reversedSteps.reverse(), Number(roundNumber) || null),
    { type: 'current', players: currentPlayers, roundNumber: Number(roundNumber) || null },
  ];
}

export function buildCapturedHistory(actionLog, players, throughLogIndex = Infinity, roundNumber) {
  const playerList = list(players);
  const history = playerList.map(() => []);
  const entries = list(actionLog)
    .map((entry, originalIndex) => ({ ...entry, originalIndex }))
    .sort((first, second) => (Number(first.timestamp) || 0) - (Number(second.timestamp) || 0) ||
      first.originalIndex - second.originalIndex);
  const roundStart = roundBoundaryIndex(entries, roundNumber);
  const roundEnd = Number.isFinite(Number(roundNumber))
    ? entries.findIndex((entry, index) => {
      if (index <= roundStart) return false;
      const message = String(entry.message || '');
      const match = message.match(/\bEnd of round:.*won round (\d+)\b/i) ||
        message.match(/\bRound (\d+) ended in a draw\b/i);
      return match && Number(match[1]) === Number(roundNumber);
    })
    : -1;
  const limitEntry = Number.isFinite(throughLogIndex)
    ? entries.find((entry) => entry.originalIndex === throughLogIndex)
    : null;
  const limitTimestamp = Number(limitEntry?.timestamp) || 0;

  for (const entry of entries.slice(roundStart + 1, roundEnd < 0 ? undefined : roundEnd + 1)) {
    if (Number.isFinite(throughLogIndex) && (
      !limitEntry ||
      (Number(entry.timestamp) || 0) > limitTimestamp ||
      ((Number(entry.timestamp) || 0) === limitTimestamp && entry.originalIndex > limitEntry.originalIndex)
    )) continue;
    const attack = parseAttackMessage(entry.message);
    if (!attack) continue;
    const playerIndex = playerList.findIndex((player) => player.playerName === entry.player);
    const targetIndex = playerList.findIndex((_, index) => index !== playerIndex);
    if (playerIndex < 0 || targetIndex < 0) continue;

    const results = loggedAttackResults(entry.message);
    const captured = capturedTargets(attack, results.captures);
    const used = new Set();
    for (const parsed of attack.targets) {
      if (!captured.has(parsed)) continue;
      const reroll = results.rerolls.find((result) =>
        result.role === 'defender' &&
        !used.has(result) &&
        recipeKey(result.recipe) === recipeKey(parsed.recipe) &&
        result.from === parsed.value);
      if (reroll) used.add(reroll);
      history[playerIndex].push({
        recipe: parsed.recipe,
        sides: parsed.sides,
        value: reroll?.to ?? parsed.value,
        skillArray: parsed.skillArray,
        properties: ['WasJustCaptured'],
        originalPlayerIndex: targetIndex,
        capturedByIndex: playerIndex,
        timestamp: entry.timestamp,
        logIndex: entry.originalIndex,
      });
    }
  }

  return history;
}
