import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GameAgent } from './index';
import type { BridgePlaytestSnapshot, DevBridgeWindow } from './DevBridge';
import { navigateToChapter, advanceUntil } from '../helpers';

test.describe.configure({ timeout: 120_000 });

const SAFE_CHOICE_PROMPT = '[fixture] actor mutations complete; test safe branch save now';
const BACKGROUND_CHOICE_PROMPT = '[fixture] background mode is active; test unsafe branch save now';

async function livePlaytestSnapshot(agent: GameAgent): Promise<BridgePlaytestSnapshot> {
  return agent.executeJavascript(() => {
    const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    if (!scene || typeof scene.capturePlaytestSnapshot !== 'function') {
      throw new Error('Playtest snapshot bridge unavailable');
    }
    return scene.capturePlaytestSnapshot();
  });
}

async function choicePrompt(agent: GameAgent): Promise<string | null> {
  return agent.executeJavascript(() => {
    const prompt = document.querySelector('p.font-pixel')?.textContent?.trim() ?? null;
    const choices = document.querySelectorAll('[data-testid="dialogue-choice"]');
    return choices.length > 0 ? prompt : null;
  });
}

async function walkTarget(agent: GameAgent): Promise<{ x: number; y: number; radius: number } | null> {
  return agent.executeJavascript(() => {
    const target = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene')?.walkTarget;
    return target ? { x: target.x, y: target.y, radius: target.radius ?? 24 } : null;
  });
}

async function reachChoiceAfterActorMutations(page: Parameters<typeof navigateToChapter>[0], agent: GameAgent): Promise<void> {
  for (;;) {
    const result = await advanceUntil(
      page,
      async () => (await choicePrompt(agent)) === SAFE_CHOICE_PROMPT,
      { maxSeconds: 90, stopOnWalkTarget: true },
    );
    if (result.status === 'condition-met') return;
    expect(result.status).toBe('walk-target-present');
    const target = await walkTarget(agent);
    expect(target).not.toBeNull();
    const walked = await agent.walkTo(target!.x, target!.y, target!.radius, 12);
    expect(walked.ok).toBe(true);
    // walkTo uses deterministic stepFrames and intentionally leaves the game
    // loop paused; passive beats after the walk still need real-time ticking.
    await agent.resumeLoop();
  }
}

