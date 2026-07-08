import { expect, Page } from '@playwright/test';
import type { DevBridgeWindow } from './agent/DevBridge';

/**
 * H3: diagnostics captured off the live scene at the moment `advanceUntil`
 * gives up, so a caller doesn't have to blindly guess whether a timeout was a
 * physics issue (player never reached walkTarget), a UI issue (a dialogue
 * line or choice buttons stuck on screen), or a mode issue (activeMode never
 * completed).
 */
export interface AdvanceTimeoutDiagnostics {
  beatIndex: number | null;
  beatType: string | null;
  player: { x: number; y: number } | null;
  walkTarget: { x: number; y: number; radius?: number } | null;
  distanceToWalkTarget: number | null;
  movementFrozen: boolean | null;
  levelStarted: boolean | null;
  activeModeId: string | null;
  dialogueVisible: boolean;
  choiceCount: number;
}

/**
 * Thrown by `advanceUntil` on timeout instead of a bare Error, so callers
 * (the `advance` command, the gauntlet) can attach `.diagnostics` to their
 * JSONL/GauntletResult output without re-deriving it themselves (H3). The
 * message still starts with the original `advanceUntil: timed out after Ns`
 * text so any existing message-matching in tests keeps working.
 */
export class AdvanceTimeoutError extends Error {
  diagnostics: AdvanceTimeoutDiagnostics;

  constructor(maxSeconds: number, diagnostics: AdvanceTimeoutDiagnostics) {
    super(`advanceUntil: timed out after ${maxSeconds}s ${JSON.stringify(diagnostics)}`);
    this.name = 'AdvanceTimeoutError';
    this.diagnostics = diagnostics;
  }
}

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
     * ChapterScene's current scene index, active mode id, and beat index (N1;
     * beatIndex added for G6 coverage tracking). Used by the gauntlet's
     * `--shots` to detect scene-index changes and capture a screenshot on each
     * new scene, and by `--coverage` to record which beats/modes were
     * exercised, without hand-rolling a second polling loop (lesson 3: reuse
     * this helper, don't parallel it).
     */
    onTick?: (info: { sceneIndex: number | null; mode: string | null; beatIndex: number | null }) => Promise<void>;
    /**
     * G7: force a specific choice beat to click a specific option index
     * instead of always the first. Only applies when the live beatIndex
     * matches `beatIndex` and that many options are rendered — every other
     * choice beat in the run still auto-picks the first option, matching the
     * spec's "vary the first divergence only" scope for the choice-matrix
     * gauntlet.
     */
    forceChoice?: { beatIndex: number; optionIndex: number };
  } = {},
): Promise<void> {
  const { maxSeconds = 90, skipModes = [], onTick, forceChoice = null } = options;
  const maxTicks = Math.ceil((maxSeconds * 1000) / 150);
  for (let i = 0; i < maxTicks; i++) {
    if (await condition()) return;
    if (onTick) {
      const info = await page.evaluate(() => {
        const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return {
          sceneIndex: typeof scene?.currentSceneIndex === 'number' ? scene.currentSceneIndex : null,
          mode: scene?.activeMode?.id ?? null,
          beatIndex: typeof scene?.beatIndex === 'number' ? scene.beatIndex : null,
        };
      });
      await onTick(info);
    }
    await page.evaluate(({ skip, forceChoice }) => {
      const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');

      // Auto-complete a foreground minigame that is blocking the flow.
      // '*' means "any mode" — for callers (like the agent CLI gauntlet) that
      // can't import the mode registry to enumerate real ids (it pulls in
      // Phaser at module scope, which crashes outside a browser context).
      const mode = scene?.activeMode;
      if (mode && (skip.includes('*') || skip.includes(mode.id)) && typeof mode.onCompleteCallback === 'function') {
        mode.onCompleteCallback({ outcome: 'win' });
        return;
      }

      // Choice beats can't be dismissed with Space — pick an option. Default
      // to the first rendered one; forceChoice overrides the pick only for
      // its designated beatIndex (G7).
      const choices = document.querySelectorAll('[data-testid="dialogue-choice"]');
      if (choices.length) {
        let pick = 0;
        if (forceChoice && scene?.beatIndex === forceChoice.beatIndex && choices.length > forceChoice.optionIndex) {
          pick = forceChoice.optionIndex;
        }
        (choices[pick] as HTMLElement).click();
        return;
      }

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
    }, { skip: skipModes, forceChoice });
    await page.waitForTimeout(150);
  }

  // H3: one extra round-trip to collect stall diagnostics before throwing —
  // kept flat (no nested named helper functions) per the esbuild/tsx `__name`
  // trap noted in GameAgent.ts's getActorBoundingBoxes().
  const diagnostics: AdvanceTimeoutDiagnostics = await page.evaluate(() => {
    const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    const beatIndex = typeof scene?.beatIndex === 'number' ? scene.beatIndex : null;
    const beatType = beatIndex !== null ? (scene?.chapter?.beats?.[beatIndex]?.type ?? null) : null;
    const player = scene?.player ? { x: scene.player.x, y: scene.player.y } : null;
    const walkTarget = scene?.walkTarget
      ? { x: scene.walkTarget.x, y: scene.walkTarget.y, radius: scene.walkTarget.radius }
      : null;
    const distanceToWalkTarget =
      player && walkTarget ? Math.hypot(player.x - walkTarget.x, player.y - walkTarget.y) : null;
    const line = document.querySelector('p.font-pixel') as HTMLElement | null;
    const dialogueVisible = !!(line && line.offsetParent !== null);
    const choiceCount = document.querySelectorAll('[data-testid="dialogue-choice"]').length;
    return {
      beatIndex,
      beatType,
      player,
      walkTarget,
      distanceToWalkTarget,
      movementFrozen: typeof scene?.movementFrozen === 'boolean' ? scene.movementFrozen : null,
      levelStarted: typeof scene?.levelStarted === 'boolean' ? scene.levelStarted : null,
      activeModeId: scene?.activeMode?.id ?? null,
      dialogueVisible,
      choiceCount,
    };
  });
  throw new AdvanceTimeoutError(maxSeconds, diagnostics);
}
