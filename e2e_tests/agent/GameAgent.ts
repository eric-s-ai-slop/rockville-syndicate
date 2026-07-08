import { Page } from '@playwright/test';
import { Jimp, diff } from 'jimp';
import fs from 'node:fs';
import path from 'node:path';

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
    await canvas.click({ position: { x: 5, y: 5 } }).catch(() => {
      // Some overlays swallow the click; focusing the element is enough.
      return canvas.focus();
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
      const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
      if (!game) return { x: 0, y: 0 };
      const chapter = game.scene.getScene('ChapterScene');
      if (!chapter) return { x: 0, y: 0 };
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

  /** Capture current frame and save as the golden screenshot. */
  async saveGolden(chapterName: string, name: string): Promise<string> {
    const cleanChapter = chapterName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = path.resolve('e2e_tests/agent/goldens', cleanChapter);
    fs.mkdirSync(folder, { recursive: true });
    const file = path.resolve(folder, `${name}.png`);
    await this.page.screenshot({ path: file });
    return file;
  }

  /** Capture current frame, compare it against the golden screenshot, and output pixel diff. */
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

    const tempDir = path.resolve('agent-artifacts/diffs');
    fs.mkdirSync(tempDir, { recursive: true });
    const currentFile = path.resolve(tempDir, `current-${name}.png`);
    const diffFile = path.resolve(tempDir, `diff-${name}.png`);

    // Take current screenshot
    await this.page.screenshot({ path: currentFile });

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
}
