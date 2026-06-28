import { test, expect } from '@playwright/test';
import { navigateToChapter } from './helpers';

// poolParty is a background mode unique to chapter9. It drives NPC sprite
// animations (Jacob, Sam, Anastasia, Sophia) throughout the chapter and has
// no win/lose condition. This test verifies the mode wires up correctly on
// chapter load and stays active while dialogue advances.

test('chapter9: poolParty background mode activates and persists', async ({ page }) => {
  test.setTimeout(60000);

  await navigateToChapter(page, 'The Suds & Soles Pool Party');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });

  // poolParty is the first beat — it starts immediately and runs for the
  // entire chapter, so activeMode should reflect it after the canvas boots.
  await expect.poll(
    () =>
      page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return scene?.activeMode?.id ?? null;
      }),
    { timeout: 10000, intervals: [250] },
  ).toBe('poolParty');

  // Advance one dialogue beat and confirm the background mode is still running.
  const isDialog = await page.locator('p.font-pixel').first().isVisible();
  if (isDialog) await page.keyboard.press('Space');
  await page.waitForTimeout(500);

  await expect.poll(
    () =>
      page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return scene?.activeMode?.id ?? null;
      }),
    { timeout: 5000, intervals: [250] },
  ).toBe('poolParty');
});
