/**
 * DevBridge.ts — structural TypeScript types for the dev-only bridges the
 * GameAgent CLI peeks into via `page.evaluate()`: `window.__OMEGA_GAME__`
 * (the live Phaser.Game instance, exposed in `postBoot` under
 * `import.meta.env.DEV` — see `src/components/GameLayout.tsx`) and
 * `window.__OMEGA_DEV_BRIDGE__` (the settings/progress/mode-registry
 * surface the same postBoot callback attaches alongside it).
 *
 * Scope (H4 — docs/toolkit_complaints.md Triage/Blessing): this covers ONLY
 * the subset of scene state actually read across `e2e_tests/helpers.ts`,
 * `e2e_tests/agent/cli.ts`, and `e2e_tests/agent/GameAgent.ts` today —
 * `beatIndex`, `currentSceneIndex`, `levelStarted`, `movementFrozen`,
 * `player.x/y`, `walkTarget {x,y,radius}`, `activeMode {id,
 * harnessForceComplete}`, `chapter {beats, scenes}`, `beatEngine`,
 * `actorSprites`, and `cameras.main {width,height,scrollX,scrollY,zoom}`.
 * It is NOT a full typing of `ChapterScene` — fields not listed here should
 * still be read through an index signature or a fresh `as any` cast rather
 * than by extending these interfaces speculatively.
 *
 * Hard constraints (do not violate):
 *   - NO imports from `src/game`, `src/data`, or `phaser` here. This file is
 *     imported by the Node-side Playwright CLI; pulling Phaser's module
 *     graph into that process crashes at import time (see CLAUDE.md /
 *     agent_toolkit_spec_v2.md "lesson 1"). Only `interface`/`type`
 *     declarations belong in this file — no runtime code, no re-exports of
 *     engine types.
 *   - Structural typing only. Where the full shape is genuinely unknowable
 *     from the CLI's vantage point (e.g. the raw Phaser.Game object, or a
 *     beat's type-specific fields), fall back to `[key: string]: unknown` or
 *     `unknown` rather than guessing a shape that will drift silently.
 *   - Fields the existing call sites already read defensively (with `?.` or
 *     an explicit null check) are typed optional/nullable here to match that
 *     reality — do not "fix" them to non-null just to make a call site read
 *     cleaner.
 *
 * Honest limitation: these types document and type-check the *accesses* the
 * CLI makes; they cannot catch drift between this file and the real
 * `ChapterScene`/`GameLayout.tsx` shapes at runtime. If a field is renamed or
 * removed on the game side, `page.evaluate()` still just returns `undefined`
 * silently — TypeScript has no visibility into the browser-side object. The
 * `GameAgent.smoke.spec.ts` integration test (which actually boots the game
 * and exercises these accesses) remains the real guard against that drift,
 * not this file.
 *
 * Adoption is intentionally partial (see H4's blessing note): this
 * establishes the pattern at a few high-value call sites (the scene lookup
 * in `e2e_tests/helpers.ts`, and a couple of the most-read `page.evaluate`
 * blocks in `cli.ts`/`GameAgent.ts`). The remaining `(window as any)
 * .__OMEGA_GAME__` sites throughout the toolkit are expected to migrate to
 * this file incrementally, not in one pass.
 */

/** A beat's `type` discriminant, read defensively — chapter configs define far
 * more fields per beat type than the CLI ever needs, so beats are typed as a
 * loose bag with a known `id`/`type` plus an index-signature escape hatch. */
export interface BridgeBeat {
  id?: string;
  type?: string;
  [key: string]: unknown;
}

/** The subset of a chapter config the CLI reads off the live scene (not the
 * static `src/data/chapters` import, which the CLI's own gauntlet code does
 * import directly — this is what `scene.chapter` exposes at runtime). */
export interface BridgeChapterConfig {
  beats?: BridgeBeat[];
  scenes?: unknown[];
  [key: string]: unknown;
}

/** `scene.activeMode` — the foreground minigame mode instance, or null/undefined
 * when the player is just walking the map. `harnessForceComplete` is how
 * `advanceUntil`'s `skipModes` and the `winmode`/`losemode` commands force a
 * mode to finish without playing it out (set by the launch site — ChapterScene.
 * launchMode / BeatEngine's mode-beat and bossFight runners — right before
 * calling `mode.start()`; see GameMode.harnessForceComplete in src/game/modes/types.ts). */
export interface BridgeActiveMode {
  id?: string;
  harnessForceComplete?: (result: { outcome: 'win' | 'lose'; [key: string]: unknown }) => void;
  [key: string]: unknown;
}

/** `scene.walkTarget` — the current walk-to marker driving `advanceUntil`'s
 * teleport-onto-target fallback and the `targets`/`walkto` commands. */
