import { expect, test } from '@playwright/test';

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
        { playerName: 'Bob', button: { name: 'Bauer' }, activeDieArray: [{ value: 2, recipe: 8 }] },
      ],
    });
  });
  await page.waitForFunction(() => globalThis.window.document.querySelector('.game-3d-board')?.dataset.sceneReady === 'true');

  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const area = await page.locator('.game-play-area').boundingBox();
    const topHud = await page.locator('.game-3d-hud-top').boundingBox();
    const board = await page.locator('.game-3d-board').boundingBox();
    const bottomHud = await page.locator('.game-3d-hud-bottom').boundingBox();
    expect(topHud.height).toBeGreaterThan(0);
    expect(topHud.y + topHud.height).toBeLessThanOrEqual(board.y + 1);
    expect(bottomHud.height).toBeGreaterThan(0);
    expect(bottomHud.y).toBeGreaterThanOrEqual(board.y + board.height - 1);
    expect(bottomHud.y + bottomHud.height).toBeLessThanOrEqual(area.y + area.height + 1);
  }
});
