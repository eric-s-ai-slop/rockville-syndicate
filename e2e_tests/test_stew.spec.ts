import { test, expect } from '@playwright/test';
import { breakSeal } from './helpers';

test('test stewOffering minigame', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');

  // Select Eric
  await page.getByRole('button', { name: /Eric/i }).first().click();
  await page.getByRole('button', { name: /Begin the Story/i }).click();
  await page.getByText('FREE PLAY').click();
  await breakSeal(page);
  await page.getByText('The UMBC Incident').first().click();
  
  await page.waitForTimeout(2000);
  
  // Advance to stewOffering mode
  const advanceToStewOffering = async () => {
    let attempts = 0;
    while (attempts < 100) {
      const isStewOffering = await page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return scene?.activeMode?.id === 'stewOffering';
      });
      if (isStewOffering) return true;

      const isDialogOpen = await page.locator('p.font-pixel').first().isVisible();
      if (isDialogOpen) {
        await page.keyboard.press('Space');
      } else {
        await page.evaluate(() => {
          const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
          if (scene && scene.walkTarget) {
            scene.player.x = scene.walkTarget.x;
            scene.player.y = scene.walkTarget.y;
          }
        });
      }
      await page.waitForTimeout(250);
      attempts++;
    }
    return false;
  };

  const reached = await advanceToStewOffering();
  expect(reached).toBe(true);
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