export interface BridgeWalkTarget {
  x: number;
  y: number;
  radius?: number;
  markerLabel?: string;
  [key: string]: unknown;
}

/** `scene.player` — a live Arcade Sprite. Only position is typed; `body`
 * (velocity, physics) is read ad hoc at call sites that need it and is left
 * as `unknown` here rather than guessing Arcade.Body's shape. */
export interface BridgePlayer {
  x: number;
  y: number;
  body?: unknown;
  [key: string]: unknown;
}

/** `scene.cameras.main` — the subset of Phaser.Cameras.Scene2D.Camera the
 * world<->viewport math (`worldToViewport`, `dumpWalkAndNpcTargets`,
 * `annotateScreenshot`) actually reads. */
export interface BridgeCamera {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  zoom: number;
  [key: string]: unknown;
}

/** A single entry in `scene.actorSprites` — keyed by actor id elsewhere. */
export interface BridgeActorSprite {
  x?: number;
  y?: number;
  depth?: number;
  [key: string]: unknown;
}

/**
 * `game.scene.getScene('ChapterScene')` — the live orchestrator instance from
 * `src/game/ChapterScene.ts`. This does NOT attempt to model every field on
 * that class; it's the read-subset the CLI/helpers actually touch today.
 * Everything else falls through the index signature as `unknown`.
 */
export interface ChapterSceneBridge {
  beatIndex?: number;
  beatActive?: boolean;
  currentSceneIndex?: number;
  levelStarted?: boolean;
  movementFrozen?: boolean;
  player?: BridgePlayer | null;
  walkTarget?: BridgeWalkTarget | null;
  activeMode?: BridgeActiveMode | null;
  chapter?: BridgeChapterConfig;
  /** The BeatEngine instance driving beat dispatch — methods called by name
   * (`startBeat`, `clearWalkTarget`, `unfreeze`) rather than typed in full. */
  beatEngine?: {
    startBeat?: (index: number) => void;
    clearWalkTarget?: () => void;
    unfreeze?: () => void;
    [key: string]: unknown;
  };
  actorSprites?: Record<string, BridgeActorSprite>;
  cameras?: { main: BridgeCamera };
  activeHp?: number;
  ledgerTotal?: number;
  [key: string]: unknown;
}

/** A single Phaser SceneManager entry as returned by `game.scene.getScene(key)`
 * for scenes the CLI doesn't otherwise special-case (e.g. when just checking
 * `sys.settings.key` for the top-most active scene in checkpoint detection). */
export interface GenericSceneBridge {
  sys?: { settings?: { key?: string } };
  [key: string]: unknown;
}

/**
 * `window.__OMEGA_GAME__` — the live Phaser.Game instance, exposed only in
 * dev builds (`import.meta.env.DEV`, `GameLayout.tsx` postBoot). The `scene`
 * manager's lookup methods are typed narrowly for the two call shapes the
 * toolkit uses (`getScene('ChapterScene')` and `getScenes(true)`); `canvas`
 * and everything else fall through `[key: string]: unknown`.
 */
export interface DevBridgeGame {
  scene: {
    getScene(key: 'ChapterScene'): ChapterSceneBridge | undefined;
    getScene(key: string): GenericSceneBridge | undefined;
    getScenes(isActive?: boolean): GenericSceneBridge[];
    keys?: Record<string, unknown>;
  };
  canvas?: HTMLCanvasElement;
  loop?: { sleep?: () => void; wake?: () => void; running?: boolean };
  [key: string]: unknown;
}

/**
 * `window.__OMEGA_DEV_BRIDGE__` — the settings/progress/mode-registry surface
 * `GameLayout.tsx`'s `postBoot` attaches next to `__OMEGA_GAME__`, so the CLI
 * can go through the same setters React/Phaser use (settings.ts) instead of a
 * parallel localStorage path. Shapes of `getSettings()`/`getProgress()`
 * results are intentionally left as `unknown` here — they live in
 * `src/game/settings.ts`, which this file must not import (see file header).
 */
export interface DevBridgeSurface {
  listModeIds?: () => string[];
  getSettings?: () => unknown;
  updateSettings?: (patch: Record<string, unknown>) => unknown;
  getProgress?: () => unknown;
  saveProgressData?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

/**
 * The shape of `window` as seen from inside `page.evaluate()`, once cast away
 * from Playwright's default `Window & typeof globalThis`. Usage pattern:
 *
 *   const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__
 *     ?.scene.getScene('ChapterScene');
 *
 * Both bridge properties are optional/undefined outside a dev build (or
 * before `postBoot` has run), matching the defensive `?.` chains already used
 * at every existing call site.
 */
export interface DevBridgeWindow {
  __OMEGA_GAME__?: DevBridgeGame;
  __OMEGA_DEV_BRIDGE__?: DevBridgeSurface;
}
