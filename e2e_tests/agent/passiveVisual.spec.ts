import { expect, test } from '@playwright/test';
import { advanceUntil, navigateToChapter } from '../helpers';
import type { BridgeBeatTraceEntry, DevBridgeWindow } from './DevBridge';
import fixture from '../../src/data/chapters/chapterFixture.playtest';

test.describe.configure({ timeout: 120_000 });

async function beatTrace(page: Parameters<typeof navigateToChapter>[0]): Promise<BridgeBeatTraceEntry[]> {
  return page.evaluate(() => {
    const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    return scene?.playtestBeatTrace ?? [];
  });
}

test('fixture trace preserves passive visual beats through the actor boundary', async ({ page }) => {
  await navigateToChapter(page, fixture.title);
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });

  const result = await advanceUntil(
    page,
    () => page.evaluate(() => {
      const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
      return scene?.beatIndex === 15;
    }),
    { maxSeconds: 90, skipModes: ['benTrivia'] },
  );
  expect(result.status).toBe('condition-met');

  const trace = await beatTrace(page);
  const riskEntries = trace.filter(entry => [
    'cameraPan',
    'moveActor',
    'hideActor',
    'showActor',
    'screenTint',
    'ledger',
  ].includes(entry.beatType));
  expect(new Set(riskEntries.map(entry => entry.beatType))).toEqual(new Set([
    'cameraPan',
    'moveActor',
    'hideActor',
    'showActor',
    'screenTint',
    'ledger',
  ]));
  expect(trace.length).toBeLessThanOrEqual(256);
  expect(riskEntries.every(entry => Object.keys(entry).sort().join(',') === 'beatIndex,beatType,sceneIndex,sequence,timestamp')).toBe(true);
});

test('Ch6 trace records the live chase beat without changing its duration', async ({ page }) => {
  await navigateToChapter(page, 'Operation Ding Dong Ditch Ben');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });

  const result = await advanceUntil(
    page,
    () => page.evaluate(() => {
      const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
      return scene?.chaseActive === true;
    }),
    { maxSeconds: 90 },
  );
  expect(result.status).toBe('condition-met');

  const trace = await beatTrace(page);
  expect(trace).toEqual(expect.arrayContaining([
    expect.objectContaining({ beatType: 'chase' }),
  ]));

  const chaseObservedAt = Date.now();
  await expect.poll(
    () => page.evaluate(() => {
      const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
      return scene?.chaseActive ?? false;
    }),
    { timeout: 15_000, intervals: [250] },
  ).toBe(false);
  const chaseDuration = Date.now() - chaseObservedAt;
  expect(chaseDuration).toBeLessThan(12_000);
});
