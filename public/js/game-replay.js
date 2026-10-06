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
      const index = group.findIndex((die, dieIndex) => !used.has(die) && dieMatches(die, parsed));
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

export function buildReplaySteps(actionLog, currentPlayers) {
  const entries = list(actionLog)
    .map((entry, index) => ({
      ...entry,
      originalIndex: index,
      attack: parseAttackMessage(entry.message),
    }))
    .filter((entry) => entry.attack)
    .sort((first, second) => (Number(first.timestamp) || 0) - (Number(second.timestamp) || 0) ||
      first.originalIndex - second.originalIndex);

  let state = clonePlayers(currentPlayers);
  const reversedSteps = [];
  for (const entry of entries.toReversed()) {
    const playerIndex = state.findIndex((player) => player.playerName === entry.player);
    if (playerIndex < 0) continue;
    const targetIndex = state.findIndex((_, index) => index !== playerIndex);
    if (targetIndex < 0) continue;

    const afterPlayers = clonePlayers(state);
    markDice(afterPlayers[playerIndex], entry.attack.attackers, 'changed');
    markDice(afterPlayers[targetIndex], entry.attack.targets, 'changed');
    reversedSteps.push({
      type: 'result',
      player: entry.player,
      message: entry.message,
      timestamp: entry.timestamp,
      players: afterPlayers,
    });

    const beforePlayers = clonePlayers(state);
    const attackers = restoreDice(beforePlayers[playerIndex], entry.attack.attackers);
    const targets = restoreDice(beforePlayers[targetIndex], entry.attack.targets);
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
      players: beforePlayers,
    });
    state = beforePlayers;
  }

  return [
    ...reversedSteps.reverse(),
    { type: 'current', players: currentPlayers },
  ];
}
