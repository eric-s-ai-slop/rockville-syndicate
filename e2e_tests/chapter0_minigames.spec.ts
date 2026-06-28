import { test, expect } from '@playwright/test';
import { navigateToChapter, advanceUntil } from './helpers';

// groupChat and complicityReport are unique to chapter0 (Maria Brooke) and not
// exercised by any other E2E test. This test advances through the chapter's
// opening dialogue, short-circuits the 90-second groupChat timeline, then
// verifies the complicityReport summary screen appears and dismisses cleanly.

test('chapter0: groupChat activates and complicityReport completes', async ({ page }) => {
  // Full-Phaser playthrough: passes locally but too slow/flaky against the dev
  // server on contended CI runners. Skip on CI; still runs locally. See the
  // E2E perf follow-up (serve a prod preview build instead of `npm run dev`).
  test.skip(!!process.env.CI, 'Flaky on slow CI runners (full playthrough vs dev server)');
  test.setTimeout(120000);

  await navigateToChapter(page, 'Maria Brooke');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);

  const activeMode = () =>
    page.evaluate(() => {
      const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
      return scene?.activeMode?.id ?? null;
    });

  // Advance dialogue/walk beats until groupChat is fully started. activeMode.id
  // flips to 'groupChat' while its intro dialogue is still showing, but the
  // mode's onCompleteCallback isn't wired until start() runs after the intro is
  // dismissed — so wait for the callback, not just the id, before firing it.
  const groupChatReady = () =>
    page.evaluate(() => {
      const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
      return scene?.activeMode?.id === 'groupChat' &&
        typeof scene.activeMode.onCompleteCallback === 'function';
    });
  await advanceUntil(page, groupChatReady, { maxSeconds: 90 });

  // Skip the 90-second chat timeline by firing the completion callback directly.
  // TypeScript `private` is compile-time only — the property is accessible at runtime.
  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    scene.activeMode.onCompleteCallback({ outcome: 'win' });
  });

  // Advance remaining beats until complicityReport launches
  await advanceUntil(page, async () => (await activeMode()) === 'complicityReport', { maxSeconds: 60 });

  // Dismiss the report with Space (matches the mode's keyListener)
  await page.keyboard.press('Space');

  // Mode should clear after dismissal
  await expect.poll(activeMode, { timeout: 10000, intervals: [250] }).not.toBe('complicityReport');
});
