import { expect, test } from '@playwright/test';

test("the 2D board shows button skills on the owning player's card", async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    globalThis.window.document.querySelector('#game-view').hidden = false;
    const { renderGameView } = await import('/js/game-view.js');
    renderGameView(globalThis.window.document.querySelector('#game-content'), {
      gameId: 22,
      gameState: 'ACTIVE',
      maxWins: 3,
      playerDataArray: [
        { playerName: 'Alice', button: { name: 'Avis' }, activeDieArray: [{ value: 4, recipe: 6 }] },
        {
          playerName: 'Bob',
          button: { name: 'Bauer', skillArray: ['Konstant'] },
          activeDieArray: [
            { value: 2, recipe: 8, statusArray: ['attacker'] },
            { value: 5, recipe: 12, skillArray: ['Shadow'] },
          ],
          capturedDieArray: [{ value: 3, recipe: 6, properties: ['WasJustCaptured'] }],
        },
      ],
    });
  });

  await expect(page.locator('.game-spatial-board')).toBeVisible();
  await expect(page.locator('.game-player-1')).toContainText('Skills: Konstant');
  await expect(page.locator('.game-player-0')).not.toContainText('Skills:');
});

test('replay links select a step and invalid steps fall back to the current game', async ({ page }) => {
  const game = {
    gameId: 22,
    gameState: 'ACTIVE',
    currentPlayerIdx: 0,
    activePlayerIdx: 0,
    playerDataArray: [
      {
        playerName: 'alice',
        playerColor: '#dd99dd',
        activeDieArray: [{ recipe: 'z(8)', sides: 8, value: 3, skillArray: ['Speed'] }],
        capturedDieArray: [{ recipe: 6, sides: 6, value: 4, properties: ['WasJustCaptured'] }],
      },
      { playerName: 'bob', playerColor: '#ddffdd', activeDieArray: [{ recipe: 6, value: 4 }] },
    ],
    gameActionLog: [{
      timestamp: 1,
      player: 'alice',
      message: 'alice performed Skill attack using [z(8):2] against [(6):4]; Defender (6) was captured; Attacker z(8) rerolled 2 => 3',
    }, {
      timestamp: 2,
      player: 'bob',
      message: 'bob passed',
    }, {
      timestamp: 3,
      player: 'alice',
      message: 'alice set swing values: V=6',
    }],
  };
  await page.route('**/api/responder', async (route) => {
    const request = JSON.parse(route.request().postData());
    const response = request.type === 'loadPlayerName'
      ? { status: 'ok', data: { userName: 'alice' } }
      : request.type === 'loadGameData'
        ? { status: 'ok', data: game }
        : request.type === 'loadPlayerInfo'
          ? { status: 'ok', data: { user_prefs: { neutral_color_a: '#cccccc', neutral_color_b: '#dddddd' } } }
        : { status: 'failed', message: 'Unexpected API request.' };
    await route.fulfill({ json: response });
  });

  await page.goto('/#game?gameId=22&timestamp=1');
  await expect(page.getByText('History · alice used Skill attack against bob')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Take action on buttonweavers.com' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Link to this step' })).toHaveAttribute('href', /#game\?gameId=22&replay=.+-attack/);
  await expect(page.locator('.game-event-current-step')).toContainText('alice performed Skill attack');
  await expect(page.getByText('bob passed')).toBeVisible();
  await expect(page.getByText('alice set swing values: V=6')).toBeVisible();
  await page.locator('.game-event-action').filter({ hasText: 'bob passed' }).click();
  await expect(page.getByText(/History · bob passed/)).toBeVisible();
  await expect(page).toHaveURL(/#game\?gameId=22&replay=.+-event$/);
  await page.locator('.game-event-action').filter({ hasText: 'alice performed Skill attack' }).click();
  await expect(page.getByText('History · alice used Skill attack against bob')).toBeVisible();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.locator('.game-event-current-step')).toContainText('alice performed Skill attack');
  await expect(page.locator('.game-die-replay-attacker')).toBeVisible();
  await expect(page.locator('.game-die-replay-target')).toBeVisible();
  await expect(page.locator('.game-spatial-attack-label')).toHaveText('Skill attack');
  await expect(page.locator('.game-spatial-attack-connector')).toHaveCount(1);
  await expect(page.locator('.game-spatial-captured-pile')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.game-spatial-captured-pile')).toContainText('Captured by alice');
  await expect(page.locator('.game-spatial-captured-pile .game-die-replay-changed')).toBeVisible();
  const capturedRegion = page.locator('.game-spatial-region:has(.game-spatial-captured-pile)');
  const capturedPile = await capturedRegion.locator('.game-spatial-captured-pile').boundingBox();
  const activeDice = await capturedRegion.locator('.game-spatial-active-dice').boundingBox();
  expect(capturedPile.x).toBeGreaterThanOrEqual(activeDice.x + activeDice.width - 1);
  const opponentInfo = await page.locator('.game-player-1').boundingBox();
  const spatialBoard = await page.locator('.game-spatial-board').boundingBox();
  const playerInfo = await page.locator('.game-player-0').boundingBox();
  const spatialRegions = await page.locator('.game-spatial-region').evaluateAll((regions) =>
    regions.map((region) => region.getBoundingClientRect().top));
  expect(opponentInfo.y + opponentInfo.height).toBeLessThanOrEqual(spatialBoard.y + 1);
  expect(spatialRegions[0]).toBeLessThan(spatialRegions[1]);
  expect(playerInfo.y).toBeGreaterThanOrEqual(spatialBoard.y + spatialBoard.height - 1);
  await expect(page).toHaveURL(/#game\?gameId=22&replay=.+-result$/);
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByText('Current game state.')).toBeVisible();
  await expect(page).toHaveURL(/#game\?gameId=22$/);

  await page.goto('/#game?gameId=22&timestamp=999');
  await expect(page.getByText('Replay step not found; showing the current game state.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Take action on buttonweavers.com' })).toBeVisible();

  await page.goto('/#game?gameId=22');
  await expect(page.getByText('Current game state.')).toBeVisible();
});

