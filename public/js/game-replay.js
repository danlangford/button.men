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
  const dice = notation.split(',').map(parseDieNotation);
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
  for (const match of message.matchAll(/\b(Attacker|Defender)\s+([^;]+?)\s+rerolled\s+(\d+)\s*=>\s*(\d+)/gi)) {
    rerolls.push({
      role: match[1].toLowerCase(),
      recipe: match[2],
      from: Number(match[3]),
      to: Number(match[4]),
    });
  }
  for (const match of message.matchAll(/\bDefender\s+([^;]+?)\s+was captured\b/gi)) {
    captures.push(match[1]);
  }
  return { rerolls, captures };
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

function restoreTargetDice(attacker, defender, parsedDice, captured) {
  const used = new Set();
  return parsedDice.map((parsed) => {
    let die = null;
    if (captured.has(parsed)) {
      die = takeCapturedDie(attacker, parsed);
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
    if (!die) die = attacker.capturedDieArray.find((candidate) => dieMatches(candidate, parsed)) || null;
    if (!die) {
      die = {
        recipe: parsed.recipe,
        sides: parsed.sides,
        skillArray: parsed.skillArray,
        properties: [],
      };
    }
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
      ? capturedDice.find((candidate) => dieMatches(candidate, parsed))
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
    const match = message.match(/^End of round:.*won round (\d+)\b/i) ||
      message.match(/^Round (\d+) ended in a draw\b/i);
    if (match && Number(match[1]) < Number(roundNumber)) boundary = index;
  });
  return boundary;
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
    ...reversedSteps.reverse(),
    { type: 'current', players: currentPlayers },
  ];
}

export function buildCapturedHistory(actionLog, players, throughLogIndex = Infinity) {
  const playerList = list(players);
  const history = playerList.map(() => []);
  const entries = list(actionLog)
    .map((entry, originalIndex) => ({ ...entry, originalIndex }))
    .sort((first, second) => (Number(first.timestamp) || 0) - (Number(second.timestamp) || 0) ||
      first.originalIndex - second.originalIndex);
  const limitEntry = Number.isFinite(throughLogIndex)
    ? entries.find((entry) => entry.originalIndex === throughLogIndex)
    : null;
  const limitTimestamp = Number(limitEntry?.timestamp) || 0;

  for (const entry of entries) {
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
