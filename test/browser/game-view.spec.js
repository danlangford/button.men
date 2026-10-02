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
