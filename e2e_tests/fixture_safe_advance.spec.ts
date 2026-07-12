import { expect, test } from '@playwright/test';
import { advanceUntil, navigateToChapter } from './helpers';
import fixture from '../src/data/chapters/chapterFixture.playtest';
import { GameAgent } from './agent';

test.describe.configure({ timeout: 90_000 });

const choiceBeat = fixture.beats.find(b => b.type === 'choice') as Extract<
  (typeof fixture.beats)[number],
  { type: 'choice' }
>;
const walkToBeat = fixture.beats.find(b => b.type === 'walkTo') as Extract<
  (typeof fixture.beats)[number],
  { type: 'walkTo' }
>;

test('safe advance stops at the choice, never consumes it', async ({ page }) => {
  await navigateToChapter(page, fixture.title);
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });

  const result = await advanceUntil(page, async () => false, {
    maxSeconds: 45,
    stopOnChoice: true,
    stopOnWalkTarget: true,
  });

  expect(result).toEqual({ status: 'choice-present' });
  const choices = page.locator('[data-testid="dialogue-choice"]');
  await expect(choices).toHaveCount(choiceBeat.options.length);
  for (let i = 0; i < choiceBeat.options.length; i++) {
    await expect(choices.nth(i)).toContainText(choiceBeat.options[i].text);
  }
});

test('safe advance stops at the walk target without teleporting', async ({ page }) => {
  await navigateToChapter(page, fixture.title);
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });

  // Reach the choice first, then take option 0 (a fall-through option) so the
  // flow proceeds toward the walkTo beat.
  const toChoice = await advanceUntil(page, async () => false, {
    maxSeconds: 45,
    stopOnChoice: true,
    stopOnWalkTarget: true,
  });
  expect(toChoice).toEqual({ status: 'choice-present' });
  await page.locator('[data-testid="dialogue-choice"]').nth(0).click();

  const result = await advanceUntil(page, async () => false, {
    maxSeconds: 45,
    stopOnChoice: true,
    stopOnWalkTarget: true,
  });

  expect(result).toEqual({ status: 'walk-target-present' });
  const distance = await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    if (!scene?.player || !scene?.walkTarget) return null;
    return Math.hypot(scene.player.x - scene.walkTarget.x, scene.player.y - scene.walkTarget.y);
  });
  expect(distance).toBeGreaterThan(walkToBeat.radius ?? 0);
});

test.describe('mode boundary', () => {
  test.describe.configure({ timeout: 180_000 });

  test('background poolParty remains observable without returning mode-active', async ({ page }) => {
    const agent = new GameAgent(page);
    try {
      await navigateToChapter(page, fixture.title);
      await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });

      const boundary = await advanceUntil(
        page,
        async () => {
          return page.evaluate(() => {
            const prompt = document.querySelector('p.font-pixel')?.textContent?.trim() ?? '';
            return prompt === '[fixture] background mode is active; test unsafe branch save now';
          });
        },
        { maxSeconds: 90, skipModes: ['benTrivia'], stopOnMode: true },
      );
      expect(boundary.status).toBe('condition-met');
      expect(boundary).not.toEqual(expect.objectContaining({ status: 'mode-active' }));

      const state = await agent.snapshotGameState();
      expect(state).toMatchObject({ activeMode: 'poolParty', activeModeBackground: true });
      const observed = await agent.observeComposite();
      expect(observed.state).toMatchObject({ activeMode: 'poolParty', activeModeBackground: true });

      // Consume the boundary normally. The next blocking result is the
      // foreground boss fight, never the concurrent poolParty mode.
      const next = await advanceUntil(page, async () => false, {
        maxSeconds: 60,
        skipModes: ['benTrivia'],
        stopOnMode: true,
        stopOnChapterEnd: true,
      });
      expect(next).toEqual({ status: 'mode-active', modeId: 'bossFight' });
      expect(next).not.toEqual(expect.objectContaining({ modeId: 'poolParty' }));
    } finally {
      await agent.dispose();
    }
  });

  test('foreground modes stop the loop, background modes do not, and the chapter ends', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await navigateToChapter(page, fixture.title);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });

    // No stopOnChoice/stopOnWalkTarget here: the helper auto-picks option 0
    // and teleports through the walk target on its own. That's fine — this
    // phase is testing the helper's mode/chapter-end gating, not playtest
    // etiquette (covered by the first two tests above).
    const first = await advanceUntil(page, async () => false, {
      maxSeconds: 60,
      stopOnMode: true,
      stopOnChapterEnd: true,
    });
    expect(first).toEqual({ status: 'mode-active', modeId: 'benTrivia' });

    // benTrivia auto-wins via skipModes. The background poolParty beat sits
    // between benTrivia and the bossFight in the fixture's beat list — it
    // must NOT stop the loop (BeatEngine doesn't hold flow on background
    // minigames), so the very next stop must be the bossFight's mode.
    const second = await advanceUntil(page, async () => false, {
      maxSeconds: 60,
      stopOnMode: true,
      stopOnChapterEnd: true,
      skipModes: ['benTrivia'],
    });
    // The bossFight mode registers itself with id 'bossFight' (see
    // src/game/modes/bossFight/index.ts: `public readonly id = 'bossFight'`,
    // and BeatEngine.runBossFightAsMinigame calls getMode('bossFight')).
    expect(second).toEqual({ status: 'mode-active', modeId: 'bossFight' });
    expect(second).not.toEqual(expect.objectContaining({ modeId: 'poolParty' }));

    const third = await advanceUntil(page, async () => false, {
      maxSeconds: 60,
      stopOnChapterEnd: true,
      skipModes: ['*'],
    });
    expect(third).toEqual({ status: 'chapter-ended' });

    // Canary: if poolParty (a background mode native to Chapter 9) throws
    // when driven outside its home chapter, this test must go red.
    expect(pageErrors).toEqual([]);
  });
});
