import { expect, test } from '@playwright/test';

function overlaps(first, second) {
  return !(
    first.right <= second.left + 1 ||
    first.left >= second.right - 1 ||
    first.bottom <= second.top + 1 ||
    first.top >= second.bottom - 1
  );
}

test('mobile orientations keep both HUDs visible outside the dice area', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.route('**/js/dice-scene.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: 'export function renderDiceScene(container) { container.dataset.sceneReady = "true"; return { dispose() {}, setBottomPlayerIndex() {} }; }',
  }));
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
  await page.waitForFunction(() => globalThis.window.document.querySelector('.game-3d-board')?.dataset.sceneReady === 'true');

  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.locator('.game-play-area').evaluate((area) => {
      const box = (element) => ({
        left: element.offsetLeft,
        top: element.offsetTop,
        width: element.clientWidth,
        height: element.clientHeight,
        right: element.offsetLeft + element.clientWidth,
        bottom: element.offsetTop + element.clientHeight,
      });
      const topHud = area.querySelector('.game-3d-hud-top');
      const board = area.querySelector('.game-3d-board');
      const bottomHud = area.querySelector('.game-3d-hud-bottom');
      return {
        areaWidth: area.clientWidth,
        areaHeight: area.clientHeight,
        topHud: box(topHud),
        board: box(board),
        bottomHud: box(bottomHud),
      };
    });
    for (const hud of [layout.topHud, layout.bottomHud]) {
      expect(hud.height).toBeGreaterThan(0);
      expect(hud.top).toBeGreaterThanOrEqual(0);
      expect(hud.left).toBeGreaterThanOrEqual(0);
      expect(hud.right).toBeLessThanOrEqual(layout.areaWidth + 1);
      expect(hud.bottom).toBeLessThanOrEqual(layout.areaHeight + 1);
      expect(overlaps(hud, layout.board)).toBeFalsy();
    }
    expect(layout.board.height).toBeGreaterThan(0);
    expect(layout.board.width).toBeGreaterThan(0);
  }

  const hudCards = page.locator('.game-hud-player');
  await expect(hudCards).toHaveCount(2);
  await expect(page.locator('details')).toHaveCount(0);
  await expect(page.locator('.game-hud-pill').first()).toBeVisible();
  const overflow = await hudCards.evaluateAll((cards) => cards.map((card) => ({
    scrollHeight: card.scrollHeight,
    clientHeight: card.clientHeight,
  })));
  expect(overflow.every(({ scrollHeight, clientHeight }) => scrollHeight <= clientHeight + 1)).toBeTruthy();
});

test('replay links select a step and invalid steps fall back to the current game', async ({ page }) => {
  const game = {
    gameId: 22,
    gameState: 'ACTIVE',
    currentPlayerIdx: 0,
    activePlayerIdx: 0,
    playerDataArray: [
      { playerName: 'alice', activeDieArray: [{ recipe: 'z(8)', sides: 8, value: 3, skillArray: ['Speed'] }] },
      { playerName: 'bob', activeDieArray: [{ recipe: 6, value: 4 }] },
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
  await page.route('**/js/dice-scene.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: 'export function renderDiceScene() { return { dispose() {}, setBottomPlayerIndex() {} }; }',
  }));
  await page.route('**/api/responder', async (route) => {
    const request = JSON.parse(route.request().postData());
    const response = request.type === 'loadPlayerName'
      ? { status: 'ok', data: { userName: 'alice' } }
      : request.type === 'loadGameData'
        ? { status: 'ok', data: game }
        : { status: 'failed', message: 'Unexpected API request.' };
    await route.fulfill({ json: response });
  });

  await page.goto('/#game?gameId=22&step=0');
  await expect(page.getByText('History · alice used Skill attack against bob')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Take action on buttonweavers.com' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Link to this step' })).toHaveAttribute('href', '#game?gameId=22&step=0');
  await expect(page.locator('.game-3d-hud .game-hud-pill').filter({ hasText: 'Attacker' })).toBeVisible();
  await expect(page.getByText('Attack direction: attackers → targets.')).toBeVisible();
  await expect(page.locator('.game-event-current-step')).toContainText('alice performed Skill attack');
  await expect(page.getByText('bob passed')).toBeVisible();
  await expect(page.getByText('alice set swing values: V=6')).toBeVisible();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.locator('.game-event-current-step')).toContainText('alice performed Skill attack');
  await page.getByRole('button', { name: 'Show flat game state' }).click();
  await expect(page.locator('.game-die-replay-attacker')).toBeVisible();
  await expect(page.locator('.game-die-replay-target')).toBeVisible();
  await page.getByRole('button', { name: 'Show 3D game view' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page).toHaveURL(/#game\?gameId=22&step=1$/);

  await page.goto('/#game?gameId=22&step=8');
  await expect(page.getByText('Replay step not found; showing the current game state.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Take action on buttonweavers.com' })).toBeVisible();

  await page.goto('/#game?gameId=22');
  await expect(page.getByText('Current game state.')).toBeVisible();
});