test('fixture branch snapshot restores actor, scalar, progress, and Maria state', async ({ page }, testInfo) => {
  const agent = new GameAgent(page);
  const fileState = path.join(testInfo.outputDir, 'fixture-branch-state.json');

  try {
    await navigateToChapter(page, 'Playtest Fixture');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
    await reachChoiceAfterActorMutations(page, agent);

    const saved = await livePlaytestSnapshot(agent);
    expect(saved.sceneIndex).toBe(0);
    expect(saved.beatIndex).toBe(15);
    await expect.poll(() => choicePrompt(agent), { timeout: 5_000 }).toBe(SAFE_CHOICE_PROMPT);
    expect(saved.player).not.toBeNull();
    expect(saved.player!.velocityX).toBe(0);
    expect(saved.player!.velocityY).toBe(0);
    expect(saved.hp).toBe(120);
    expect(saved.shardsCollected).toBe(0);
    expect(saved.ledgerTotal).toBe(1);
    expect(saved.mariaBrookeStats.lookUps).toBe(0);
    expect(saved.progress.rose_silence).toBe(false);

    const savedJordan = saved.actors.find(actor => actor.id === 'jordan');
    expect(savedJordan).toBeDefined();
    expect(savedJordan).toMatchObject({ x: 350, y: 250, visible: true, flipX: true });
    expect(savedJordan!.frame).toBeDefined();

    await agent.saveQuickState();
    const fileSave = await agent.saveFileState(fileState);
    expect(fileSave).toEqual({ branchSafe: true, unsafeReasons: [] });
    expect(JSON.parse(fs.readFileSync(fileState, 'utf8')).safety).toMatchObject(fileSave);
    await agent.modifyStat('hp', 17);
    await agent.modifyStat('shards', 9);
    await agent.modifyStat('ledger', 42);

    // This option mutates the Maria singleton, then enters the foreground mode.
    await agent.chooseOption('0');
    const mariaMutated = await livePlaytestSnapshot(agent);
    expect(mariaMutated.mariaBrookeStats.lookUps).toBe(1);

    await agent.loadQuickState();
    await page.waitForTimeout(600);
    const restored = await livePlaytestSnapshot(agent);
    expect(restored.sceneIndex).toBe(saved.sceneIndex);
    expect(restored.beatIndex).toBe(saved.beatIndex);
    expect(restored.player).toEqual(saved.player);
    expect(restored.hp).toBe(saved.hp);
    expect(restored.shardsCollected).toBe(saved.shardsCollected);
    expect(restored.ledgerTotal).toBe(saved.ledgerTotal);
    expect(restored.actors.find(actor => actor.id === 'jordan')).toEqual(savedJordan);
    expect(restored.mariaBrookeStats).toEqual(saved.mariaBrookeStats);
    // Restore can land while the React typewriter is still revealing the
    // choice prompt; a real Space press finishes that visible instruction.
    await agent.pressKey('Space');
    await expect.poll(() => choicePrompt(agent), { timeout: 5_000 }).toBe(SAFE_CHOICE_PROMPT);

    // This option writes omega-save-v2, then the safe snapshot must restore the
    // pre-choice progress object through settings.ts rather than a new key.
    await agent.chooseOption('1');
    const persistedAfterChoice = await agent.executeJavascript(() => {
      const raw = localStorage.getItem('omega-save-v2');
      return raw ? JSON.parse(raw) as { progress?: { rose_silence?: boolean } } : null;
    });
    expect(persistedAfterChoice?.progress?.rose_silence).toBe(true);

    await agent.loadQuickState();
    await page.waitForTimeout(600);
    const restoredProgress = await agent.getProgressBridge();
    expect(restoredProgress.rose_silence).toBe(false);
    const persistedAfterRestore = await agent.executeJavascript(() => {
      const raw = localStorage.getItem('omega-save-v2');
      return raw ? JSON.parse(raw) as { progress?: { rose_silence?: boolean } } : null;
    });
    expect(persistedAfterRestore?.progress?.rose_silence).toBe(false);

    // The legacy file save/load path remains separate and still restores its
    // documented scene/beat/player/HP/ledger payload without a beat-0 rewind.
    await agent.loadFileState(fileState);
    await page.waitForTimeout(600);
    const fileRestored = await livePlaytestSnapshot(agent);
    expect(fileRestored.sceneIndex).toBe(saved.sceneIndex);
    expect(fileRestored.beatIndex).toBe(saved.beatIndex);
    expect(fileRestored.player).toEqual(saved.player);
    expect(fileRestored.hp).toBe(saved.hp);
    expect(fileRestored.ledgerTotal).toBe(saved.ledgerTotal);
  } finally {
    await agent.dispose();
  }
});

test('fixture rejects loading a quick-save captured at the active background boundary', async ({ page }, testInfo) => {
  const agent = new GameAgent(page);
  try {
    await navigateToChapter(page, 'Playtest Fixture');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

    const result = await advanceUntil(
      page,
      async () => (await choicePrompt(agent)) === BACKGROUND_CHOICE_PROMPT,
      { maxSeconds: 90, skipModes: ['benTrivia'] },
    );
    expect(result.status).toBe('condition-met');

    const save = await agent.saveQuickState();
    expect(save.branchSafe).toBe(false);
    expect(save.unsafeReasons.join(' ')).toContain('Background mode "poolParty"');
    const fileState = path.join(testInfo.outputDir, 'fixture-unsafe-state.json');
    const fileSave = await agent.saveFileState(fileState);
    expect(fileSave).toEqual(save);
    expect(JSON.parse(fs.readFileSync(fileState, 'utf8')).safety).toMatchObject(save);
    await expect(agent.loadQuickState()).rejects.toThrow(/Cannot restore unsafe branch save/);
  } finally {
    await agent.dispose();
  }
});
