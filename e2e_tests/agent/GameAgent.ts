import { Page } from '@playwright/test';
import { Jimp, diff, loadFont } from 'jimp';
import { SANS_10_BLACK } from 'jimp/fonts';
import fs from 'node:fs';
import path from 'node:path';
import { CHAPTERS } from '../../src/data/chapters';
import { navigateToChapter } from '../helpers';
import type { DevBridgeWindow } from './DevBridge';

/**
 * GameAgent — stateful browser-automation toolkit for playtesting the Phaser 3
 * game with an AI (or scripted) driver.
 *
 * The stock Playwright/QA helpers in this repo (`advanceUntil`, one-shot
 * `page.evaluate`) only model *discrete* input: a single synthetic Space keydown,
 * a click, a teleport. That is fine for skipping dialogue but cannot express the
 * continuous inputs a real-time canvas game needs — holding W to walk across
 * several frames, click-dragging a slider, charging an attack by holding the
 * mouse. This class fills that gap.
 *
 * It is a thin, honest wrapper over Playwright's *trusted* input primitives
 * (`page.keyboard.down/up`, `page.mouse.down/move/up`). Those dispatch real CDP
 * input events, so Phaser's `Keyboard`/`Pointer` plugins see them exactly like a
 * human's — `key.isDown` stays true between `holdKey`/`releaseKey`, and pointer
 * drags fire the full `pointerdown → pointermove* → pointerup` sequence. We do
 * NOT hand-roll `dispatchEvent(new KeyboardEvent(...))`; synthetic events have
 * `isTrusted === false` and miss the pointer/mouse event pairing.
 *
 * The class tracks what it is currently holding (keys + mouse button) so a test
 * can `dispose()` in teardown and guarantee nothing is left stuck down between
 * cases — a stuck key is a classic source of cross-test flake.
 *
 * Maps 1:1 to the capability spec in `docs/browser_subagent_spec.md`:
 *   §1 Stateful keyboard   → holdKey / releaseKey / pressKey / releaseAllKeys
 *   §2 Stateful mouse      → mouseDown / mouseMove / mouseUp / dragMouse
 *   §3 Engine bridge       → executeJavascript / snapshotGameState
 *   §4 Tick manipulation   → pauseLoop / resumeLoop / stepFrames / isLoopRunning
 */
export type MouseButton = 'left' | 'right';

export interface GameStateSnapshot {
  /** Key of the top-most active Scene, or null if none is running. */
  scene: string | null;
  /** Player body position in world coordinates, or null if not spawned. */
  player: { x: number; y: number } | null;
  /** Player velocity — handy to assert that a `holdKey` actually moved them. */
  velocity: { x: number; y: number } | null;
  /** Current player HP (`ChapterScene.activeHp`), or null if unavailable. */
  hp: number | null;
  /** Id of the foreground minigame mode, or null when walking the map. */
  activeMode: string | null;
  /** Whether the Phaser main loop is currently ticking (see pauseLoop). */
  loopRunning: boolean;
}

const CHAPTER_SCENE_KEY = 'ChapterScene';

export class GameAgent {
  /** Keys currently held down via holdKey, so dispose() can release them. */
  private readonly heldKeys = new Set<string>();
  /** The mouse button currently held via mouseDown, or null. */
  private heldMouseButton: MouseButton | null = null;
  /** Last known pointer position, so mouseUp/dragMouse can default to it. */
  private pointer = { x: 0, y: 0 };
  /** Quick-save state slot. */
  private quickSaveState: any = null;
  /** Intercepted browser console log logs. */
  private readonly consoleLogs: { type: string; text: string }[] = [];
  /** Index into consoleLogs as of the last observeComposite() call (A5 error-count field). */
  private lastObserveLogIndex = 0;
  /** Last composite observation, used by observeDiff() (N4/E5) to emit only changed fields. */
  private lastDiffSnapshot: Awaited<ReturnType<GameAgent['observeComposite']>> | null = null;
  /** Seed passed via --seed or the last reseed() call, recorded into golden .meta.json sidecars (N2). */
  private knownSeed: number | null = null;

