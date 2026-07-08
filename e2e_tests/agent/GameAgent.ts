import { Page } from '@playwright/test';

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

  constructor(private readonly page: Page) {}

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
}
