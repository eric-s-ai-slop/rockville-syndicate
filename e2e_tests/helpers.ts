import { expect, Page } from '@playwright/test';

/**
 * From the chapter-select screen, break every CLASSIFIED chapter's redaction
 * seal. Seals take two interactions each: intact -> cracked -> broken, and the
 * card label reads "CLICK TO CRACK SEAL" then "SHATTER SEAL" before the real
 * title is revealed. There can be more than one sealed card on screen, and a
 * redacted card hides its title, so we simply break them all by repeatedly
 * clicking whatever seal label is currently showing. FREE PLAY must be enabled
 * first so the cards are unlocked.
 */
export async function breakSeal(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const label = page.getByText(/CLICK TO CRACK SEAL|SHATTER SEAL/).first();
    if (!(await label.isVisible().catch(() => false))) break;
    await label.click();
    await page.waitForTimeout(400);
  }
}

/**
 * Navigate from the landing page all the way to a chapter's game canvas.
 * Picks Eric, enters Free Play, optionally breaks a classified seal, then
 * clicks the chapter card by its displayed title.
 */
export async function navigateToChapter(
  page: Page,
  chapterTitle: string,
  options: { classified?: boolean } = {},
): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Eric/i }).first().click();
  await page.getByRole('button', { name: /Begin the Story/i }).click();
  await expect(page.getByText('LINEAR')).toBeVisible();
  await page.getByText('FREE PLAY').click();
  if (options.classified) {
    await breakSeal(page);
  }
  await page.getByText(chapterTitle).first().click();
}

/**
 * Advance game flow (dialogue + walk triggers) until `condition` returns true.
 * Presses Space to dismiss visible dialogue and teleports the player onto any
 * active walk target when no dialogue is showing. Throws on timeout.
 */
export async function advanceUntil(
  page: Page,
  condition: () => Promise<boolean>,
  maxSeconds = 60,
): Promise<void> {
  const maxTicks = maxSeconds * 4;
  for (let i = 0; i < maxTicks; i++) {
    if (await condition()) return;
    const isDialog = await page.locator('p.font-pixel').first().isVisible();
    if (isDialog) {
      await page.keyboard.press('Space');
    } else {
      await page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        if (scene?.walkTarget) {
          scene.player.x = scene.walkTarget.x;
          scene.player.y = scene.walkTarget.y;
        }
      });
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`advanceUntil: timed out after ${maxSeconds}s`);
}
