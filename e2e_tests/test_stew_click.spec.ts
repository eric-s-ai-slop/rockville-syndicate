import { test, expect } from '@playwright/test';
import { advanceUntil, breakSeal } from './helpers';

test('test stewOffering minigame by clicking', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto('/');

  // Select Eric
  await page.getByRole('button', { name: /Eric/i }).first().click();
  await page.getByRole('button', { name: /Begin the Story/i }).click();
  await page.getByText('FREE PLAY').click();
  await breakSeal(page);
  await page.getByText('The UMBC Incident').first().click();

  await page.waitForTimeout(2000);

  // Advance through the opening beats until the stewOffering minigame starts.
  // This beat has no intro lines, so the id flipping means the mode is live.
  await advanceUntil(
    page,
    () =>
      page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return scene?.activeMode?.id === 'stewOffering';
      }),
    { maxSeconds: 120 },
  );
  console.log('Reached stewOffering minigame!');

  await page.waitForTimeout(1000);

  // Drive the minigame by firing the sprites' own 'pointerdown' handlers, the
  // same path a real click takes. Each offer plays a walk tween + a delayed
  // callback before `offersCompleted` ticks up, and the mode ignores input
  // while `isMoving` is true — so click then poll until the offer registers.
  const clickGirl = async (npcId: string, expectedCount: number) => {
    await page.evaluate((id) => {
      const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
      scene.actorSprites[id][0].emit('pointerdown');
    }, npcId);

    await expect.poll(
      () => page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
        return scene.activeMode?.offersCompleted ?? -1;
      }),
      { timeout: 15000, intervals: [250] },
    ).toBeGreaterThanOrEqual(expectedCount);
    console.log(`Offer to ${npcId} completed.`);
  };

  await clickGirl('girl1', 1);
  await clickGirl('girl2', 2);
  await clickGirl('girl3', 3);

  // After the third offer the mode resolves on a delayed callback and hands
  // control back to the chapter beats — poll until it is no longer active.
  await expect.poll(
    () => page.evaluate(() => {
      const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
      return scene.activeMode?.id !== 'stewOffering';
    }),
    { timeout: 15000, intervals: [250] },
  ).toBe(true);

  console.log('stewOffering minigame completed.');
});
