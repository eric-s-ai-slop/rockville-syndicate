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

export type AdvanceUntilResult =
  | { status: 'condition-met' }
  | { status: 'choice-present' }
  | { status: 'walk-target-present' }
  | { status: 'mode-active'; modeId: string | null }
  | { status: 'chapter-ended' };

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
 * From the chapter-select screen, break every chapter-select seal. Classified
 * seals read "CLICK TO CRACK SEAL" then "SHATTER SEAL"; external seals use
 * "TOUCH OUTER SEAL" then "CROSS THE FRAME". Both take two interactions.
 * FREE PLAY must be enabled first so the cards are unlocked.
 */
export async function breakSeal(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const label = page.getByText(/CLICK TO CRACK SEAL|SHATTER SEAL|TOUCH OUTER SEAL|CROSS THE FRAME/).first();
    if (!(await label.isVisible().catch(() => false))) break;
    await label.click();
    await page.waitForTimeout(400);
  }
}

/**
 * Navigate from the landing page all the way to a chapter's game canvas.
 * Picks Eric, enters Free Play, optionally breaks a chapter-select seal, then
 * clicks the chapter card by its displayed title.
 */
export async function navigateToChapter(
  page: Page,
  chapterTitle: string,
  options: { classified?: boolean; sealed?: boolean } = {},
): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Eric/i }).first().click();
  await page.getByRole('button', { name: /Begin the Story/i }).click();
  await expect(page.getByText('LINEAR')).toBeVisible();
  await page.getByText('FREE PLAY').click();
  if (options.classified || options.sealed) {
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
     * Interactive playtesting must inspect and choose branches deliberately.
     * When enabled, stop before the helper's normal auto-choice behavior.
     */
    stopOnChoice?: boolean;
    /**
     * Playtest advancement must leave movement objectives for the agent to
     * complete through real keyboard input rather than teleporting the player.
     */
    stopOnWalkTarget?: boolean;
    /**
     * Stop before a foreground (non-background) minigame or bossFight beat is
     * auto-completed, so the agent can attempt it deliberately. Defaults to
     * false — existing callers (the gauntlet, other specs) that don't pass
     * this must see no behavior change. Background minigames (`background:
     * true`) never trigger this: BeatEngine doesn't hold the flow on them, so
     * `activeMode` being set is not by itself "blocking" — see
     * beatClassification.ts's file header.
     */
    stopOnMode?: boolean;
    /**
     * Stop once the live beat reaches `endChapter`, before any further Space
     * presses / teleports run against it. Defaults to false.
     */
    stopOnChapterEnd?: boolean;
    /**
     * Called once per tick, before the interaction step, with the live
     * ChapterScene's current scene index, active mode id, and beat index (N1;
     * beatIndex added for G6 coverage tracking). Used by the gauntlet's
     * `--shots` to detect scene-index changes and capture a screenshot on each
     * new scene, and by `--coverage` to record which beats/modes were
     * exercised, without hand-rolling a second polling loop (lesson 3: reuse
     * this helper, don't parallel it).
     */
    onTick?: (info: {
      sceneIndex: number | null;
      mode: string | null;
      beatIndex: number | null;
      beatType: string | null;
      background: boolean;
      modeKind: 'foreground' | 'background' | null;
    }) => Promise<void>;
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
): Promise<AdvanceUntilResult> {
  // `walkto` and deterministic frame stepping intentionally leave Phaser
  // asleep. Advance is the interaction boundary where passive story time is
  // allowed to run, so wake the loop before polling camera pans, waits,
  // tweens, or chases.
  await page.evaluate(() => {
    (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.loop?.wake?.();
  });
  const {
    maxSeconds = 90,
    skipModes = [],
    stopOnChoice = false,
    stopOnWalkTarget = false,
    stopOnMode = false,
    stopOnChapterEnd = false,
    onTick,
    forceChoice = null,
  } = options;
  const maxTicks = Math.ceil((maxSeconds * 1000) / 150);
  for (let i = 0; i < maxTicks; i++) {
    if (await condition()) return { status: 'condition-met' };
    if (onTick) {
      const info = await page.evaluate(() => {
        const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        const beatIndex = typeof scene?.beatIndex === 'number' ? scene.beatIndex : null;
        const beat = beatIndex !== null ? scene?.chapter?.beats?.[beatIndex] : undefined;
        const modeOwnsCurrentBeat = scene?.activeModeBeatIndex === beatIndex;
        const modeKind = scene?.activeMode && modeOwnsCurrentBeat
          ? scene.activeModeBackground === true ? 'background' as const : 'foreground' as const
          : null;
        return {
          sceneIndex: typeof scene?.currentSceneIndex === 'number' ? scene.currentSceneIndex : null,
          mode: scene?.activeMode?.id ?? null,
          beatIndex,
          beatType: (beat?.type as string | undefined) ?? null,
          background: beat?.background === true,
          modeKind,
        };
      });
      await onTick(info);
    }
    const stopReason = await page.evaluate(
      ({ skip, forceChoice, stopOnChoice, stopOnWalkTarget, stopOnMode, stopOnChapterEnd }) => {
        const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        const beatType = scene?.chapter?.beats?.[scene.beatIndex ?? -1]?.type ?? null;
        const beatBackground = !!scene?.chapter?.beats?.[scene.beatIndex ?? -1]?.background;

        // Stop as soon as the live beat is the chapter's terminal beat, before
        // any Space-press/teleport below runs against it.
        if (stopOnChapterEnd && beatType === 'endChapter') {
          return { stop: 'chapter-ended' as const };
        }

        // Auto-complete a foreground minigame that is blocking the flow.
        // '*' means "any mode" — for callers (like the agent CLI gauntlet) that
        // can't import the mode registry to enumerate real ids (it pulls in
        // Phaser at module scope, which crashes outside a browser context).
        const mode = scene?.activeMode;
        const modeOwnsCurrentBeat = scene?.activeModeBeatIndex === scene?.beatIndex;
        const foregroundModeActive = modeOwnsCurrentBeat && scene?.activeModeBackground !== true;
        if (
          mode &&
          foregroundModeActive &&
          (skip.includes('*') || skip.includes(mode.id)) &&
          typeof mode.harnessForceComplete === 'function'
        ) {
          mode.harnessForceComplete({ outcome: 'win' });
          return null;
        }

        // A foreground (non-background) minigame or bossFight beat holds the
        // flow until it completes — background minigames do NOT (BeatEngine
        // continues past the launching beat immediately), so only stop here
        // when the CURRENT beat's classification is actually blocking, never
        // from `activeMode` being truthy alone (see beatClassification.ts).
        if (
          stopOnMode &&
          mode &&
          foregroundModeActive &&
          !(skip.includes('*') || skip.includes(mode.id)) &&
          (beatType === 'bossFight' || (beatType === 'minigame' && !beatBackground))
        ) {
          return { stop: 'mode-active' as const, modeId: mode.id ?? null };
        }

        // Choice beats can't be dismissed with Space — pick an option. Default
        // to the first rendered one; forceChoice overrides the pick only for
        // its designated beatIndex (G7).
        const choices = document.querySelectorAll('[data-testid="dialogue-choice"]');
        if (choices.length) {
          if (stopOnChoice) return { stop: 'choice-present' as const };
          let pick = 0;
          if (forceChoice && scene?.beatIndex === forceChoice.beatIndex && choices.length > forceChoice.optionIndex) {
            pick = forceChoice.optionIndex;
          }
          (choices[pick] as HTMLElement).click();
          return null;
        }

        // A normal dialogue line: advance it (skips the typewriter, then proceeds).
        const line = document.querySelector('p.font-pixel') as HTMLElement | null;
        if (line && line.offsetParent !== null) {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
          return null;
        }

        // Nothing to read: walk to the active marker by teleporting onto it.
        if (scene?.walkTarget) {
          if (stopOnWalkTarget) return { stop: 'walk-target-present' as const };
          scene.player.x = scene.walkTarget.x;
          scene.player.y = scene.walkTarget.y;
        }
        return null;
      },
      { skip: skipModes, forceChoice, stopOnChoice, stopOnWalkTarget, stopOnMode, stopOnChapterEnd },
    );
    if (stopReason?.stop === 'choice-present') return { status: 'choice-present' };
    if (stopReason?.stop === 'walk-target-present') return { status: 'walk-target-present' };
    if (stopReason?.stop === 'mode-active') return { status: 'mode-active', modeId: stopReason.modeId };
    if (stopReason?.stop === 'chapter-ended') return { status: 'chapter-ended' };
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
