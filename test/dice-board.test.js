import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dieAccessibleLabel, dieGeometry, dieSideCount, renderDiceBoard,
} from '../public/js/dice-board.js';

test('dice board: common die sizes have stable, distinct geometry', () => {
  const expected = new Map([
    [4, 'triangle'],
    [6, 'square'],
    [8, 'diamond'],
    [10, 'pentagon'],
    [12, 'hexagon'],
    [20, 'decagon'],
  ]);

  for (const [sides, shape] of expected) {
    assert.equal(dieGeometry({ sides }).shape, shape);
  }
  assert.equal(new Set([...expected.keys()].map((sides) => dieGeometry({ sides }).scale)).size, expected.size);
});

test('dice board: equal current sizes use equal geometry regardless of other die data', () => {
  assert.deepEqual(
    dieGeometry({ sides: 8, value: 1, skillArray: ['Poison'] }),
    dieGeometry({ recipe: 'z(8)', value: 7, statuses: ['Dizzy'] }),
  );
});

test('dice board: unusual and unresolved sizes use the labeled fallback', () => {
  assert.deepEqual(dieGeometry({ sides: 7 }), {
    sides: 7, shape: 'fallback', vertices: 0, scale: 0.92,
  });
  assert.deepEqual(dieGeometry({ recipe: 'X' }), {
    sides: null, shape: 'fallback', vertices: 0, scale: 0.92,
  });
  assert.equal(dieSideCount({ sides: [6, 8] }), 14);
});

test('dice board: accessible labels include identity, state, value, recipe, skills, statuses, and replay role', () => {
  const label = dieAccessibleLabel({
    sides: 8,
    value: 5,
    recipe: 'z(8)',
    skillArray: ['Speed'],
    statusArray: ['Dizzy'],
    replayRole: 'attacker',
  }, 'alice', 'active');

  assert.equal(
    label,
    'alice, active die, rolled 5, recipe z8, 8 sides, skills Speed, statuses Dizzy, replay role Attacker',
  );
  assert.match(dieAccessibleLabel({ recipe: 'X' }, 'bob', 'captured'), /unknown sides, skills none, statuses none/);
});

function svgDocument() {
  const createElementNS = (_namespace, tagName) => ({
    tagName,
    children: [],
    attributes: {},
    append(...children) { this.children.push(...children); },
    setAttribute(name, attributeValue) { this.attributes[name] = String(attributeValue); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    set textContent(text) { this.text = String(text); },
    get textContent() { return (this.text || '') + this.children.map((child) => child.textContent).join(''); },
  });
  return { createElementNS };
}

function descendants(element) {
  return [element, ...element.children.flatMap(descendants)];
}

function translateX(element) {
  return Number(element.getAttribute('transform').match(/translate\(([\d.]+)/)[1]);
}

test('dice board: active dice are spaced evenly with equal gaps at the edges', () => {
  const svg = renderDiceBoard(svgDocument(), [
    { playerName: 'alice', activeDieArray: [{ sides: 6, value: 1 }, { sides: 8, value: 2 }] },
    { playerName: 'bob', activeDieArray: [{ sides: 6, value: 3 }] },
  ]);
  const regions = descendants(svg).filter((element) => element.getAttribute('class')?.startsWith('game-spatial-region '));
  const bottom = regions.find((region) => region.getAttribute('data-player-name') === 'alice');
  const background = bottom.children[0];
  const left = Number(background.getAttribute('x'));
  const xs = descendants(bottom)
    .filter((element) => element.getAttribute('class')?.includes('game-spatial-die-active'))
    .map(translateX);
  const top = regions.find((region) => region.getAttribute('data-player-name') === 'bob');
  const [single] = descendants(top)
    .filter((element) => element.getAttribute('class')?.includes('game-spatial-die-active'))
    .map(translateX);
  const activeWidth = (single - left) * 2;
  assert.equal(xs.length, 2);
  assert.ok(Math.abs((xs[0] - left) - (activeWidth / 3)) < 0.01);
  assert.ok(Math.abs((xs[1] - left) - (activeWidth * 2 / 3)) < 0.01);
});

test('dice board: captured dice sit in a column to the right of the active dice', () => {
  const svg = renderDiceBoard(svgDocument(), [
    {
      playerName: 'alice',
      activeDieArray: [{ sides: 6, value: 1 }, { sides: 8, value: 2 }, { sides: 20, value: 9 }],
      replayCapturedDieArray: [{ sides: 6, value: 4, originalPlayerIndex: 1 }, { sides: 4, value: 2, originalPlayerIndex: 1 }],
    },
    { playerName: 'bob', activeDieArray: [{ sides: 6, value: 3 }] },
  ], { attackType: 'Power' });
  const all = descendants(svg);
  const rightmostActive = Math.max(...all
    .filter((element) => element.getAttribute('class')?.includes('game-spatial-die-active'))
    .map(translateX));
  const pile = all.find((element) => element.getAttribute('class') === 'game-spatial-captured-pile');
  const pileBackground = pile.children.find((element) => element.getAttribute('class') === 'game-spatial-captured-background');
  assert.ok(Number(pileBackground.getAttribute('x')) > rightmostActive + 43);
  assert.match(pile.textContent, /Captured by alice/);
  const captured = all.filter((element) => element.getAttribute('class')?.includes('game-spatial-die-captured'));
  assert.equal(captured.length, 2);
  assert.ok(captured.every((die) => translateX(die) > Number(pileBackground.getAttribute('x'))));
});
