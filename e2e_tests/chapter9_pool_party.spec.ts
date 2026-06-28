import { test, expect } from '@playwright/test';
import { navigateToChapter } from './helpers';

// poolParty is a background mode unique to chapter9. It drives NPC sprite
// animations (Jacob, Sam, Anastasia, Sophia) throughout the chapter and has
// no win/lose condition. This test verifies the mode wires up correctly on
// chapter load and stays active while dialogue advances.

test('chapter9: poolParty background mode activates and persists', async ({ page }) => {
  test.setTimeout(120000);

  await navigateToChapter(page, 'The Suds & Soles Pool Party');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });

  // poolParty is the first beat — it starts immediately and runs for the
  // entire chapter, so activeMode should reflect it after the canvas boots.
  // The boot (Phaser create + asset processing) is slow on contended CI, so
  // give the first read a generous window.
  await expect.poll(
    () =>
      page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return scene?.activeMode?.id ?? null;
      }),
    { timeout: 30000, intervals: [250] },
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
    { timeout: 15000, intervals: [250] },
  ).toBe('poolParty');
});
