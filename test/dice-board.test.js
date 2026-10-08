import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dieAccessibleLabel, dieGeometry, dieSideCount } from '../public/js/dice-board.js';

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
