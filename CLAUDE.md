# CLAUDE.md — Developer Reference Guide

## 1. Stack & Environment
- **Core Stack**: React 19 + Phaser 3.88.2 (**NOT Phaser 4**) + Vite + TypeScript + Tailwind v4.
- **Node/NPM**: Native package management.

## 2. Common Developer Commands
- **Run local dev server**: `npm run dev` (serves at port 3324)
- **TypeScript build & typecheck**: `npm run lint` (runs `tsc --noEmit`)
- **Run Unit Tests**: `npm test` (runs Vitest unit test suite)
- **Run E2E Tests**: `npm run e2e` (runs Playwright integration tests)
- **Build production assets**: `npm run build`

## 3. Directory Map (Where Things Live)
```
src/
  data/
    entities.ts                      # Character class stats, bosses, weapons, loot metadata
    chapters/
      index.ts                       # Chapters barrel: CHAPTERS list, getChapter lookup
      types.ts                       # Config types (Speaker, MapRect, Beat, ChapterConfig, etc.)
      palette.ts                     # Shared colors palette (C)
      chapter1.spotify-insurgency.ts
      ...                            # Per-chapter configs (Chapters 1 to 9)
  game/
    ChapterScene.ts                  # Phaser Scene orchestrator (creates and wires subsystems)
    scene/
      Actors.ts                      # Spawns actor sprites, updates animations, processes understudies
      AudioController.ts             # Manages stage music tracks, boss loops, and sound effects
      BeatEngine.ts                  # Dispatches and executes story beats (dialogue, choices, pans)
      MapBuilder.ts                  # Draws floor layouts, scattered nature, and interactive props
    modes/
      types.ts                       # GameMode interface, ModeContext facade, and ModeResult
      index.ts                       # Mode registry: registerMode() & getMode()
      bossFight/                     # Combat minigame mode (boss movement, attack AI, HP overlays)
      poolParty/                     # Background minigame mode (Chapter 9 pool entrance script)
      _template/                     # Reference template for implementing new minigames
docs/
  ADDING_A_MINIGAME.md               # Guide for implementing and registering new minigame modes
```

## 4. Hard-Won Gotchas (Do NOT Violate)
- **Never call a side effect inside a React `setState` updater.** The app is wrapped in `<StrictMode>` (`src/main.tsx`), which double-invokes updater functions in dev. A past bug: calling `done()`/`advanceBeat()` inside `setActiveStory(prev => …)` fired the beat advance twice and skipped every other beat. Pattern to keep: mirror state into a ref, read the ref, then run `setState(...)` and the side effect **outside** the updater. Any React→Phaser bridge callback must follow this. (See `src/components/GameLayout.tsx`.)
- **Canvas sizing is driven from the scene's `update()` loop** (`syncCanvasToParent()` every RAF frame), NOT from React. Phaser `Scale.RESIZE`, `ResizeObserver`, and `setInterval` all proved unreliable in headless/embedded contexts. Keep `syncCanvasToParent()` running every frame. The React-side ResizeObserver in `GameLayout.tsx` is a redundant backup — leave it.
- **Do NOT call `cameras.main.setBounds(0,0,1000,1000)`.** Black bars on wide viewports were fixed with `setBackgroundColor(0x16331a)` + an oversized grass rect + scattered trees beyond bounds. The player is confined by physics world bounds + perimeter walls, not camera bounds. Re-adding camera bounds reintroduces the framing bug.
- **Phaser overlap/collider callbacks: never trust argument position.** Identify the intended object by group membership, e.g. `this.projectiles.contains(a) ? a : b`. A past boss bug destroyed the boss instead of the projectile because of positional assumption.
- **Route all `add.text` through the `label()` helper** (applies `resolution: max(2, dpr*2)`). Raw `add.text` renders blurry.
- **Player sprites are drawn facing right;** `update()` sets `setFlipX(vx < 0)` for horizontal travel, and boss combat overrides flip to face the aim target. That override is intentional — preserve it.
- **Scene Map Themes (`map.theme`) control procedural generation.** The `theme` property determines what procedural decorations render (e.g. `apartment` generates wooden floor planks, `highway_night` generates dust streaks). Never assign an indoor theme to an outdoor or void scene, or procedural geometry will draw over your intended backdrop.
- **Per-track audio mixing**: The global stage music crossfade applies a fixed target volume (usually 0.30). If a specific music track is mastered too quietly, handle it via an inline conditional in `AudioController.ts` (e.g. `newKey === 'music_ch6' ? 0.70 : 0.30`) rather than changing the global default.
- **Jumpscare audio syncing**: Some audio assets (like the Prowler sting) have a slow, quiet buildup. When playing them alongside a visual jumpscare flash, use the `seek` property (e.g., `sound.play('boss_sting', { volume: 1.2, seek: 0.7 })`) to skip the buildup and instantly hit the peak audio impact alongside the visual.
- **`window.__OMEGA_GAME__`** exposes the Phaser game in dev (guarded by `import.meta.env.DEV` in `postBoot`). Use it from the browser console to inspect live scene state.
- **Dev server caches Vite transforms.** After editing, a full restart of `npm run dev` (port 3324) is more reliable than hot reload; verify served code with `curl localhost:3324/src/... | grep <symbol>`.

## 5. Development Recipes
- **How to add a chapter**: Copy an existing chapter file inside `src/data/chapters/`, configure its map and narrative beats, and import/append it to the `CHAPTERS` list in `src/data/chapters/index.ts`.
- **How to add a minigame**: Follow the recipe in `docs/ADDING_A_MINIGAME.md` using the copyable template at `src/game/modes/_template/`.
