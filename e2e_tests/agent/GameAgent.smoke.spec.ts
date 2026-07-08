import { test, expect } from '@playwright/test';
import { GameAgent } from './index';
import { navigateToChapter, advanceUntil } from '../helpers';

/**
 * Integration smoke test proving the GameAgent stateful toolkit drives the real
 * Phaser build — continuous key-hold movement, deterministic frame stepping, the
 * engine-state bridge, and loop pause/resume. This is the verification for the
 * capabilities in docs/browser_subagent_spec.md.
 */

// These tests boot the whole game and use advanceUntil's own 60s ceiling —
// on a loaded/slow CI runner that alone can exceed Playwright's 30s default
// test timeout before the assertions even start. Give this file real headroom.
test.describe.configure({ timeout: 90_000 });

/**
 * True once the ChapterScene exists, has started, spawned the player, and is NOT
 * frozen by a dialogue/cutscene beat — i.e. the player has free walk control.
 * Must check existence explicitly: a bare `!movementFrozen` reads false both when
 * unfrozen AND before the scene boots, which would satisfy the wait instantly.
 */
async function hasWalkControl(agent: GameAgent): Promise<boolean> {
  return agent.executeJavascript<boolean>(() => {
    const s = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.scene.getScene(
      'ChapterScene',
    );
    return !!(s && s.levelStarted && s.player && !s.movementFrozen);
  });
}

/** Read Phaser's live key state for the 'D' movement key. */
async function isDDown(agent: GameAgent): Promise<boolean> {
  return agent.executeJavascript<boolean>(
    () =>
      !!(window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.scene.getScene(
        'ChapterScene',
      )?.wasdKeys?.D?.isDown,
  );
}

test('GameAgent: held key walks the player (stateful keyboard + step + bridge)', async ({ page }) => {
  const agent = new GameAgent(page);
  try {
    await navigateToChapter(page, 'The Spotify Family Insurgency');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

    // Advance dialogue/intro until the player actually has free walk control.
    await advanceUntil(page, () => hasWalkControl(agent), {
      maxSeconds: 60,
      skipModes: ['bossFight'],
    });
    await agent.focusCanvas();

    // §3 bridge: read exact state instead of screenshotting.
    const before = await agent.snapshotGameState();
    expect(before.scene).toBe('ChapterScene');
    expect(before.player).not.toBeNull();

    // §1 direct proof the held key reaches Phaser: D.isDown flips with hold/release.
    expect(await isDDown(agent)).toBe(false);
    await agent.holdKey('d');
    expect(await isDDown(agent)).toBe(true);

    // §1 continuous input + §4 deterministic stepping: advance a fixed number of
    // frames while held, so the assertion doesn't race real wall-clock time.
    await agent.stepFrames(25);
    const during = await agent.snapshotGameState();
    await agent.releaseKey('d');
    expect(await isDDown(agent)).toBe(false);

    // Holding right moved the player right and set a positive x-velocity.
    expect(during.player!.x).toBeGreaterThan(before.player!.x);
    expect(during.velocity!.x).toBeGreaterThan(0);

    // Releasing the key stops horizontal input; after stepping, velocity decays.
    await agent.stepFrames(20);
    const after = await agent.snapshotGameState();
    expect(after.velocity!.x).toBeLessThan(during.velocity!.x);
  } finally {
    await agent.dispose();
  }
});

test('GameAgent: pauseLoop freezes the world, resumeLoop restarts it (§4)', async ({ page }) => {
  const agent = new GameAgent(page);
  try {
    await navigateToChapter(page, 'The Spotify Family Insurgency');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

    expect(await agent.isLoopRunning()).toBe(true);

    await agent.pauseLoop();
    expect(await agent.isLoopRunning()).toBe(false);
    // Time is frozen: real wall-clock passes but the game does not tick.
    const a = await agent.snapshotGameState();
    await page.waitForTimeout(300);
    const b = await agent.snapshotGameState();
    expect(b.player).toEqual(a.player);

    await agent.resumeLoop();
    expect(await agent.isLoopRunning()).toBe(true);
  } finally {
    await agent.dispose();
  }
});
