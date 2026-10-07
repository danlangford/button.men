import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCapturedHistory,
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
  assert.equal(parseAttackMessage(
    'alice performed Trip attack using [t(T=2,T=2):3] against [Hog%(4):4]',
  ).attackers[0].recipe, 't(T=2,T=2)');
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
      activeDieArray: [{ recipe: 10, value: 5 }],
      capturedDieArray: [{ recipe: 6, value: 5, properties: ['WasJustCaptured'] }],
    },
  ];
  const steps = buildReplaySteps([
    {
      timestamp: 3,
      player: 'bob',
      message: 'bob performed Power attack using [(10):4] against [z(8):3]; Defender z(8) was not captured; Attacker (10) rerolled 4 => 5',
    },
    { timestamp: 2, player: 'alice', message: 'alice passed' },
    {
      timestamp: 1,
      player: 'alice',
      message: 'alice performed Skill attack using [z(8):2] against [(6):5]; Defender (6) was captured; Attacker z(8) rerolled 2 => 3',
    },
  ], currentPlayers);

  assert.deepEqual(steps.map((step) => step.type), ['attack', 'result', 'event', 'attack', 'result', 'current']);
  assert.equal(steps[0].attackType, 'Skill');
  assert.equal(steps[0].players[0].activeDieArray[0].value, 2);
  assert.equal(steps[0].players[0].activeDieArray[0].replayRole, 'attacker');
  assert.equal(steps[0].players[1].activeDieArray[1].value, 5);
  assert.equal(steps[0].players[1].activeDieArray[1].replayRole, 'target');
  assert.equal(steps[1].players[0].activeDieArray[0].value, 3);
  assert.equal(steps[1].players[0].activeDieArray[0].replayRole, 'changed');
  assert.equal(steps[2].message, 'alice passed');
  assert.equal(steps[3].attackType, 'Power');
  assert.equal(steps[3].players[1].activeDieArray[0].value, 4);
  assert.equal(steps[3].players[0].activeDieArray[0].value, 3);
  assert.equal(steps[4].players[1].activeDieArray[0].value, 5);
  assert.equal(steps[5].players, currentPlayers);
  assert.equal(currentPlayers[0].activeDieArray[0].replayRole, undefined);
});

test('game replay keeps pass and option-selection log entries as steps', () => {
  const players = [
    { playerName: 'alice', activeDieArray: [{ recipe: 6, value: 3 }] },
    { playerName: 'bob', activeDieArray: [{ recipe: 8, value: 4 }] },
  ];
  const steps = buildReplaySteps([
    { timestamp: 1, player: 'alice', message: 'alice performed Skill attack using [(6):3] against [(8):4]' },
    { timestamp: 2, player: 'bob', message: 'bob passed' },
    { timestamp: 3, player: 'alice', message: 'alice set swing values: V=6' },
  ], players);

  assert.deepEqual(steps.map((step) => step.type), ['attack', 'result', 'event', 'event', 'current']);
  assert.equal(steps[2].message, 'bob passed');
  assert.equal(steps[2].logIndex, 1);
  assert.equal(steps[3].message, 'alice set swing values: V=6');
  assert.equal(steps[3].logIndex, 2);
  assert.equal(steps[4].players, players);
});

test('game replay keeps roles local to each attack and restores captures for its result', () => {
  const currentPlayers = [
    {
      playerName: 'alice',
      activeDieArray: [{ recipe: 6, value: 5 }, { recipe: 8, value: 2 }],
      capturedDieArray: [{ recipe: 4, value: 4 }, { recipe: 10, value: 3 }],
    },
    {
      playerName: 'bob',
      activeDieArray: [],
      capturedDieArray: [],
    },
  ];
  const steps = buildReplaySteps([
    {
      timestamp: 10,
      player: 'alice',
      message: 'alice performed Skill attack using [(6):2] against [(4):4]; Defender (4) was captured; Attacker (6) rerolled 2 => 5',
    },
    {
      timestamp: 20,
      player: 'alice',
      message: 'alice performed Power attack using [(8):3] against [(10):3]; Defender (10) was captured; Attacker (8) rerolled 3 => 2',
    },
  ], currentPlayers);

  assert.deepEqual(steps.map((step) => step.type), ['attack', 'result', 'attack', 'result', 'current']);
  assert.equal(steps[0].players[0].activeDieArray[0].replayRole, 'attacker');
  assert.equal(steps[0].players[0].activeDieArray[1].replayRole, undefined);
  assert.equal(steps[0].players[1].activeDieArray.find((die) => die.recipe === 4).replayRole, 'target');
  assert.equal(steps[0].players[1].activeDieArray.find((die) => die.recipe === 10).replayRole, undefined);
  assert.equal(steps[1].players[0].activeDieArray[0].replayRole, 'changed');
  assert.equal(steps[1].players[0].activeDieArray[1].replayRole, undefined);
  assert.deepEqual(steps[1].players[0].capturedDieArray.map((die) => [die.recipe, die.value, die.replayRole]), [
    [4, 4, 'changed'],
  ]);
  assert.equal(steps[2].players[0].activeDieArray[0].replayRole, undefined);
  assert.equal(steps[2].players[0].activeDieArray[1].replayRole, 'attacker');
  assert.equal(steps[2].players[1].activeDieArray[0].replayRole, 'target');
  assert.deepEqual(steps[3].players[0].capturedDieArray.map((die) => [die.recipe, die.value, die.replayRole]), [
    [4, 4, undefined],
    [10, 3, 'changed'],
  ]);
  assert.equal(steps[3].players[0].activeDieArray[1].value, 2);
  assert.equal(steps[4].players, currentPlayers);
  assert.equal(currentPlayers[0].capturedDieArray[0].replayRole, undefined);
});

