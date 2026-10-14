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

const SLOT_WIDTH = 108;
const CAPTURED_CELL = 66;
const CAPTURED_ROWS = 3;
const BOARD_MARGIN = 12;

// Spread dice so the gaps between them and the edges are all equal: two dice
// sit at 1/3 and 2/3 of the area rather than at its borders.
function slotCenters(count, left, width, y) {
  return Array.from({ length: count }, (_, index) => ({
    x: left + (width * (index + 1) / (count + 1)),
    y,
  }));
}

function capturedColumns(count) {
  return Math.max(2, Math.ceil(count / CAPTURED_ROWS));
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

function renderPlayerRegion(document, svg, players, playerIndex, position, layout, colors, currentViewerIndex) {
  const player = players[playerIndex];
  const top = position === 'top';
  const regionY = top ? 18 : 322;
  const activeY = regionY + 150;
  const name = playerName(player, playerIndex);
  const region = svgElement(document, 'g', {
    class: `game-spatial-region game-spatial-region-${position}`,
    'data-player-index': playerIndex,
    'data-player-name': name,
    'aria-label': `${name} ${position} region`,
  });
  region.append(
    svgElement(document, 'rect', {
      class: 'game-spatial-region-background', x: BOARD_MARGIN, y: regionY, width: layout.width - (BOARD_MARGIN * 2), height: 280, rx: 22,
    }),
    svgElement(document, 'text', {
      class: 'game-spatial-player-name', x: 30, y: regionY + 32,
    }, `${name} · active dice`),
  );

  const activeDice = list(player.activeDieArray);
  const activeGroup = svgElement(document, 'g', { class: 'game-spatial-active-dice' });
  const rendered = slotCenters(activeDice.length, BOARD_MARGIN, layout.activeWidth, activeY).map((center, index) => {
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
    const pileX = BOARD_MARGIN + layout.activeWidth;
    const pileWidth = layout.capturedWidth - 10;
    capturedGroup.append(
      svgElement(document, 'title', {}, `Captured by ${name}`),
      svgElement(document, 'rect', {
        class: 'game-spatial-captured-background', x: pileX, y: regionY + 12, width: pileWidth, height: 256, rx: 16,
      }),
      svgElement(document, 'text', {
        class: 'game-spatial-captured-label', x: pileX + (pileWidth / 2), y: regionY + 40, 'text-anchor': 'middle',
      }, 'Captured'),
    );
    const columns = capturedColumns(capturedDice.length);
    const gridLeft = pileX + ((pileWidth - (columns * CAPTURED_CELL)) / 2);
    capturedDice.forEach((capturedDie, index) => {
      const center = {
        x: gridLeft + (CAPTURED_CELL * ((index % columns) + 0.5)),
        y: regionY + 92 + (CAPTURED_CELL * Math.floor(index / columns)),
      };
      const item = renderDie(
        document,
        capturedDie,
        players[capturedDie.originalPlayerIndex]?.playerName || 'opponent',
        'captured',
        center,
        capturedColor(players, playerIndex, capturedDie, currentViewerIndex, colors),
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

function appendAttackConnectors(document, svg, renderedDice, attackType, layout) {
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
  const firstRegion = [...svg.children].find((child) => child.getAttribute?.('class')?.includes('game-spatial-region'));
  if (firstRegion && svg.insertBefore) svg.insertBefore(connectors, firstRegion);
  else svg.append(connectors);
  svg.append(svgElement(document, 'text', {
    class: 'game-spatial-attack-label', x: BOARD_MARGIN + (layout.activeWidth / 2), y: 320, 'text-anchor': 'middle',
  }, `${attackType} attack`));
}

export function renderDiceBoard(document, players, options = {}) {
  const bottomPlayerIndex = options.bottomPlayerIndex ?? 0;
  const topPlayerIndex = 1 - bottomPlayerIndex;
  const maxActive = Math.max(4, ...players.map((player) => list(player.activeDieArray).length));
  const maxCaptured = Math.max(0, ...players.map((player) => list(player.replayCapturedDieArray).length));
  // The captured column is always reserved so dice don't shift as replay steps add captures.
  const activeWidth = (maxActive + 1) * SLOT_WIDTH;
  const capturedWidth = (capturedColumns(maxCaptured) * CAPTURED_CELL) + 30;
  const layout = { activeWidth, capturedWidth, width: activeWidth + capturedWidth + (BOARD_MARGIN * 2) };
  const width = layout.width;
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
    ...renderPlayerRegion(document, svg, players, topPlayerIndex, 'top', layout, colors, options.currentViewerIndex ?? null),
    ...renderPlayerRegion(document, svg, players, bottomPlayerIndex, 'bottom', layout, colors, options.currentViewerIndex ?? null),
  ];
  appendAttackConnectors(document, svg, renderedDice, options.attackType, layout);
  return svg;
}