test('spatial 2D view connects multi-die attacks and stays inside a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.evaluate(async () => {
    globalThis.window.document.querySelector('#game-view').hidden = false;
    const { renderGameView } = await import('/js/game-view.js');
    renderGameView(globalThis.window.document.querySelector('#game-content'), {
      gameId: 41,
      gameState: 'ACTIVE',
      currentPlayerIdx: 0,
      playerDataArray: [
        {
          playerName: 'alice',
          playerColor: '#dd99dd',
          activeDieArray: [
            { recipe: 'z(8)', sides: 8, value: 3, skillArray: ['Speed'] },
            { recipe: 'p(6)', sides: 6, value: 4, skillArray: ['Poison'] },
          ],
        },
        {
          playerName: 'bob',
          playerColor: '#ddffdd',
          activeDieArray: [{ recipe: 12, sides: 12, value: 5, statusArray: ['Dizzy'] }],
        },
      ],
      gameActionLog: [{
        timestamp: 1,
        player: 'alice',
        message: 'alice performed Skill attack using [z(8):2, p(6):3] against [(12):5]; Attacker z(8) rerolled 2 => 3; Attacker p(6) rerolled 3 => 4',
      }],
    }, { timestamp: '1' });
  });

  await expect(page.locator('.game-die-replay-attacker')).toHaveCount(2);
  await expect(page.locator('.game-die-replay-target')).toHaveCount(1);
  await expect(page.locator('.game-spatial-attack-connector')).toHaveCount(2);
  await expect(page.locator('.game-spatial-attack-connector').first()).toHaveAttribute('marker-end', 'url(#game-spatial-arrow)');
  await expect(page.locator('.game-spatial-die').first()).toHaveAttribute('aria-label', /active die, rolled/);

  const layout = await page.locator('.game-spatial-board').evaluate((board) => {
    const boardBox = board.getBoundingClientRect();
    return {
      pageOverflows: globalThis.window.document.documentElement.scrollWidth >
        globalThis.window.document.documentElement.clientWidth + 1,
      board: { left: boardBox.left, right: boardBox.right, top: boardBox.top, bottom: boardBox.bottom },
      dice: [...board.querySelectorAll('.game-spatial-die')].map((die) => {
        const box = die.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }),
    };
  });
  expect(layout.pageOverflows).toBeFalsy();
  for (const die of layout.dice) {
    expect(die.left).toBeGreaterThanOrEqual(layout.board.left - 1);
    expect(die.right).toBeLessThanOrEqual(layout.board.right + 1);
    expect(die.top).toBeGreaterThanOrEqual(layout.board.top - 1);
    expect(die.bottom).toBeLessThanOrEqual(layout.board.bottom + 1);
  }

  await expect(page.locator('.game-spatial-region-top')).toHaveAttribute('data-player-name', 'bob');
  await page.getByRole('button', { name: 'Flip orientation' }).click();
  await expect(page.locator('.game-spatial-region-top')).toHaveAttribute('data-player-name', 'alice');
});