test('game replay recognizes transformed defenders that reroll before capture', () => {
  const players = [
    { playerName: 'alice', activeDieArray: [{ recipe: 't(T=1,T=1)', value: 2 }], capturedDieArray: [{ recipe: 'Hog%(6)', value: 1 }] },
    { playerName: 'bob', activeDieArray: [], capturedDieArray: [] },
  ];
  const steps = buildReplaySteps([{
    timestamp: 1,
    player: 'alice',
    message: 'alice performed Trip attack using [t(T=2,T=2):3] against [Hog%(4):4]; Attacker t(T=2,T=2) rerolled 3 => 2; Defender Hog%(4) recipe changed to Hog%(6), rerolled 4 => 1, was captured',
  }], players);

  assert.equal(steps[0].players[1].activeDieArray[0].recipe, 'Hog%(4)');
  assert.equal(steps[0].players[1].activeDieArray[0].value, 4);
  assert.equal(steps[1].players[0].capturedDieArray[0].value, 1);
  assert.equal(steps[1].players[0].capturedDieArray[0].replayRole, 'changed');
});

test('game replay begins after the previous round boundary', () => {
  const players = [
    { playerName: 'alice', activeDieArray: [{ recipe: 6, value: 3 }] },
    { playerName: 'bob', activeDieArray: [{ recipe: 8, value: 4 }] },
  ];
  const steps = buildReplaySteps([
    { timestamp: 1, player: 'alice', message: 'alice performed Skill attack using [(6):2] against [(8):4]' },
    { timestamp: 2, player: 'alice', message: 'End of round: alice won round 1 (1 vs. 0)' },
    { timestamp: 3, player: 'alice', message: 'alice performed Skill attack using [(6):3] against [(8):4]' },
  ], players, 2);

  assert.deepEqual(steps.map((step) => step.type), ['attack', 'result', 'current']);
  assert.equal(steps[0].timestamp, 3);
});

test('game replay reconstructs earlier rounds from their initial rolls', () => {
  const players = [
    { playerName: 'alice', activeDieArray: [{ recipe: 6, value: 5 }], capturedDieArray: [] },
    { playerName: 'bob', activeDieArray: [{ recipe: 8, value: 7 }], capturedDieArray: [] },
  ];
  const steps = buildReplaySteps([
    { timestamp: 0, player: 'alice', message: 'alice set swing values: V=6' },
    {
      timestamp: 1,
      player: '',
      message: 'alice won initiative for round 1. Initial die values: alice rolled [(6):2], bob rolled [(8):4].',
    },
    {
      timestamp: 2,
      player: 'alice',
      message: 'alice performed Power attack using [(6):2] against [(8):4]; Defender (8) was captured; Attacker (6) rerolled 2 => 5. End of round: alice won round 1 (8 vs. 0)',
    },
    {
      timestamp: 3,
      player: '',
      message: 'bob won initiative for round 2. Initial die values: alice rolled [(6):3], bob rolled [(8):6].',
    },
    {
      timestamp: 4,
      player: 'bob',
      message: 'bob performed Power attack using [(8):6] against [(6):3]; Attacker (8) rerolled 6 => 7',
    },
  ], players, 2);

  assert.deepEqual(steps.map((step) => step.roundNumber), [1, 1, 1, 1, 2, 2, 2, 2]);
  assert.deepEqual(steps.map((step) => step.type), [
    'event', 'event', 'attack', 'result', 'event', 'attack', 'result', 'current',
  ]);
  assert.equal(steps[0].message, 'alice set swing values: V=6');
  assert.equal(steps[2].players[0].activeDieArray[0].value, 2);
  assert.equal(steps[2].players[1].activeDieArray[0].value, 4);
  assert.equal(steps[3].players[0].capturedDieArray[0].value, 4);
  assert.equal(steps[4].players[0].capturedDieArray.length, 0);
  assert.equal(steps[4].players[1].capturedDieArray.length, 0);
});

test('capture history resets at the start of each round', () => {
  const players = [
    { playerName: 'alice' },
    { playerName: 'bob' },
  ];
  const log = [
    {
      timestamp: 1,
      player: 'alice',
      message: 'alice performed Skill attack using [(8):2] against [(6):4]; Defender (6) rerolled 4 => 3; Defender (6) was captured',
    },
    { timestamp: 2, player: 'alice', message: 'End of round: alice won round 1 (1 vs. 0)' },
    {
      timestamp: 3,
      player: 'bob',
      message: 'bob performed Power attack using [(10):5] against [(8):2]; Defender (8) was captured',
    },
  ];

  const allCaptures = buildCapturedHistory(log, players);
  const currentRoundCaptures = buildCapturedHistory(log, players, Infinity, 2);
  assert.deepEqual(allCaptures.map((captures) => captures.map((die) => [
    die.recipe,
    die.value,
    die.originalPlayerIndex,
    die.capturedByIndex,
  ])), [
    [['(6)', 3, 1, 0]],
    [['(8)', 2, 0, 1]],
  ]);
  assert.deepEqual(currentRoundCaptures.map((captures) => captures.map((die) => die.recipe)), [
    [],
    ['(8)'],
  ]);
  assert.deepEqual(buildCapturedHistory(log, players, Infinity, 1).map((captures) =>
    captures.map((die) => die.recipe)), [
    ['(6)'],
    [],
  ]);
  assert.equal(buildCapturedHistory(log, players, 0)[0].length, 1);
  assert.equal(buildCapturedHistory(log, players, 0)[1].length, 0);
});
