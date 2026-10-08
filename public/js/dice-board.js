import { formatDieRecipe } from './game-replay.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const list = (value) => Array.isArray(value) ? value : [];
const value = (object, ...keys) => keys.reduce((result, key) => result ?? object?.[key], undefined);

const geometryBySides = new Map([
  [2, { shape: 'coin', vertices: 16, scale: 0.78 }],
  [4, { shape: 'triangle', vertices: 3, scale: 0.82 }],
  [6, { shape: 'square', vertices: 4, scale: 0.9, rotation: 45 }],
  [8, { shape: 'diamond', vertices: 4, scale: 0.96 }],
  [10, { shape: 'pentagon', vertices: 5, scale: 1 }],
  [12, { shape: 'hexagon', vertices: 6, scale: 1.06 }],
  [20, { shape: 'decagon', vertices: 10, scale: 1.14 }],
  [30, { shape: 'dodecagon', vertices: 12, scale: 1.2 }],
]);

export function dieSideCount(die) {
  const explicit = value(die, 'sides', 'size');
  if (Array.isArray(explicit)) {
    const sides = explicit.map(Number).filter((side) => Number.isFinite(side) && side > 0);
    return sides.length === explicit.length ? sides.reduce((total, side) => total + side, 0) : null;
  }
  if (Number.isFinite(Number(explicit)) && Number(explicit) > 0) return Number(explicit);
  const recipe = value(die, 'recipe', 'originalRecipe');
  if (Number.isFinite(Number(recipe)) && Number(recipe) > 0) return Number(recipe);
  const match = String(recipe ?? '').match(/\((\d+)\)(?:[!?])?$/);
  return match ? Number(match[1]) : null;
}

export function dieGeometry(die) {
  const sides = dieSideCount(die);
  return {
    sides,
    ...(geometryBySides.get(sides) || { shape: 'fallback', vertices: 0, scale: 0.92 }),
  };
}

function roleLabel(role) {
  return { attacker: 'Attacker', target: 'Target', changed: 'Changed' }[role] || '';
}

export function dieAccessibleLabel(die, owner, state = 'active') {
  const sides = dieSideCount(die);
  const rolled = value(die, 'value', 'currentValue', 'roll') ?? 'unknown';
  const recipe = formatDieRecipe(die);
  const skills = list(value(die, 'skillArray', 'skills'));
  const statuses = list(value(die, 'statusArray', 'statuses', 'properties'))
    .filter((status) => status !== 'WasJustCaptured');
  const replayRole = roleLabel(die.replayRole) || 'none';
  return [
    owner,
    `${state} die`,
    `rolled ${rolled}`,
    `recipe ${recipe}`,
    `${sides ?? 'unknown'} sides`,
    `skills ${skills.length ? skills.join(', ') : 'none'}`,
    `statuses ${statuses.length ? statuses.join(', ') : 'none'}`,
    `replay role ${replayRole}`,
  ].join(', ');
}

function svgElement(document, name, attributes = {}, content = null) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, attributeValue]) => {
    if (attributeValue !== null && attributeValue !== undefined) {
      element.setAttribute(key, String(attributeValue));
    }
  });
  if (content !== null) element.textContent = content;
  return element;
}

