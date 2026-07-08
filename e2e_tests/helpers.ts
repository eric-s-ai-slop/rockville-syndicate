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
 * Advance game flow until `condition` returns true. Each tick performs ALL of
 * its game interaction inside a single page.evaluate — dismissing dialogue (via
 * a synthetic Space keydown), answering choice beats (which ignore Space — the
 * first option is clicked), auto-completing any `skipModes` minigame blocking
 * the flow, and otherwise teleporting the player onto the active walk target.
 *
 * Collapsing the per-tick work to one round-trip (rather than separate
 * isVisible()/keyboard/evaluate calls) keeps wall-clock low on contended CI
 * runners, where CDP round-trips dominate and the old 3-calls-per-tick loop
 * blew the test timeout before reaching the target. Throws on timeout.
 */
export async function advanceUntil(
  page: Page,
  condition: () => Promise<boolean>,
  options: {
    maxSeconds?: number;
    skipModes?: string[];
    /**
     * Called once per tick, before the interaction step, with the live
     * ChapterScene's current scene index and active mode id (N1). Used by the
     * gauntlet's `--shots` to detect scene-index changes and capture a
     * screenshot on each new scene without hand-rolling a second polling loop
     * (lesson 3: reuse this helper, don't parallel it).
     */
    onTick?: (info: { sceneIndex: number | null; mode: string | null }) => Promise<void>;
  } = {},
): Promise<void> {
  const { maxSeconds = 90, skipModes = [], onTick } = options;
  const maxTicks = Math.ceil((maxSeconds * 1000) / 150);
  for (let i = 0; i < maxTicks; i++) {
    if (await condition()) return;
    if (onTick) {
      const info = await page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return {
          sceneIndex: typeof scene?.currentSceneIndex === 'number' ? scene.currentSceneIndex : null,
          mode: scene?.activeMode?.id ?? null,
        };
      });
      await onTick(info);
    }
    await page.evaluate((skip) => {
      const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');

      // Auto-complete a foreground minigame that is blocking the flow.
      // '*' means "any mode" — for callers (like the agent CLI gauntlet) that
      // can't import the mode registry to enumerate real ids (it pulls in
      // Phaser at module scope, which crashes outside a browser context).
      const mode = scene?.activeMode;
      if (mode && (skip.includes('*') || skip.includes(mode.id)) && typeof mode.onCompleteCallback === 'function') {
        mode.onCompleteCallback({ outcome: 'win' });
        return;
      }

      // Choice beats can't be dismissed with Space — pick the first option.
      const choice = document.querySelector('[data-testid="dialogue-choice"]') as HTMLElement | null;
      if (choice) { choice.click(); return; }

      // A normal dialogue line: advance it (skips the typewriter, then proceeds).
      const line = document.querySelector('p.font-pixel') as HTMLElement | null;
      if (line && line.offsetParent !== null) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
        return;
      }

      // Nothing to read: walk to the active marker by teleporting onto it.
      if (scene?.walkTarget) {
        scene.player.x = scene.walkTarget.x;
        scene.player.y = scene.walkTarget.y;
      }
    }, skipModes);
    await page.waitForTimeout(150);
  }
  throw new Error(`advanceUntil: timed out after ${maxSeconds}s`);
}