  constructor(private readonly page: Page) {
    this.page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        this.consoleLogs.push({ type, text: msg.text() });
      }
    });
    this.page.on('pageerror', err => {
      this.consoleLogs.push({ type: 'error', text: err.message });
    });
    this.page.on('requestfailed', req => {
      this.consoleLogs.push({
        type: 'error',
        text: `requestfailed: ${req.url()} (${req.failure()?.errorText ?? 'unknown'})`,
      });
    });
  }

  // ── lifecycle ────────────────────────────────────────────────────────────

  /**
   * Give the canvas keyboard focus. Phaser attaches its key listeners to the
   * window, but the *page* still needs focus for CDP key events to be delivered
   * (a page that never received a click can drop them). Call once after the
   * game has booted, before the first holdKey.
   */
  async focusCanvas(): Promise<void> {
    const canvas = this.page.locator('canvas').first();
    if ((await canvas.count().catch(() => 0)) === 0) return;
    await canvas.click({ position: { x: 5, y: 5 }, timeout: 1000 }).catch(() => {
      // Some overlays swallow the click; focusing the element is enough.
      return canvas.focus({ timeout: 1000 }).catch(() => {});
    });
  }

  /**
   * Release everything this agent is holding (all keys + the mouse button).
   * Idempotent. Call in `afterEach`/`finally` so a half-finished drag or a held
   * W never leaks into the next test.
   */
  async dispose(): Promise<void> {
    for (const key of [...this.heldKeys]) {
      await this.page.keyboard.up(key).catch(() => {});
    }
    this.heldKeys.clear();
    if (this.heldMouseButton) {
      await this.page.mouse.up({ button: this.heldMouseButton }).catch(() => {});
      this.heldMouseButton = null;
    }

    const errors = this.consoleLogs.filter(e => e.type === 'error').length;
    const warnings = this.consoleLogs.filter(e => e.type === 'warning').length;
    if (errors > 0 || warnings > 0) {
      console.error(`[GameAgent] Session ended with ${errors} console errors and ${warnings} warnings.`);
    }
  }

  // ── §1 Stateful keyboard ─────────────────────────────────────────────────

  /**
   * Fire a `keydown` with no matching `keyup` — the key stays logically pressed
   * (`key.isDown === true` in Phaser) until releaseKey. Holding an already-held
   * key is a no-op rather than emitting a spurious auto-repeat.
   *
   * `key` uses Playwright key names: single chars ('w', 'a'), or named keys
   * ('ArrowUp', 'Space', 'Shift', 'Enter'). Movement keys are case-insensitive
   * to Phaser (KeyCode 87 whether 'w' or 'W'); prefer lowercase to avoid
   * Playwright implicitly holding Shift for an uppercase letter.
   */
  async holdKey(key: string): Promise<void> {
    if (this.heldKeys.has(key)) return;
    this.heldKeys.add(key);
    await this.page.keyboard.down(key);
  }

  /** Fire the `keyup` that ends a holdKey. No-op if the key isn't held. */
  async releaseKey(key: string): Promise<void> {
    if (!this.heldKeys.delete(key)) return;
    await this.page.keyboard.up(key);
  }

  /**
   * Duration-based convenience: hold `key`, wait `durationMs`, then release —
   * i.e. "walk forward for 800ms". With no duration it's a single discrete tap
   * (down+up back to back), matching the old `press_key`.
   */
  async pressKey(key: string, durationMs = 0): Promise<void> {
    if (durationMs <= 0) {
      await this.page.keyboard.press(key);
      return;
    }
    await this.holdKey(key);
    try {
      await this.page.waitForTimeout(durationMs);
    } finally {
      // Always release, even if the wait is interrupted, so we never leak a hold.
      await this.releaseKey(key);
    }
  }

  /** Release every key this agent is holding. */
  async releaseAllKeys(): Promise<void> {
    for (const key of [...this.heldKeys]) {
      await this.releaseKey(key);
    }
  }

  // ── §2 Stateful mouse / pointer ──────────────────────────────────────────

  /**
   * Move to (x, y) in *viewport* CSS pixels and press a button, keeping it held
   * (fires `mousedown` + `pointerdown`). Moving first guarantees the press lands
   * where the caller expects — Playwright's mouse is stateful and `down()` uses
   * the current position. Use with mouseMove/mouseUp for drags or charge-holds.
   */
  async mouseDown(x: number, y: number, button: MouseButton = 'left'): Promise<void> {
    this.pointer = { x, y };
    await this.page.mouse.move(x, y);
    await this.page.mouse.down({ button });
    this.heldMouseButton = button;
  }

  /**
   * Move the pointer to (x, y) (fires `mousemove` + `pointermove`). If a button
   * is currently held this is a drag step; otherwise it's a plain hover/move.
   */
  async mouseMove(x: number, y: number): Promise<void> {
    this.pointer = { x, y };
    await this.page.mouse.move(x, y);
  }

  /**
   * Release the held button (fires `mouseup` + `pointerup`). x/y are optional —
   * when omitted the pointer stays where it is, when given it moves there first
   * (so a fling can end at a different spot than the last move).
   */
  async mouseUp(x?: number, y?: number, button: MouseButton = 'left'): Promise<void> {
    if (x !== undefined && y !== undefined) {
      this.pointer = { x, y };
      await this.page.mouse.move(x, y);
    }
    await this.page.mouse.up({ button });
    if (this.heldMouseButton === button) this.heldMouseButton = null;
  }

  /**
   * Smoothly click-drag from (startX,startY) to (endX,endY) over `durationMs`,
   * holding the left button the whole way. Interpolates in discrete steps
   * (~one per 16ms frame, min 1) so Phaser sees a continuous stream of
   * `pointermove`s rather than a teleport — the difference between a slider that
   * tracks the drag and one that ignores it. Always releases, even on error.
   */
  async dragMouse(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs = 400,
    steps = Math.max(1, Math.round(durationMs / 16)),
  ): Promise<void> {
    await this.mouseDown(startX, startY, 'left');
    try {
      const stepDelay = durationMs / steps;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        await this.mouseMove(startX + (endX - startX) * t, startY + (endY - startY) * t);
        if (stepDelay > 0) await this.page.waitForTimeout(stepDelay);
      }
    } finally {
      await this.mouseUp(endX, endY, 'left');
    }
  }

  // ── §3 Game-engine bridge ────────────────────────────────────────────────

  /**
   * Evaluate arbitrary JS in the page and return the (JSON-serialisable) result.
   * Accepts a source string (per the spec's `execute_javascript(code)`) or a
   * function for type-safe callers. The string form is wrapped in a `return`ing
   * arrow so `executeJavascript('window.__OMEGA_GAME__.scene.keys')` just works;
   * pass a full function body if you need statements.
   */
  async executeJavascript<T = unknown>(code: string | (() => T)): Promise<T> {
    if (typeof code === 'function') {
      return this.page.evaluate(code);
    }
    // Wrap the caller-supplied source in a returning arrow so bare expressions
    // ('window.__OMEGA_GAME__.scene.keys') work; pass a function for statements.
    return this.page.evaluate((src) => new Function(`return (${src});`)(), code) as Promise<T>;
  }

  /**
   * One round-trip snapshot of the fields tests care about, read straight off
   * the live scene instead of computer vision. Every field is best-effort and
   * degrades to null so this never throws mid-playthrough (e.g. between scenes,
   * before the player spawns). This is the §3 payoff: assert on exact state,
   * not pixels.
   */
  async snapshotGameState(): Promise<GameStateSnapshot> {
    return this.page.evaluate((sceneKey) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      const empty = {
        scene: null,
        player: null,
        velocity: null,
        hp: null,
        activeMode: null,
        loopRunning: false,
      };
      if (!game) return empty;

      const active = game.scene.getScenes(true);
      const top = active[active.length - 1];
      const chapter = game.scene.getScene(sceneKey);
      const player = chapter?.player;
      const body = player?.body;

      return {
        // Scene key lives on Systems settings — the canonical, always-present
        // location (a raw Scene instance's `.scene` is the ScenePlugin).
        scene: top?.sys?.settings?.key ?? null,
        player: player ? { x: player.x, y: player.y } : null,
        velocity: body ? { x: body.velocity.x, y: body.velocity.y } : null,
        hp: typeof chapter?.activeHp === 'number' ? chapter.activeHp : null,
        activeMode: chapter?.activeMode?.id ?? null,
        loopRunning: !!game.loop?.running,
      };
    }, CHAPTER_SCENE_KEY);
  }

  // ── §4 Tick / time manipulation ──────────────────────────────────────────

  /**
   * Stop the Phaser main loop (`game.loop.sleep()`), freezing physics and
   * animation. Nothing advances until resumeLoop or stepFrames — so the agent
   * can screenshot, think for however many seconds it needs, then act, with zero
   * simulation drift in between.
   */
  async pauseLoop(): Promise<void> {
    await this.page.evaluate(() => {
      (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.loop?.sleep();
    });
  }

  /** Resume real-time ticking after pauseLoop (`game.loop.wake()`). */
  async resumeLoop(): Promise<void> {
    await this.page.evaluate(() => {
      (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.loop?.wake();
    });
  }

  /** True while the RAF loop is ticking; false after pauseLoop. */
  async isLoopRunning(): Promise<boolean> {
    return this.page.evaluate(
      () => !!(window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.loop?.running,
    );
  }

  /**
   * Deterministically advance the game by exactly `frames` fixed-timestep steps
   * while the loop is paused, then leave it paused. Each step drives
   * `game.step(time, delta)` with a synthetic clock at `1000/fps` ms, so a run
   * of N steps is reproducible regardless of the agent's real-world thinking
   * latency — the core §4 requirement. Returns the number of frames stepped.
   *
   * Auto-sleeps the loop first if it was running, so callers can just
   * `stepFrames(10)` without a separate pauseLoop.
   */
  async stepFrames(frames: number, fps = 60): Promise<number> {
    if (frames <= 0) return 0;
    return this.page.evaluate(
      ({ frames, delta }) => {
        const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
        if (!game || typeof game.step !== 'function') {
          throw new Error('stepFrames: __OMEGA_GAME__ not available (dev build only).');
        }
        // Freeze the RAF loop so our manual steps are the only ones advancing time.
        if (game.loop?.running) game.loop.sleep();
        let time = typeof game.loop?.time === 'number' ? game.loop.time : performance.now();
        for (let i = 0; i < frames; i++) {
          time += delta;
          game.step(time, delta);
        }
        return frames;
      },
      { frames, delta: 1000 / fps },
    );
  }

  /**
   * Capture a screenshot from a settled, deterministic frame (N2) — record the
   * loop's current running state, pause it, step 5 frames so any in-flight
   * tween/particle settles, capture, then restore (resume only if it was
   * running before). Any screenshot meant for comparison (goldens, gauntlet
   * `--shots`, visual checkpoints) must go through this, not a raw
   * `page.screenshot()` — unstabilized captures land mid-animation and flap
   * between runs, eroding trust in the whole mechanism (C5's known gap).
   * Plain `screenshot` stays unstabilized on purpose: it documents "what does
   * the live game look like right now", not "does this match a baseline".
   */
  async stabilizedScreenshot(filePath: string): Promise<void> {
    const wasRunning = await this.isLoopRunning();
    await this.stepFrames(5);
    await this.page.screenshot({ path: filePath });
    if (wasRunning) await this.resumeLoop();
  }

  // ── C1 Physics Debug ─────────────────────────────────────────────────────

  /** Toggle Phaser's Arcade physics debug rendering on or off. */
  async setPhysicsDebug(enabled: boolean): Promise<void> {
    await this.page.evaluate((en) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) return;
      const scenes = game.scene.getScenes(true);
      for (const scene of scenes) {
        if (!scene.physics?.world) continue;
        if (en) {
          if (!scene.physics.world.debugGraphic) {
            scene.physics.world.createDebugGraphic();
          }
          scene.physics.world.drawDebug = true;
          scene.physics.world.debugGraphic.visible = true;
          scene.physics.world.debugGraphic.setDepth(99999);
          scene.physics.world.defaults.showBody = true;
          scene.physics.world.defaults.showStaticBody = true;
        } else {
          scene.physics.world.drawDebug = false;
          if (scene.physics.world.debugGraphic) {
            scene.physics.world.debugGraphic.visible = false;
            scene.physics.world.debugGraphic.clear();
          }
          scene.physics.world.defaults.showBody = false;
          scene.physics.world.defaults.showStaticBody = false;
        }
      }
    }, enabled);
  }

  /** Convert world coordinates (x, y) with scrollFactor to viewport CSS pixels relative to the page. */
  async worldToViewport(worldX: number, worldY: number, scrollFactor = 1): Promise<{ x: number; y: number }> {
    return this.page.evaluate(({ worldX, worldY, scrollFactor }) => {
      const game = (window as unknown as DevBridgeWindow).__OMEGA_GAME__;
      if (!game) return { x: 0, y: 0 };
      const chapter = game.scene.getScene('ChapterScene');
      if (!chapter?.cameras) return { x: 0, y: 0 };
      const cam = chapter.cameras.main;
      
      const cx = cam.width / 2;
      const cy = cam.height / 2;
      
      let screenX = worldX;
      let screenY = worldY;
      
      if (scrollFactor !== 0) {
        screenX = cx + (worldX - cam.scrollX - cx) * cam.zoom;
        screenY = cy + (worldY - cam.scrollY - cy) * cam.zoom;
      } else {
        screenX = cx + (worldX - cx) * cam.zoom;
        screenY = cy + (worldY - cy) * cam.zoom;
      }

      const canvas = game.canvas;
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + screenX,
        y: rect.top + screenY
      };
    }, { worldX, worldY, scrollFactor });
  }

  /** Extract all visible canvas text and active DOM dialogue/choices. */
  async extractVisibleText(): Promise<{
    canvas: { text: string; x: number; y: number; type: string }[];
    dom: {
      speaker: string | null;
      dialogue: string | null;
      choices: string[];
      qte: string | null;
    };
  }> {
    return this.page.evaluate(() => {
      const canvasText: { text: string; x: number; y: number; type: string }[] = [];
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (game) {
        const scenes = game.scene.getScenes(true);
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const queue = [...scene.children.list];
          let head = 0;
          while (head < queue.length) {
            const child = queue[head++];
            if (!child.visible || child.alpha <= 0) continue;
            if (child.type === 'Text' || child.type === 'BitmapText') {
              canvasText.push({
                text: child.text || child._text || '',
                x: child.x,
                y: child.y,
                type: child.type
              });
            } else if (child.list && Array.isArray(child.list)) {
              for (let j = 0; j < child.list.length; j++) {
                queue.push(child.list[j]);
              }
            }
          }
        }
      }

      // DOM extraction
      const speakerPop = document.querySelector('.portrait-pop');
      let speaker: string | null = null;
      if (speakerPop && speakerPop.parentElement) {
        const nameEl = speakerPop.parentElement.querySelector('span.font-pixel');
        if (nameEl) speaker = (nameEl as HTMLElement).innerText;
      }

      const dialogueEl = document.querySelector('p.font-pixel');
      const choiceEls = document.querySelectorAll('[data-testid="dialogue-choice"]');
      const qteEl = document.querySelector('span.font-pixel');

      const choices: string[] = [];
      const choiceArray = Array.from(choiceEls);
      for (let i = 0; i < choiceArray.length; i++) {
        const el = choiceArray[i];
        const textSpan = el.querySelector('span:nth-child(2)');
        choices.push(textSpan ? (textSpan as HTMLElement).innerText : (el as HTMLElement).innerText);
      }

      return {
        canvas: canvasText,
        dom: {
          speaker,
          dialogue: dialogueEl ? (dialogueEl as HTMLElement).innerText : null,
          choices,
          qte: qteEl ? (qteEl as HTMLElement).innerText : null
        }
      };
    });
  }

  /** Dump active walk markers and active NPCs with world + screen viewport coordinates. */
  async dumpWalkAndNpcTargets(): Promise<{
    walkTarget: { x: number; y: number; radius: number; markerLabel: string; viewport: { x: number; y: number } } | null;
    npcs: { id: string; name: string; x: number; y: number; viewport: { x: number; y: number } }[];
  }> {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      const empty = { walkTarget: null, npcs: [] };
      if (!game) return empty;

      const scene = game.scene.getScene('ChapterScene');
      if (!scene) return empty;

      const cam = scene.cameras.main;
      const cx = cam.width / 2;
      const cy = cam.height / 2;
      const rect = game.canvas.getBoundingClientRect();

      // 1. Walk target
      let walkTarget = null;
      if (scene.walkTarget) {
        const screenX = cx + (scene.walkTarget.x - cam.scrollX - cx) * cam.zoom;
        const screenY = cy + (scene.walkTarget.y - cam.scrollY - cy) * cam.zoom;
        walkTarget = {
          x: scene.walkTarget.x,
          y: scene.walkTarget.y,
          radius: scene.walkTarget.radius,
          markerLabel: scene.walkTarget.markerLabel || '',
          viewport: {
            x: rect.left + screenX,
            y: rect.top + screenY
          }
        };
      }

      // 2. NPCs
      const npcs: any[] = [];
      if (scene.actorSprites) {
        const ids = Object.keys(scene.actorSprites);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const entry = scene.actorSprites[id];
          const sprite = entry?.[0];
          if (sprite && sprite.visible) {
            const screenX = cx + (sprite.x - cam.scrollX - cx) * cam.zoom;
            const screenY = cy + (sprite.y - cam.scrollY - cy) * cam.zoom;
            npcs.push({
              id,
              name: entry[1]?.text || id,
              x: sprite.x,
              y: sprite.y,
              viewport: {
                x: rect.left + screenX,
                y: rect.top + screenY
              }
            });
          }
        }
      }

      return { walkTarget, npcs };
    });
  }

  /** Force transition the Phaser Scene to a specific scene index, jumping the BeatEngine. */
  async warpScene(sceneIndex: number): Promise<void> {
    await this.page.evaluate((targetIndex) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');

      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');
      // create() hasn't finished (e.g. called before the first 'advance') — the
      // physics groups teardownMap() relies on (this.walls, etc.) don't exist yet.
      // Fail with a clear message instead of letting a raw TypeError bubble up.
      if (!scene.levelStarted || !scene.walls) {
        throw new Error('Scene not ready — run "advance" (or wait for boot) before "goto"');
      }

      const sceneCount = scene.chapter.scenes ? scene.chapter.scenes.length : 1;
      if (targetIndex < 0 || targetIndex >= sceneCount) {
        throw new Error(`Invalid scene index ${targetIndex}. Range is 0 to ${sceneCount - 1}`);
      }

      // Clean up active minigame if any
      if (scene.activeMode) {
        try { scene.activeMode.teardown(); } catch {}
        scene.activeMode = null;
      }

      // Clear dialogue UI
      if (typeof scene.clearStoryDialogue === 'function') {
        scene.clearStoryDialogue();
      }
      scene.beatEngine.clearWalkTarget();

      // Stop any in-flight crossfade/tween before warping — warpToScene() is about to
      // fire its own crossfadeToMusic() for the target scene, and repeated warps in
      // quick succession (goto/goto/goto) otherwise leave stale delayedCall/tween
      // callbacks racing against a destroyed stageMusic (see docs/toolkit_complaints.md C4).
      try { scene.audioController?.stopAllAudio(0); } catch {}

      // Find the first beat of target scene
      let beatIdx = 0;
      if (targetIndex > 0) {
        for (let i = 0; i < scene.chapter.beats.length; i++) {
          const b = scene.chapter.beats[i];
          if (b.type === 'changeScene' && b.sceneIndex === targetIndex) {
            beatIdx = i;
            break;
          }
        }
      }

      // Warp scene
      scene.warpToScene(targetIndex);

      // Start beat
      scene.beatEngine.startBeat(beatIdx);
    }, sceneIndex);
  }

  /** Quick-save the current state in-memory. */
  async saveQuickState(): Promise<void> {
    this.quickSaveState = await this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      return {
        sceneIndex: scene.currentSceneIndex,
        beatIndex: scene.beatIndex,
        beatActive: scene.beatActive,
        playerX: scene.player ? scene.player.x : 0,
        playerY: scene.player ? scene.player.y : 0,
        hp: scene.activeHp,
        ledgerTotal: scene.ledgerTotal
      };
    });
  }

  /** Quick-load the saved state. */
  async loadQuickState(): Promise<void> {
    if (!this.quickSaveState) {
      throw new Error('No quick-save state exists. Run "savestate" first.');
    }

    await this.page.evaluate((saved) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      // Clean up active modes and overlays
      if (scene.activeMode) {
        try { scene.activeMode.teardown(); } catch {}
        scene.activeMode = null;
      }
      if (typeof scene.clearStoryDialogue === 'function') {
        scene.clearStoryDialogue();
      }
      scene.beatEngine.clearWalkTarget();

      // Warp to correct scene index
      scene.warpToScene(saved.sceneIndex);

      // Set player position and restore physics
      if (scene.player) {
        scene.player.setPosition(saved.playerX, saved.playerY);
        if (scene.player.body) {
          scene.player.body.setVelocity(0, 0);
        }
      }

      // Restore HP & Ledger
      scene.activeHp = saved.hp;
      scene.onHpChange(saved.hp);

      scene.ledgerTotal = saved.ledgerTotal;
      scene.onLedgerChange(saved.ledgerTotal, 'Restore Quick Save');

      // Restore Beat index
      scene.beatIndex = saved.beatIndex;
      scene.beatActive = saved.beatActive;

      // Start beat
      scene.beatEngine.startBeat(saved.beatIndex);
    }, this.quickSaveState);
  }

  getConsoleLogs(): { type: string; text: string }[] {
    return [...this.consoleLogs];
  }

  clearConsoleLogs(): void {
    this.consoleLogs.length = 0;
  }

  /**
   * Force-advance the BeatEngine by `n` beats — diagnostic escape hatch for a
   * beat whose completion condition can never fire (an unreachable walk target,
   * a mode that never calls onComplete). Explicitly clears the React dialogue
   * overlay and any freeze/walk-target state before each jump so the displayed
   * UI doesn't go stale relative to the engine's beat index.
   *
   * Unlike a polling loop that calls this every tick (that reintroduces the
   * exact StrictMode-style desync this avoids — see CLAUDE.md), this is meant
   * as a single, operator-chosen jump when normal dismissal is impossible.
   */
  async skipBeat(n = 1): Promise<{ from: number; to: number }> {
    return this.page.evaluate((count) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      const from = scene.beatIndex;
      for (let i = 0; i < count; i++) {
        if (typeof scene.clearStoryDialogue === 'function') scene.clearStoryDialogue();
        scene.beatEngine.unfreeze();
        scene.movementFrozen = false;
        scene.beatEngine.clearWalkTarget();
        scene.beatEngine.startBeat(scene.beatIndex + 1);
      }
      return { from, to: scene.beatIndex };
    }, n);
  }

  /** Inspect current speaker, dialogue index, active status, and upcoming beats. */
  async inspectBeats(): Promise<{
    currentBeatIndex: number;
    totalBeats: number;
    beatActive: boolean;
    currentBeat: any;
    upcomingBeats: any[];
  }> {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      const beats = scene.chapter.beats || [];
      const currentIdx = scene.beatIndex;
      const upcoming: any[] = [];
      const endLimit = Math.min(currentIdx + 6, beats.length);
      for (let i = currentIdx + 1; i < endLimit; i++) {
        upcoming.push(beats[i]);
      }

      return {
        currentBeatIndex: currentIdx,
        totalBeats: beats.length,
        beatActive: scene.beatActive,
        currentBeat: beats[currentIdx] || null,
        upcomingBeats: upcoming
      };
    });
  }

  /** Scrape player state, text, and target/NPC coords in a single evaluate to minimize Playwright IPC overhead. */
  async observeComposite(): Promise<{
    state: GameStateSnapshot | null;
    canvas: { text: string; x: number; y: number; type: string }[];
    dom: {
      speaker: string | null;
      dialogue: string | null;
      choices: string[];
      qte: string | null;
    };
    walkTarget: { x: number; y: number; radius: number; markerLabel: string; viewport: { x: number; y: number } } | null;
    npcs: { id: string; name: string; x: number; y: number; viewport: { x: number; y: number } }[];
    /** Console errors/warnings (incl. failed asset requests) captured since the previous observe(). */
    errorsSinceLastObserve: number;
    warningsSinceLastObserve: number;
  }> {
    const newLogs = this.consoleLogs.slice(this.lastObserveLogIndex);
    this.lastObserveLogIndex = this.consoleLogs.length;
    const errorsSinceLastObserve = newLogs.filter(l => l.type === 'error').length;
    const warningsSinceLastObserve = newLogs.filter(l => l.type === 'warning').length;

    const result = await this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) {
        return {
          state: null,
          canvas: [],
          dom: { speaker: null, dialogue: null, choices: [], qte: null },
          walkTarget: null,
          npcs: []
        };
      }

      const scene = game.scene.getScene('ChapterScene');
      
      // 1. GameStateSnapshot
      let state = null;
      if (scene) {
        state = {
          scene: 'ChapterScene',
          player: scene.player ? { x: scene.player.x, y: scene.player.y } : null,
          velocity: (scene.player && scene.player.body) ? { x: scene.player.body.velocity.x, y: scene.player.body.velocity.y } : null,
          hp: typeof scene.activeHp === 'number' ? scene.activeHp : null,
          activeMode: scene.activeMode ? scene.activeMode.id : null,
          loopRunning: game.loop.running
        };
      } else {
        const activeScenes = game.scene.getScenes(true);
        state = {
          scene: activeScenes.length > 0 ? activeScenes[0].sys.settings.key : null,
          player: null,
          velocity: null,
          hp: null,
          activeMode: null,
          loopRunning: game.loop.running
        };
      }

      // 2. Canvas Text & DOM Text
      const canvasText: { text: string; x: number; y: number; type: string }[] = [];
      const scenes = game.scene.getScenes(true);
      for (let i = 0; i < scenes.length; i++) {
        const sc = scenes[i];
        const queue = [...sc.children.list];
        let head = 0;
        while (head < queue.length) {
          const child = queue[head++];
          if (!child.visible || child.alpha <= 0) continue;
          if (child.type === 'Text' || child.type === 'BitmapText') {
            canvasText.push({
              text: child.text || child._text || '',
              x: child.x,
              y: child.y,
              type: child.type
            });
          } else if (child.list && Array.isArray(child.list)) {
            for (let j = 0; j < child.list.length; j++) {
              queue.push(child.list[j]);
            }
          }
        }
      }

      const speakerPop = document.querySelector('.portrait-pop');
      let speaker: string | null = null;
      if (speakerPop && speakerPop.parentElement) {
        const nameEl = speakerPop.parentElement.querySelector('span.font-pixel');
        if (nameEl) speaker = (nameEl as HTMLElement).innerText;
      }

      const dialogueEl = document.querySelector('p.font-pixel');
      const choiceEls = document.querySelectorAll('[data-testid="dialogue-choice"]');
      const qteEl = document.querySelector('span.font-pixel');

      const choices: string[] = [];
      const choiceArray = Array.from(choiceEls);
      for (let i = 0; i < choiceArray.length; i++) {
        const el = choiceArray[i];
        const textSpan = el.querySelector('span:nth-child(2)');
        choices.push(textSpan ? (textSpan as HTMLElement).innerText : (el as HTMLElement).innerText);
      }

      const dom = {
        speaker,
        dialogue: dialogueEl ? (dialogueEl as HTMLElement).innerText : null,
        choices,
        qte: qteEl ? (qteEl as HTMLElement).innerText : null
      };

      // 3. Targets and NPCs
      let walkTarget = null;
      const npcs: any[] = [];

      if (scene) {
        const cam = scene.cameras.main;
        const cx = cam.width / 2;
        const cy = cam.height / 2;
        const rect = game.canvas.getBoundingClientRect();

        if (scene.walkTarget) {
          const screenX = cx + (scene.walkTarget.x - cam.scrollX - cx) * cam.zoom;
          const screenY = cy + (scene.walkTarget.y - cam.scrollY - cy) * cam.zoom;
          walkTarget = {
            x: scene.walkTarget.x,
            y: scene.walkTarget.y,
            radius: scene.walkTarget.radius,
            markerLabel: scene.walkTarget.markerLabel || '',
            viewport: {
              x: rect.left + screenX,
              y: rect.top + screenY
            }
          };
        }

        if (scene.actorSprites) {
          const ids = Object.keys(scene.actorSprites);
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const entry = scene.actorSprites[id];
            const sprite = entry?.[0];
            if (sprite && sprite.visible) {
              const screenX = cx + (sprite.x - cam.scrollX - cx) * cam.zoom;
              const screenY = cy + (sprite.y - cam.scrollY - cy) * cam.zoom;
              npcs.push({
                id,
                name: entry[1]?.text || id,
                x: sprite.x,
                y: sprite.y,
                viewport: {
                  x: rect.left + screenX,
                  y: rect.top + screenY
                }
              });
            }
          }
        }
      }

      return {
        state,
        canvas: canvasText,
        dom,
        walkTarget,
        npcs
      };
    });

    return { ...result, errorsSinceLastObserve, warningsSinceLastObserve };
  }

  /** Get details of all currently playing audio sounds. */
  async inspectAudio(): Promise<{
    playing: { key: string; volume: number; paused: boolean; progress: number }[];
    masterVolume: number;
  }> {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');

      const activeSounds: any[] = [];
      const soundList = game.sound.sounds;
      for (let i = 0; i < soundList.length; i++) {
        const snd = soundList[i];
        if (snd.isPlaying) {
          let progress = 0;
          if (typeof snd.progress === 'number') {
            progress = snd.progress;
          } else if (snd.duration && snd.seek) {
            progress = snd.seek / snd.duration;
          }
          activeSounds.push({
            key: snd.key,
            volume: snd.volume,
            paused: snd.isPaused,
            progress
          });
        }
      }

      return {
        playing: activeSounds,
        masterVolume: game.sound.volume
      };
    });
  }

  /** Inspect current main camera parameters. */
  async inspectCamera(): Promise<{
    zoom: number;
    scrollX: number;
    scrollY: number;
    width: number;
    height: number;
  }> {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      const cam = scene.cameras.main;
      return {
        zoom: cam.zoom,
        scrollX: cam.scrollX,
        scrollY: cam.scrollY,
        width: cam.width,
        height: cam.height
      };
    });
  }

  /** Set camera zoom factor. */
  async setCameraZoom(zoom: number): Promise<void> {
    await this.page.evaluate((z) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      scene.cameras.main.setZoom(z);
    }, zoom);
  }

  /** Center main camera on world coordinates. */
  async setCameraCenter(x: number, y: number): Promise<void> {
    await this.page.evaluate((coords) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      scene.cameras.main.centerOn(coords.cx, coords.cy);
    }, { cx: x, cy: y });
  }

  /** Set Phaser clock, tweens, and Arcade Physics timeScale. */
  async setTimeScale(multiplier: number): Promise<void> {
    await this.page.evaluate((scale) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      scene.time.timeScale = scale;
      scene.tweens.timeScale = scale;
      if (scene.physics && scene.physics.world) {
        scene.physics.world.timeScale = scale;
      }
    }, multiplier);
  }

  /** Launch a specific minigame mode directly. */
  async launchMinigame(modeId: string, config: any = {}): Promise<void> {
    await this.page.evaluate(({ mId, cfg }) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      (scene as any).launchMode(mId, cfg);
    }, { mId: modeId, cfg: config });
  }

  /** Reset/reseed the PRNG on the page mid-session. */
  async reseed(seed: number): Promise<void> {
    this.knownSeed = seed;
    await this.page.evaluate((seedVal) => {
      let val = seedVal;
      Math.random = () => {
        let t = val += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }, seed);
  }

  /**
   * Record the seed the page was booted with (via --seed's addInitScript, which
   * runs before GameAgent exists) so golden .meta.json sidecars can report it.
   * Purely bookkeeping — does not touch the page.
   */
  setSeed(seed: number): void {
    this.knownSeed = seed;
  }

  /** Collect performance metrics and memory usage. */
  async inspectPerf(): Promise<{
    fps: number;
    textures: number;
    sounds: number;
    children: number;
    tweens: number;
    heapSize: number;
  }> {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');

      const heapSize = (window.performance as any)?.memory?.usedJSHeapSize || 0;
      const sounds = game.sound.sounds.length;
      const textures = Object.keys(game.textures.list).length;

      let children = 0;
      let tweens = 0;
      if (scene) {
        children = scene.children.list.length;
        tweens = scene.tweens.getTweens().length;
      }

      return {
        fps: Math.round(game.loop.actualFps),
        textures,
        sounds,
        children,
        tweens,
        heapSize
      };
    });
  }

  /**
   * Capture current frame (stabilized — N2) and save as the golden screenshot,
   * plus a `<name>.meta.json` sidecar recording `{width, height, seed}` so a
   * later `checkGolden` can refuse to diff against a mismatched viewport
   * instead of producing a garbage diff.
   */
  async saveGolden(chapterName: string, name: string): Promise<string> {
    const cleanChapter = chapterName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = path.resolve('e2e_tests/agent/goldens', cleanChapter);
    fs.mkdirSync(folder, { recursive: true });
    const file = path.resolve(folder, `${name}.png`);
    await this.stabilizedScreenshot(file);

    const viewport = this.page.viewportSize() ?? { width: 0, height: 0 };
    const meta = { width: viewport.width, height: viewport.height, seed: this.knownSeed };
    fs.writeFileSync(path.resolve(folder, `${name}.meta.json`), JSON.stringify(meta, null, 2));

    return file;
  }

  /**
   * Capture current frame (stabilized — N2), compare it against the golden
   * screenshot, and output pixel diff. Throws (surfacing as `ok:false` at the
   * CLI layer) instead of diffing when the current viewport doesn't match the
   * baseline's recorded size — a size mismatch always produces a meaningless
   * diff percentage.
   */
  async checkGolden(chapterName: string, name: string, threshold = 0.01): Promise<{
    diffPct: number;
    pass: boolean;
    diffPath: string | null;
  }> {
    const cleanChapter = chapterName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const goldenFile = path.resolve('e2e_tests/agent/goldens', cleanChapter, `${name}.png`);
    if (!fs.existsSync(goldenFile)) {
      throw new Error(`Golden screenshot does not exist: ${goldenFile}`);
    }

    const metaFile = path.resolve('e2e_tests/agent/goldens', cleanChapter, `${name}.meta.json`);
    if (fs.existsSync(metaFile)) {
      const baseMeta = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as { width: number; height: number };
      const viewport = this.page.viewportSize() ?? { width: 0, height: 0 };
      if (baseMeta.width !== viewport.width || baseMeta.height !== viewport.height) {
        throw new Error(
          `viewport mismatch: baseline ${baseMeta.width}x${baseMeta.height}, current ${viewport.width}x${viewport.height}`,
        );
      }
    }

    const tempDir = path.resolve('agent-artifacts/diffs');
    fs.mkdirSync(tempDir, { recursive: true });
    const currentFile = path.resolve(tempDir, `current-${name}.png`);
    const diffFile = path.resolve(tempDir, `diff-${name}.png`);

    // Take current screenshot (stabilized so animated scenes don't flap — N2)
    await this.stabilizedScreenshot(currentFile);

    // Diff images using Jimp
    const img1 = await Jimp.read(goldenFile);
    const img2 = await Jimp.read(currentFile);

    const diffResult = diff(img1, img2);
    if (diffResult.percent > 0) {
      await diffResult.image.write(diffFile);
    }

    const pass = diffResult.percent < threshold;
    return {
      diffPct: diffResult.percent,
      pass,
      diffPath: diffResult.percent > 0 ? diffFile : null
    };
  }

  // ── N4 (E5/E6): cheaper driving loop — diff + watch ─────────────────────

  /**
   * Composite observation that emits only what changed since the previous
   * `observeDiff()` call (E5) — unchanged fields are omitted entirely. The
   * first call in a session has no baseline, so it returns the full
   * observation with `full:true`. Diffing happens here in Node, not inside
   * the page, per the spec's implementation note.
   */
  async observeDiff(): Promise<Record<string, unknown>> {
    const current = await this.observeComposite();
    const prev = this.lastDiffSnapshot;
    this.lastDiffSnapshot = current;

    if (!prev) {
      return { ...current, full: true };
    }

    const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
    const out: Record<string, unknown> = {
      errorsSinceLastObserve: current.errorsSinceLastObserve,
      warningsSinceLastObserve: current.warningsSinceLastObserve,
    };

    const stateDiff: Record<string, unknown> = {};
    const stateKeys: (keyof GameStateSnapshot)[] = ['scene', 'player', 'velocity', 'hp', 'activeMode', 'loopRunning'];
    for (const key of stateKeys) {
      const a = prev.state ? prev.state[key] : null;
      const b = current.state ? current.state[key] : null;
      if (changed(a, b)) stateDiff[key] = b;
    }
    if (Object.keys(stateDiff).length) out.state = stateDiff;

    const domDiff: Record<string, unknown> = {};
    for (const key of ['speaker', 'dialogue', 'choices', 'qte'] as const) {
      if (changed(prev.dom[key], current.dom[key])) domDiff[key] = current.dom[key];
    }
    if (Object.keys(domDiff).length) out.dom = domDiff;

    if (changed(prev.canvas, current.canvas)) out.canvas = current.canvas;
    if (changed(prev.walkTarget, current.walkTarget)) out.walkTarget = current.walkTarget;
    if (changed(prev.npcs, current.npcs)) out.npcs = current.npcs;

    return out;
  }

  /**
   * Block until a predicate on the live ChapterScene is true, or `timeoutMs`
   * elapses (E6). `jsExpr` is evaluated with `scene` (the live ChapterScene,
   * may be null/undefined) and `game` (the live Phaser.Game, may be null) in
   * scope — e.g. `watch("scene.activeHp < 50")`. Polls at ~100ms *inside this
   * one call* so the driving agent spends one round-trip instead of a manual
   * `wait 100; state` loop. On timeout, attaches a final `observation` so the
   * stuck state is visible without a follow-up call.
   */
  async watch(jsExpr: string, timeoutMs = 5000): Promise<{ ok: boolean; waitedMs: number; observation?: unknown }> {
    const start = Date.now();
    const evaluateOnce = () =>
      this.page.evaluate((expr) => {
        const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__ ?? null;
        const scene = game?.scene.getScene('ChapterScene') ?? null;
        try {
          return !!new Function('scene', 'game', `return (${expr});`)(scene, game);
        } catch {
          return false;
        }
      }, jsExpr);

    while (Date.now() - start < timeoutMs) {
      if (await evaluateOnce()) {
        return { ok: true, waitedMs: Date.now() - start };
      }
      await this.page.waitForTimeout(100);
    }
    const observation = await this.observeComposite();
    return { ok: false, waitedMs: Date.now() - start, observation };
  }

  // ── N3: visual checkpoints — annotated screenshots ──────────────────────

  /**
   * World-space bounding boxes (converted to viewport pixels via the same
   * camera math as A2/A3) for every visible actor sprite plus the player, for
   * `screenshot --annotate` to draw over the raw capture.
   */
  async getActorBoundingBoxes(): Promise<
    { id: string; name: string; depth: number; x: number; y: number; width: number; height: number }[]
  > {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) return [];
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) return [];

      const cam = scene.cameras.main;
      const cx = cam.width / 2;
      const cy = cam.height / 2;
      const rect = game.canvas.getBoundingClientRect();

      // Gather (id, name, sprite) tuples first, then convert to screen-space
      // boxes in a flat loop below — no nested named helper functions, which
      // trip an esbuild/tsx `__name` helper reference that only exists in the
      // outer bundle, not in the string Playwright re-evaluates in the page.
      const candidates: { id: string; name: string; sprite: any }[] = [];
      if (scene.actorSprites) {
        for (const id of Object.keys(scene.actorSprites)) {
          const entry = scene.actorSprites[id];
          candidates.push({ id, name: entry?.[1]?.text || id, sprite: entry?.[0] });
        }
      }
      if (scene.player) candidates.push({ id: 'player', name: 'player', sprite: scene.player });

      const boxes: { id: string; name: string; depth: number; x: number; y: number; width: number; height: number }[] = [];
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (!c.sprite || !c.sprite.visible || typeof c.sprite.getBounds !== 'function') continue;
        const b = c.sprite.getBounds();
        boxes.push({
          id: c.id,
          name: c.name,
          depth: c.sprite.depth ?? 0,
          x: rect.left + cx + (b.x - cam.scrollX - cx) * cam.zoom,
          y: rect.top + cy + (b.y - cam.scrollY - cy) * cam.zoom,
          width: b.width * cam.zoom,
          height: b.height * cam.zoom,
        });
      }

      return boxes;
    });
  }

  /**
   * Capture a stabilized screenshot (N2) and draw each visible actor's
   * bounding box + name + depth, plus the active walk target if present, onto
   * the PNG (N3). "chris_rivas is mis-scaled" beats "something looks off" —
   * this is for the multimodal driver to point at when a sprite looks wrong.
   */
  async annotateScreenshot(filePath: string): Promise<void> {
    const tempDir = path.resolve('agent-artifacts', '.annotate-tmp');
    fs.mkdirSync(tempDir, { recursive: true });
    const rawFile = path.resolve(tempDir, `raw-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`);
    await this.stabilizedScreenshot(rawFile);

    const image = await Jimp.read(rawFile);
    fs.rmSync(rawFile, { force: true });
    const font = await loadFont(SANS_10_BLACK);

    // Draws a single-pixel-thickness rectangle outline, inset by `inset` px on
    // each side (used to nest a thin accent-color rect inside a thicker black
    // one without the two outlines overlapping into a single blob).
    const drawRect = (x: number, y: number, w: number, h: number, color: number, inset = 0) => {
      const x0 = Math.max(0, Math.min(image.bitmap.width - 1, Math.round(x) + inset));
      const y0 = Math.max(0, Math.min(image.bitmap.height - 1, Math.round(y) + inset));
      const x1 = Math.max(0, Math.min(image.bitmap.width - 1, Math.round(x + w) - inset));
      const y1 = Math.max(0, Math.min(image.bitmap.height - 1, Math.round(y + h) - inset));
      for (let px = x0; px <= x1; px++) {
        image.setPixelColor(color, px, y0);
        image.setPixelColor(color, px, y1);
      }
      for (let py = y0; py <= y1; py++) {
        image.setPixelColor(color, x0, py);
        image.setPixelColor(color, x1, py);
      }
    };

    // C5: a flat 1-px outline in a single color reads fine against a
    // contrasting background but disappears against pixel art that happens to
    // match red/yellow tones. Draw a 3-px black "halo" outer rect first, then
    // the existing accent color 1-2px in from it, so the box reads on both
    // dark and light art regardless of what's directly under either stroke.
    const drawHaloRect = (x: number, y: number, w: number, h: number, accentColor: number) => {
      const BLACK = 0x000000ff;
      // Outer halo: 3px black, drawn as three concentric 1px outlines.
      drawRect(x, y, w, h, BLACK, -2);
      drawRect(x, y, w, h, BLACK, -1);
      drawRect(x, y, w, h, BLACK, 0);
      // Inner accent: 1-2px in the original color, inset just inside the halo.
      drawRect(x, y, w, h, accentColor, 1);
      drawRect(x, y, w, h, accentColor, 2);
    };

    const ACTOR_COLOR = 0xff3b30ff; // red
    const TARGET_COLOR = 0xffcc00ff; // yellow

    const boxes = await this.getActorBoundingBoxes();
    for (const box of boxes) {
      drawHaloRect(box.x, box.y, box.width, box.height, ACTOR_COLOR);
      image.print({
        x: Math.max(0, Math.round(box.x)),
        y: Math.max(0, Math.round(box.y) - 11),
        text: `${box.name} d${box.depth}`,
        font,
      });
    }

    const { walkTarget } = await this.dumpWalkAndNpcTargets();
    if (walkTarget) {
      const { x: wx, y: wy } = walkTarget.viewport;
      drawHaloRect(wx - 8, wy - 8, 16, 16, TARGET_COLOR);
      image.print({
        x: Math.round(wx) + 10,
        y: Math.max(0, Math.round(wy) - 6),
        text: walkTarget.markerLabel || 'walk target',
        font,
      });
    }

    await image.write(filePath as `${string}.${string}`);
  }

  // ── B3/F1: minigame registry + force-complete ───────────────────────────

  /**
   * All registered mode ids, read via the dev-only `__OMEGA_DEV_BRIDGE__`
   * (exposed in `GameLayout.tsx`'s `postBoot`, guarded by `import.meta.env.DEV`)
   * rather than importing `listModeIds()` into this Node process — that
   * transitively pulls in Phaser and crashes at import time outside a browser
   * (lesson 1).
   */
  async listModes(): Promise<string[]> {
    return this.page.evaluate(() => {
      const bridge = (window as unknown as { __OMEGA_DEV_BRIDGE__?: any }).__OMEGA_DEV_BRIDGE__;
      if (!bridge) throw new Error('__OMEGA_DEV_BRIDGE__ unavailable (production build?)');
      return bridge.listModeIds();
    });
  }

  /**
   * Force-complete the foreground minigame via its own `harnessForceComplete`
   * (the exact mechanism `advanceUntil`'s `skipModes` uses) instead of tearing
   * it down directly, so the engine's normal completion path (ledger deltas,
   * beat advance) still runs. Set by the launch site (ChapterScene.launchMode /
   * BeatEngine's mode-beat and bossFight runners) right before `mode.start()` —
   * see `GameMode.harnessForceComplete` in `src/game/modes/types.ts`.
   */
  async completeMode(outcome: 'win' | 'lose'): Promise<{ modeId: string }> {
    return this.page.evaluate((oc) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');
      const mode = scene.activeMode;
      if (!mode) throw new Error('No active mode — nothing to complete. Run "mode <id>" first.');
      if (typeof mode.harnessForceComplete !== 'function') {
        throw new Error(`Mode "${mode.id}" has no harnessForceComplete — cannot force-complete.`);
      }
      const modeId = mode.id;
      mode.harnessForceComplete({ outcome: oc });
      return { modeId };
    }, outcome);
  }

  // ── B5: camera fit/follow ────────────────────────────────────────────────

  /**
   * Zoom + centerOn the whole current-scene map rect and stop following the
   * player — the `qa_capture.cjs` recipe that found collision-rect bugs.
   * Never calls `cameras.main.setBounds()` (project hard rule in CLAUDE.md —
   * reintroduces the black-bars-on-wide-viewports bug); fit is achieved
   * purely via zoom + centerOn.
   */
  async cameraFit(): Promise<{ zoom: number; cx: number; cy: number }> {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');
      const map = scene.chapter?.scenes?.[scene.currentSceneIndex]?.map ?? scene.chapter?.map;
      if (!map) throw new Error('No map config for the current scene');

      const cam = scene.cameras.main;
      cam.stopFollow();
      const zoom = Math.min(cam.width / map.width, cam.height / map.height);
      cam.setZoom(zoom);
      cam.centerOn(map.width / 2, map.height / 2);
      return { zoom, cx: map.width / 2, cy: map.height / 2 };
    });
  }

  /** Restore `startFollow(player)` at the chapter's configured zoom (or 2.0). */
  async cameraFollow(): Promise<void> {
    await this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');
      if (!scene.player) throw new Error('Player not spawned yet — run "advance" first');
      const zoomLevel = scene.chapter?.cameraZoom ?? 2.0;
      scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
      scene.cameras.main.setZoom(zoomLevel);
    });
  }

  // ── B2: file-based save-state ────────────────────────────────────────────

  /**
   * Dump `{saveBlob, chapterId, sceneIndex, beatIndex, player, hp,
   * ledgerTotal}` to `filePath` — `saveBlob` is the live `omega-save-v2`
   * localStorage value (settings.ts semantics, never a parallel persistence
   * path — project hard rule). Capture once right before a bug, restore in
   * every subsequent run with `loadFileState`.
   */
  async saveFileState(filePath: string): Promise<void> {
    const data = await this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');
      let saveBlob: string | null = null;
      try {
        saveBlob = localStorage.getItem('omega-save-v2');
      } catch {
        // private mode / quota — persistence is a nicety, proceed without it
      }
      return {
        saveBlob,
        chapterId: scene.chapter?.id ?? null,
        sceneIndex: scene.currentSceneIndex,
        beatIndex: scene.beatIndex,
        player: scene.player ? { x: scene.player.x, y: scene.player.y } : null,
        hp: scene.activeHp,
        ledgerTotal: scene.ledgerTotal,
      };
    });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Restore a save written by `saveFileState`: write the blob back to
   * localStorage, re-navigate the full hero-select → Free Play → chapter-card
   * flow (a page reload alone won't re-enter the chapter), wait for
   * `ChapterScene.create()` to finish, then warp scene/beat/position/hp/ledger
   * — the same in-memory restore `loadQuickState` does, just after a real
   * re-navigation instead of resuming the live session.
   */
  async loadFileState(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) throw new Error(`Save-state file not found: ${filePath}`);
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (typeof saved.saveBlob === 'string') {
      await this.page.evaluate((blob) => {
        try {
          localStorage.setItem('omega-save-v2', blob);
        } catch {
          // private mode / quota — proceed without persisting
        }
      }, saved.saveBlob);
    }

    const chapter = CHAPTERS.find((c) => c.id === saved.chapterId);
    if (!chapter) throw new Error(`Unknown chapterId in save file: ${saved.chapterId}`);

    // Always attempt the seal-break — breakSeal() is a no-op when no sealed
    // card is visible, so this is safe for non-classified chapters too.
    await navigateToChapter(this.page, chapter.title, { classified: true });
    await this.page.waitForSelector('canvas', { timeout: 15000 });

    // Wait for create() to finish (levelStarted flips true regardless of beat
    // progress) before touching scene internals — same readiness guard as
    // warpScene (lesson 4).
    const deadline = Date.now() + 15000;
    for (;;) {
      const started = await this.page.evaluate(() => {
        const s = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return !!(s && s.levelStarted && s.walls);
      });
      if (started || Date.now() > deadline) break;
      await this.page.waitForTimeout(150);
    }

    await this.page.evaluate((s) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');

      if (scene.activeMode) {
        try {
          scene.activeMode.teardown();
        } catch {
          // best-effort teardown of whatever mode was active pre-restore
        }
        scene.activeMode = null;
      }
      if (typeof scene.clearStoryDialogue === 'function') scene.clearStoryDialogue();
      scene.beatEngine.clearWalkTarget();

      scene.warpToScene(s.sceneIndex);
      if (scene.player && s.player) {
        scene.player.setPosition(s.player.x, s.player.y);
        if (scene.player.body) scene.player.body.setVelocity(0, 0);
      }
      if (typeof s.hp === 'number') {
        scene.activeHp = s.hp;
        scene.onHpChange(s.hp);
      }
      if (typeof s.ledgerTotal === 'number') {
        scene.ledgerTotal = s.ledgerTotal;
        scene.onLedgerChange(s.ledgerTotal, 'Restore File Save');
      }
      scene.beatIndex = s.beatIndex;
      scene.beatEngine.startBeat(s.beatIndex);
    }, saved);
  }

  // ── D4: economy/state editor ─────────────────────────────────────────────

  /** Directly set `hp`, `ledger`, or `shards` — unlocks low-HP barks, game-over
   *  screens, and ledger-threshold endings without grinding to reach them. */
  async modifyStat(stat: 'hp' | 'ledger' | 'shards', value: number): Promise<{ stat: string; value: number }> {
    return this.page.evaluate(
      ({ stat, value }) => {
        const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
        if (!game) throw new Error('Game not initialized');
        const scene = game.scene.getScene('ChapterScene');
        if (!scene) throw new Error('ChapterScene not found');

        if (stat === 'hp') {
          scene.activeHp = value;
          scene.onHpChange(value);
        } else if (stat === 'ledger') {
          scene.ledgerTotal = value;
          scene.onLedgerChange(value, 'Agent modify');
        } else if (stat === 'shards') {
          scene.shardsCollected = value;
        } else {
          throw new Error(`Unknown stat "${stat}". Supported: hp, ledger, shards`);
        }
        return { stat, value };
      },
      { stat, value },
    );
  }

  // ── D3: narrative decision injector ──────────────────────────────────────

  /**
   * Click a `[data-testid="dialogue-choice"]` button by index or fuzzy text
   * match with the trusted mouse — NOT by injecting the selection directly
   * into BeatEngine, which would bypass the UI layer exactly like the
   * StrictMode desync pattern lesson 3 exists to prevent. Throws with the
   * list of available choice texts when nothing matches.
   */
  async chooseOption(indexOrText: string): Promise<{ matched: string }> {
    const locator = this.page.locator('[data-testid="dialogue-choice"]');
    const choices = await locator.evaluateAll((els) =>
      els.map((el) => {
        const span = el.querySelector('span:nth-child(2)');
        return span ? (span as HTMLElement).innerText : (el as HTMLElement).innerText;
      }),
    );
    if (choices.length === 0) throw new Error('No dialogue choices are currently visible.');

    let targetIndex = -1;
    const trimmed = indexOrText.trim();
    if (/^\d+$/.test(trimmed)) {
      targetIndex = Number(trimmed);
    } else {
      const needle = trimmed.toLowerCase();
      targetIndex = choices.findIndex((c) => c.toLowerCase().includes(needle));
    }
    if (targetIndex < 0 || targetIndex >= choices.length) {
      throw new Error(
        `No choice matches "${indexOrText}". Available: ${choices.map((c, i) => `[${i}] ${c}`).join(', ')}`,
      );
    }

    await locator.nth(targetIndex).click();
    return { matched: choices[targetIndex] };
  }

  // ── D2: settings controller ──────────────────────────────────────────────

  /** Read the live settings singleton via the dev bridge (settings.ts semantics). */
  async getSettingsBridge(): Promise<Record<string, unknown>> {
    return this.page.evaluate(() => {
      const bridge = (window as unknown as { __OMEGA_DEV_BRIDGE__?: any }).__OMEGA_DEV_BRIDGE__;
      if (!bridge) throw new Error('__OMEGA_DEV_BRIDGE__ unavailable (production build?)');
      return bridge.getSettings();
    });
  }

  /**
   * Patch settings via `updateSettings()` (settings.ts's own setter — never a
   * raw localStorage write, per the project's no-parallel-persistence rule).
   * e.g. `{ textSpeedMs: 0 }` for "text speed = instant" as a scriptable test
   * precondition.
   */
  async updateSettingsBridge(partial: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.page.evaluate((p) => {
      const bridge = (window as unknown as { __OMEGA_DEV_BRIDGE__?: any }).__OMEGA_DEV_BRIDGE__;
      if (!bridge) throw new Error('__OMEGA_DEV_BRIDGE__ unavailable (production build?)');
      return bridge.updateSettings(p);
    }, partial);
  }

  // ── F2: progress/unlock editor ───────────────────────────────────────────

  /** Read the live progress singleton (completedChapters, freePlay, Hall of Records, etc). */
  async getProgressBridge(): Promise<Record<string, unknown>> {
    return this.page.evaluate(() => {
      const bridge = (window as unknown as { __OMEGA_DEV_BRIDGE__?: any }).__OMEGA_DEV_BRIDGE__;
      if (!bridge) throw new Error('__OMEGA_DEV_BRIDGE__ unavailable (production build?)');
      return bridge.getProgress();
    });
  }

  /**
   * Set chapter-unlock/completion/free-play state in the `omega-save-v2` blob
   * via `saveProgressData()` (settings.ts semantics) — makes "chapter N
   * unlocked but not completed" constructable without playing chapter N-1.
   */
  async setChapterFlag(
    chapterId: string,
    action: 'complete' | 'uncomplete' | 'freeplay-on' | 'freeplay-off',
  ): Promise<Record<string, unknown>> {
    return this.page.evaluate(
      ({ chapterId, action }) => {
        const bridge = (window as unknown as { __OMEGA_DEV_BRIDGE__?: any }).__OMEGA_DEV_BRIDGE__;
        if (!bridge) throw new Error('__OMEGA_DEV_BRIDGE__ unavailable (production build?)');
        const progress = bridge.getProgress();
        const completed = new Set<string>(progress.completedChapters ?? []);
        if (action === 'complete') completed.add(chapterId);
        else if (action === 'uncomplete') completed.delete(chapterId);
        const next = { ...progress, completedChapters: [...completed] };
        if (action === 'freeplay-on') next.freePlay = true;
        if (action === 'freeplay-off') next.freePlay = false;
        bridge.saveProgressData(next);
        return bridge.getProgress();
      },
      { chapterId, action },
    );
  }

  // ── G3: audio assertions ─────────────────────────────────────────────────

  /**
   * Turn a QA checklist line ("Scene 0 opens in silence", "BGM never returns
   * post-snap") into a one-line scriptable assertion over B4's `inspectAudio`.
   */
  async assertAudio(kind: 'silent' | 'playing' | 'stopped', key?: string): Promise<{ ok: boolean; detail: string }> {
    const audio = await this.inspectAudio();
    if (kind === 'silent') {
      const ok = audio.playing.length === 0;
      return { ok, detail: ok ? 'no sounds are playing' : `still playing: ${audio.playing.map((p) => p.key).join(', ')}` };
    }
    if (!key) throw new Error('Usage: audio assert playing|stopped <key> (or "silent" with no key)');
    const isPlaying = audio.playing.some((p) => p.key === key);
    if (kind === 'playing') {
      return { ok: isPlaying, detail: isPlaying ? `"${key}" is playing` : `"${key}" is NOT playing` };
    }
    return { ok: !isPlaying, detail: !isPlaying ? `"${key}" is stopped` : `"${key}" is still playing` };
  }

  // ── E1: animation state dump ─────────────────────────────────────────────

  /**
   * Per visible actor sprite (+ player): current animation key, frame index,
   * playing state, and flip — catches "sprite frozen on frame 0", "understudy
   * playing the wrong hero's walk cycle", and flip-direction bugs that are
   * invisible to `state` and previously only detectable by eye.
   */
  async inspectAnimations(): Promise<
    { id: string; name: string; animKey: string | null; frameIndex: number | null; isPlaying: boolean; flipX: boolean }[]
  > {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) return [];
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) return [];

      const candidates: { id: string; name: string; sprite: any }[] = [];
      if (scene.actorSprites) {
        for (const id of Object.keys(scene.actorSprites)) {
          const entry = scene.actorSprites[id];
          candidates.push({ id, name: entry?.[1]?.text || id, sprite: entry?.[0] });
        }
      }
      if (scene.player) candidates.push({ id: 'player', name: 'player', sprite: scene.player });

      const out: { id: string; name: string; animKey: string | null; frameIndex: number | null; isPlaying: boolean; flipX: boolean }[] = [];
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (!c.sprite || !c.sprite.visible) continue;
        const anims = c.sprite.anims;
        out.push({
          id: c.id,
          name: c.name,
          animKey: anims?.currentAnim?.key ?? null,
          frameIndex: anims?.currentFrame?.index ?? null,
          isPlaying: !!anims?.isPlaying,
          flipX: !!c.sprite.flipX,
        });
      }
      return out;
    });
  }

  // ── E2: render-order inspector ────────────────────────────────────────────

  /**
   * Every visible object across active scenes, sorted by depth (deepest
   * last-rendered first). With `worldX`/`worldY` given, filtered to objects
   * whose `getBounds()` contains that world point — makes z-fighting and
   * "text painted onto the floor" queryable instead of visual.
   */
  async inspectDepth(
    worldX?: number,
    worldY?: number,
  ): Promise<
    { type: string; texture: string | null; text: string | null; depth: number; scrollFactor: number; x: number; y: number; screen: { x: number; y: number } }[]
  > {
    const items = await this.page.evaluate(
      ({ x, y }) => {
        const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
        if (!game) return [];
        const scenes = game.scene.getScenes(true);
        const rect = game.canvas.getBoundingClientRect();

        const out: any[] = [];
        for (let s = 0; s < scenes.length; s++) {
          const scene = scenes[s];
          const cam = scene.cameras.main;
          const cx = cam.width / 2;
          const cy = cam.height / 2;
          const queue = [...scene.children.list];
          let head = 0;
          while (head < queue.length) {
            const child = queue[head++];
            if (!child.visible || (typeof child.alpha === 'number' && child.alpha <= 0)) continue;
            if (child.list && Array.isArray(child.list)) {
              for (let j = 0; j < child.list.length; j++) queue.push(child.list[j]);
              continue;
            }

            const sf = typeof child.scrollFactorX === 'number' ? child.scrollFactorX : 1;
            const wx = child.x ?? 0;
            const wy = child.y ?? 0;
            const screenX = sf !== 0 ? rect.left + cx + (wx - cam.scrollX - cx) * cam.zoom : rect.left + wx;
            const screenY = sf !== 0 ? rect.top + cy + (wy - cam.scrollY - cy) * cam.zoom : rect.top + wy;

            if (typeof x === 'number' && typeof y === 'number') {
              if (typeof child.getBounds !== 'function') continue;
              const b = child.getBounds();
              if (!(x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height)) continue;
            }

            out.push({
              type: child.type || 'unknown',
              texture: child.texture?.key ?? null,
              text: child.text ?? child._text ?? null,
              depth: child.depth ?? 0,
              scrollFactor: sf,
              x: wx,
              y: wy,
              screen: { x: screenX, y: screenY },
            });
          }
        }
        out.sort((a, b) => b.depth - a.depth);
        return out;
      },
      { x: worldX ?? null, y: worldY ?? null },
    );
    return items;
  }

  // ── E3: what's under this pixel ──────────────────────────────────────────

  /**
   * Composite of E2 at a world point + physics bodies overlapping it + any
   * DOM element with a `data-testid` at the corresponding screen point —
   * answers "I clicked and nothing happened" in one call: either nothing
   * interactive was there, or something invisible is covering it.
   */
  async hitReport(worldX: number, worldY: number): Promise<{
    renderObjects: Awaited<ReturnType<GameAgent['inspectDepth']>>;
    physicsBodies: { gameObjectType: string | null; solid: boolean }[];
    domHit: boolean;
  }> {
    const renderObjects = await this.inspectDepth(worldX, worldY);
    const { physicsBodies, domHit } = await this.page.evaluate(
      ({ x, y }) => {
        const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
        if (!game) return { physicsBodies: [], domHit: false };
        const scene = game.scene.getScene('ChapterScene');

        const bodies: { gameObjectType: string | null; solid: boolean }[] = [];
        if (scene?.physics?.world) {
          // Arcade World tracks bodies in Phaser's own Structs.Set (a legacy,
          // pre-ES6 collection with an `.entries` array), NOT a native Set —
          // spreading it directly throws "not iterable" despite `instanceof
          // Set` looking plausible from the type name.
          const dynamic = scene.physics.world.bodies?.entries ?? [];
          const statics = scene.physics.world.staticBodies?.entries ?? [];
          const all = [...dynamic, ...statics];
          for (let i = 0; i < all.length; i++) {
            const b: any = all[i];
            if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
              bodies.push({
                gameObjectType: b.gameObject?.texture?.key ?? b.gameObject?.type ?? null,
                solid: !!b.immovable,
              });
            }
          }
        }

        let domHit = false;
        if (scene) {
          const cam = scene.cameras.main;
          const cx = cam.width / 2;
          const cy = cam.height / 2;
          const rect = game.canvas.getBoundingClientRect();
          const screenX = rect.left + cx + (x - cam.scrollX - cx) * cam.zoom;
          const screenY = rect.top + cy + (y - cam.scrollY - cy) * cam.zoom;
          const el = document.elementFromPoint(screenX, screenY);
          domHit = !!(el && el.closest('[data-testid]'));
        }

        return { physicsBodies: bodies, domHit };
      },
      { x: worldX, y: worldY },
    );
    return { renderObjects, physicsBodies, domHit };
  }

  // ── E4: active visual-effects dump ───────────────────────────────────────

  /**
   * Camera flash/fade/shake running state plus the Atmosphere screen-tint
   * overlay's *effective* rendered alpha (`fillAlpha * alpha`) — this codebase
   * has been bitten twice by a silently no-op'd tint (the `fillAlpha:0` trap
   * in CLAUDE.md); this makes "is the tint actually rendering" assertable
   * instead of a screenshot judgment call.
   */
  async inspectFx(): Promise<{
    camera: { flashing: boolean; fadingOut: boolean; shaking: boolean };
    screenTint: { color: number; effectiveAlpha: number } | null;
  }> {
    return this.page.evaluate(() => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');
      const cam = scene.cameras.main;

      let screenTint = null;
      const overlay = scene.atmosphere?.screenTintOverlay;
      if (overlay) {
        screenTint = {
          color: overlay.fillColor,
          effectiveAlpha: (overlay.fillAlpha ?? 1) * (overlay.alpha ?? 1),
        };
      }

      return {
        camera: {
          flashing: !!cam.flashEffect?.isRunning,
          fadingOut: !!cam.fadeEffect?.isRunning,
          shaking: !!cam.shakeEffect?.isRunning,
        },
        screenTint,
      };
    });
  }

  // ── D1: cheap directional walk-to ────────────────────────────────────────

  /**
   * Hold the dominant direction key toward `(targetX, targetY)`, re-evaluate
   * every ~10 frames, stop inside `radius`, give up after `maxSeconds` with
   * `ok:false` + the final position. No A-star / navmesh — current maps are
   * open rooms with perimeter walls; full pathfinding is over-engineering until a
   * maze-like map exists (deliberately descoped per the spec).
   */
  async walkTo(
    targetX: number,
    targetY: number,
    radius = 24,
    maxSeconds = 8,
  ): Promise<{ ok: boolean; player: { x: number; y: number } | null }> {
    const deadline = Date.now() + maxSeconds * 1000;
    let lastKeys: string[] = [];

    for (;;) {
      const state = await this.snapshotGameState();
      const player = state.player;
      if (!player) return { ok: false, player: null };

      const dx = targetX - player.x;
      const dy = targetY - player.y;
      if (Math.hypot(dx, dy) <= radius) {
        for (const k of lastKeys) await this.releaseKey(k);
        return { ok: true, player };
      }
      if (Date.now() > deadline) {
        for (const k of lastKeys) await this.releaseKey(k);
        return { ok: false, player };
      }

      const nextKeys: string[] = [];
      if (Math.abs(dx) > 4) nextKeys.push(dx > 0 ? 'd' : 'a');
      if (Math.abs(dy) > 4) nextKeys.push(dy > 0 ? 's' : 'w');

      for (const k of lastKeys) if (!nextKeys.includes(k)) await this.releaseKey(k);
      for (const k of nextKeys) if (!lastKeys.includes(k)) await this.holdKey(k);
      lastKeys = nextKeys;

      await this.stepFrames(10);
    }
  }

  // ── F3: one-off beat executor ────────────────────────────────────────────

  /**
   * Execute a single beat object through the engine's own dispatch
   * (`beatEngine.startBeat`, same path `skipBeat`/`goto` use — lesson 3),
   * after appending it to the live chapter's beat list. Lets a chapter author
   * preview a beat before writing it into a chapter file — bridges
   * playtesting and authoring.
   */
  async injectBeat(beat: Record<string, unknown>): Promise<{ beatIndex: number }> {
    return this.page.evaluate((b) => {
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) throw new Error('Game not initialized');
      const scene = game.scene.getScene('ChapterScene');
      if (!scene) throw new Error('ChapterScene not found');
      if (!scene.levelStarted) throw new Error('Scene not ready — run "advance" first');

      const beats = scene.chapter.beats;
      const index = beats.length;
      beats.push(b);

      if (typeof scene.clearStoryDialogue === 'function') scene.clearStoryDialogue();
      scene.beatEngine.unfreeze();
      scene.movementFrozen = false;
      scene.beatEngine.clearWalkTarget();
      scene.beatEngine.startBeat(index);

      return { beatIndex: index };
    }, beat);
  }
}
