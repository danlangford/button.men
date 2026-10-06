import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildReplaySteps,
  parseAttackMessage,
  parseDieNotation,
} from '../public/js/game-replay.js';

test('game replay parser reads standard, skill, and swing die notation', () => {
  assert.deepEqual(parseDieNotation('(4):1'), {
    recipe: '(4)',
    sides: 4,
    value: 1,
    skillArray: [],
  });
  assert.deepEqual(parseDieNotation('z(8):3'), {
    recipe: 'z(8)',
    sides: 8,
    value: 3,
    skillArray: ['Speed'],
  });
  assert.deepEqual(parseDieNotation('V=6:3'), {
    recipe: 'V=6',
    sides: 6,
    value: 3,
    skillArray: [],
  });
  assert.equal(parseDieNotation('not a die'), null);
});

test('game replay parser extracts attackers, targets, and attack type', () => {
  assert.deepEqual(parseAttackMessage(
    'alice performed Skill attack using [z(8):2,V=6:3] against [(4):1]',
  ), {
    attackType: 'Skill',
    attackers: [
      { recipe: 'z(8)', sides: 8, value: 2, skillArray: ['Speed'] },
      { recipe: 'V=6', sides: 6, value: 3, skillArray: [] },
    ],
    targets: [{ recipe: '(4)', sides: 4, value: 1, skillArray: [] }],
  });
  assert.equal(parseAttackMessage('alice passed'), null);
});

test('game replay parser reconstructs attack and result steps and preserves current state', () => {
  const currentPlayers = [
    {
      playerName: 'alice',
      activeDieArray: [{ recipe: 'z(8)', sides: 8, value: 3, skillArray: ['Speed'] }],
      capturedDieArray: [],
    },
    {
      playerName: 'bob',
      activeDieArray: [{ recipe: 10, value: 4 }],
      capturedDieArray: [{ recipe: 6, value: 5, properties: ['WasJustCaptured'] }],
    },
  ];
  const steps = buildReplaySteps([
    { timestamp: 2, player: 'alice', message: 'alice passed' },
    {
      timestamp: 1,
      player: 'alice',
      message: 'alice performed Skill attack using [z(8):2] against [(6):5]; Defender (6) was captured; Attacker z(8) rerolled 2 => 3',
    },
  ], currentPlayers);

  assert.deepEqual(steps.map((step) => step.type), ['attack', 'result', 'current']);
  assert.equal(steps[0].attackType, 'Skill');
  assert.equal(steps[0].players[0].activeDieArray[0].value, 2);
  assert.equal(steps[0].players[0].activeDieArray[0].replayRole, 'attacker');
  assert.equal(steps[0].players[1].activeDieArray[1].value, 5);
  assert.equal(steps[0].players[1].activeDieArray[1].replayRole, 'target');
  assert.equal(steps[1].players[0].activeDieArray[0].value, 3);
  assert.equal(steps[1].players[0].activeDieArray[0].replayRole, 'changed');
  assert.equal(steps[2].players, currentPlayers);
  assert.equal(currentPlayers[0].activeDieArray[0].replayRole, undefined);
});
