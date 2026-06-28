import { test, expect } from '@playwright/test';
import { advanceUntil, breakSeal } from './helpers';

test('test stewOffering minigame', async ({ page }) => {
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

  // Offer stew to each girl. Each offer plays a walk tween + a delayed callback
  // before `offersCompleted` ticks up, so click then poll until it registers
  // (the mode ignores clicks while `isMoving` is true).
  const offerTo = async (npcId: string, expectedCount: number) => {
    await page.evaluate((id) => {
      const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
      scene.activeMode.handleNpcClick(id);
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

  await offerTo('girl1', 1);
  await offerTo('girl2', 2);
  await offerTo('girl3', 3);

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