function polygonPoints(vertices, radius, rotation = 0) {
  return Array.from({ length: vertices }, (_, index) => {
    const angle = ((index / vertices) * Math.PI * 2) - (Math.PI / 2) + (rotation * Math.PI / 180);
    return `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
}

function validColor(color, fallback) {
  return /^#[\da-f]{6}$/i.test(color || '') ? color : fallback;
}

function textColor(background) {
  const color = validColor(background, '#d9d9d9').slice(1);
  const [red, green, blue] = color.match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 255000;
  return luminance < 0.48 ? '#ffffff' : '#111b1a';
}

function dieDetails(die) {
  const skills = list(value(die, 'skillArray', 'skills'));
  const statuses = list(value(die, 'statusArray', 'statuses', 'properties'))
    .filter((status) => status !== 'WasJustCaptured');
  return [...skills, ...statuses].join(' · ');
}

function renderDie(document, die, owner, state, center, color) {
  const geometry = dieGeometry(die);
  const role = roleLabel(die.replayRole);
  const radius = 43 * geometry.scale;
  const fill = validColor(color, '#d9d9d9');
  const classes = [
    'game-spatial-die',
    `game-spatial-die-${state}`,
    role && `game-die-replay-${die.replayRole}`,
  ].filter(Boolean).join(' ');
  const group = svgElement(document, 'g', {
    class: classes,
    transform: `translate(${center.x} ${center.y})`,
    role: 'img',
    tabindex: '0',
    'aria-label': dieAccessibleLabel(die, owner, state),
    'data-owner': owner,
    'data-shape': geometry.shape,
    'data-sides': geometry.sides ?? 'unknown',
    'data-replay-role': die.replayRole || 'none',
    style: `color: ${textColor(fill)}`,
  });
  group.append(svgElement(document, 'title', {}, dieAccessibleLabel(die, owner, state)));
  const shapeAttributes = {
    class: 'game-spatial-die-shape',
    fill,
    stroke: '#111b1a',
    'stroke-width': 4,
  };
  const shape = geometry.vertices
    ? svgElement(document, 'polygon', {
      ...shapeAttributes,
      points: polygonPoints(geometry.vertices, radius, geometry.rotation),
    })
    : svgElement(document, 'circle', { ...shapeAttributes, r: radius });
  group.append(shape);
  if (role) {
    group.append(svgElement(document, 'text', {
      class: 'game-spatial-die-role',
      x: 0,
      y: -radius - 10,
      'text-anchor': 'middle',
    }, role));
  }
  group.append(
    svgElement(document, 'text', {
      class: 'game-spatial-die-value', x: 0, y: -2, 'text-anchor': 'middle',
    }, value(die, 'value', 'currentValue', 'roll') ?? '—'),
    svgElement(document, 'text', {
      class: 'game-spatial-die-recipe', x: 0, y: 22, 'text-anchor': 'middle',
    }, formatDieRecipe(die)),
  );
  const details = dieDetails(die);
  if (details) {
    group.append(svgElement(document, 'text', {
      class: 'game-spatial-die-details', x: 0, y: radius + 20, 'text-anchor': 'middle',
    }, details));
  }
  return { element: group, ...center, radius, die };
}

function slotCenters(count, width, y) {
  if (!count) return [];
  const padding = 62;
  const available = width - (padding * 2);
  return Array.from({ length: count }, (_, index) => ({
    x: count === 1 ? width / 2 : padding + (available * index / (count - 1)),
    y,
  }));
}

function playerName(player, index) {
  return player.playerName || `Player ${index + 1}`;
}

function capturedColor(players, playerIndex, die, currentViewerIndex, colors) {
  if (currentViewerIndex === null) {
    return players[die.originalPlayerIndex]?.playerColor;
  }
  return playerIndex === currentViewerIndex ? colors.neutralOpponentColor : colors.neutralPlayerColor;
}

function renderPlayerRegion(document, svg, players, playerIndex, position, width, colors, currentViewerIndex) {
  const player = players[playerIndex];
  const top = position === 'top';
  const regionY = top ? 18 : 322;
  const activeY = top ? 132 : 494;
  const capturedY = top ? 252 : 374;
  const name = playerName(player, playerIndex);
  const region = svgElement(document, 'g', {
    class: `game-spatial-region game-spatial-region-${position}`,
    'data-player-index': playerIndex,
    'data-player-name': name,
    'aria-label': `${name} ${position} region`,
  });
  region.append(
    svgElement(document, 'rect', {
      class: 'game-spatial-region-background', x: 12, y: regionY, width: width - 24, height: 280, rx: 22,
    }),
    svgElement(document, 'text', {
      class: 'game-spatial-player-name', x: 30, y: regionY + 32,
    }, `${name} · active dice`),
  );

  const activeDice = list(player.activeDieArray);
  const activeGroup = svgElement(document, 'g', { class: 'game-spatial-active-dice' });
  const rendered = slotCenters(activeDice.length, width, activeY).map((center, index) => {
    const item = renderDie(document, activeDice[index], name, 'active', center, player.playerColor);
    activeGroup.append(item.element);
    return item;
  });
  region.append(activeGroup);

  const capturedDice = list(player.replayCapturedDieArray);
  if (capturedDice.length) {
    const capturedGroup = svgElement(document, 'g', {
      class: 'game-spatial-captured-pile',
      'aria-label': `Captured by ${name}`,
    });
    capturedGroup.append(
      svgElement(document, 'rect', {
        class: 'game-spatial-captured-background', x: 22, y: capturedY - 45, width: width - 44, height: 88, rx: 16,
      }),
      svgElement(document, 'text', {
        class: 'game-spatial-captured-label', x: 34, y: capturedY - 17,
      }, `Captured by ${name}`),
    );
    slotCenters(capturedDice.length, width, capturedY).forEach((center, index) => {
      const item = renderDie(
        document,
        capturedDice[index],
        players[capturedDice[index].originalPlayerIndex]?.playerName || 'opponent',
        'captured',
        { x: center.x, y: center.y + 8 },
        capturedColor(players, playerIndex, capturedDice[index], currentViewerIndex, colors),
      );
      item.element.setAttribute('transform', `translate(${item.x} ${item.y}) scale(.58)`);
      capturedGroup.append(item.element);
      rendered.push(item);
    });
    region.append(capturedGroup);
  }
  svg.append(region);
  return rendered;
}

function appendAttackConnectors(document, svg, renderedDice, attackType) {
  const attackers = renderedDice.filter(({ die }) => die.replayRole === 'attacker');
  const targets = renderedDice.filter(({ die }) => die.replayRole === 'target');
  if (!attackType || !attackers.length || !targets.length) return;
  const connectors = svgElement(document, 'g', {
    class: 'game-spatial-attack-connectors',
    'aria-label': `${attackType} attack: attackers to targets`,
  });
  attackers.forEach((attacker) => targets.forEach((target) => {
    connectors.append(svgElement(document, 'line', {
      class: 'game-spatial-attack-connector',
      x1: attacker.x,
      y1: attacker.y,
      x2: target.x,
      y2: target.y,
      'marker-end': 'url(#game-spatial-arrow)',
      'aria-hidden': 'true',
    }));
  }));
  connectors.append(svgElement(document, 'text', {
    class: 'game-spatial-attack-label', x: '50%', y: 316, 'text-anchor': 'middle',
  }, `${attackType} attack · attackers → targets`));
  const firstRegion = [...svg.children].find((child) => child.getAttribute?.('class')?.includes('game-spatial-region'));
  if (firstRegion && svg.insertBefore) svg.insertBefore(connectors, firstRegion);
  else svg.append(connectors);
}

export function renderDiceBoard(document, players, options = {}) {
  const bottomPlayerIndex = options.bottomPlayerIndex ?? 0;
  const topPlayerIndex = 1 - bottomPlayerIndex;
  const maxDice = Math.max(
    5,
    ...players.map((player) => Math.max(
      list(player.activeDieArray).length,
      list(player.replayCapturedDieArray).length,
    )),
  );
  const width = Math.max(600, (maxDice * 108) + 60);
  const svg = svgElement(document, 'svg', {
    class: 'game-spatial-board',
    viewBox: `0 0 ${width} 620`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'group',
    'aria-label': 'Spatial 2D dice presentation',
  });
  const defs = svgElement(document, 'defs');
  const marker = svgElement(document, 'marker', {
    id: 'game-spatial-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5,
    markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse',
  });
  marker.append(svgElement(document, 'path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'game-spatial-arrowhead' }));
  defs.append(marker);
  svg.append(defs);
  const colors = {
    neutralOpponentColor: options.neutralOpponentColor || '#dddddd',
    neutralPlayerColor: options.neutralPlayerColor || '#cccccc',
  };
  const renderedDice = [
    ...renderPlayerRegion(document, svg, players, topPlayerIndex, 'top', width, colors, options.currentViewerIndex ?? null),
    ...renderPlayerRegion(document, svg, players, bottomPlayerIndex, 'bottom', width, colors, options.currentViewerIndex ?? null),
  ];
  appendAttackConnectors(document, svg, renderedDice, options.attackType);
  return svg;
}
