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
    entities/                        # Character stats, bosses, weapons, loot (split: heroes, bosses, combat, barks; barrel index.ts)
    chapters/
      CLAUDE.md                      # ★ Chapter-authoring cheat sheet (beat types, routing, speakers, audio)
      index.ts                       # Chapters barrel: CHAPTERS list, getChapter lookup
      types.ts                       # Config types (Speaker, MapRect, Beat, ChapterConfig, etc.)
      palette.ts                     # Shared colors palette (C)
      chapter1.spotify-insurgency.ts
      ...                            # Per-chapter configs (Chapters 0–11, incl. 3b/5b — see index.ts)
  game/
    ChapterScene.ts                  # Phaser Scene orchestrator (creates and wires subsystems)
    SpritePreprocessor.ts            # Sprite atlasing and frame extraction pipeline
    settings.ts                      # THE persistence layer (omega-save-v2 blob)
    scene/
      Actors.ts                      # Spawns actor sprites, updates animations, processes understudies
      Atmosphere.ts                  # Per-theme lighting, floor patterns, ambient visuals
      AudioController.ts             # Manages stage music tracks, boss loops, and sound effects
      BeatEngine.ts                  # Dispatches and executes story beats (dialogue, choices, pans)
      MapBuilder.ts                  # Draws floor layouts, scattered nature, and interactive props
      PlayerController.ts            # Player movement input, collision, animation state
      SpriteLoader.ts                # Asset loading pipeline for character/prop sprites
    modes/
      CLAUDE.md                      # ★ Mode registry cheat sheet (all modes, configs, lifecycle, traps)
      types.ts                       # GameMode interface, ModeContext facade, and ModeResult
      index.ts                       # Mode registry: registerMode(), getMode() & listModeIds()
      bossFight/                     # Combat minigame mode (boss movement, attack AI, HP overlays)
      poolParty/                     # Background minigame mode (Chapter 9 pool entrance script)
      benTrivia/                     # "CAN BEN…?" slam-sorting trivia minigame
      ...                            # 15 registered modes total — see modes/index.ts (modesDoc.test.ts guards the doc table)
      _template/                     # Reference template for implementing new minigames
docs/
  ADDING_A_MINIGAME.md               # Guide for implementing and registering new minigame modes
  BRAINSTORM_IDEAS.md                # Idea backlog (not committed work)
  chapter-pipeline/                  # Agentic chapter-authoring pipeline + working drafts (drafts go stale once shipped)
  archive/                           # Historical planning docs — do not act on without verifying
```

## 4. Hard-Won Gotchas (Do NOT Violate)
- **Verify against code, not docs.** Everything under `docs/archive/` (the old TRACK_* specs, `HANDOFF.md`, sprint plans, QA reports) describes earlier builds — many items listed as TODO are already done. The living references are `CLAUDE.md`, `ARCHITECTURE.md`, and `ROADMAP.md`. Never act on an archived doc without checking the current source first.
- **Persisted state goes through `src/game/settings.ts` only.** No new ad-hoc `localStorage` keys. All settings + progress + Hall of Records live in the `omega-save-v2` blob. *(Lint-enforced: `no-restricted-globals`.)*
- **`battleiq/`** is the legacy standalone JS prototype that predates the React/Phaser rewrite. The copy the game actually serves is `public/minigames/battleiq/` (adapted with `index.html` + `omega-bridge.js` for the `external` mode's iframe bridge); the root `battleiq/` is the original source for reference only. Do not edit either. See `battleiq/README.md`.
- **Never call a side effect inside a React `setState` updater.** The app is wrapped in `<StrictMode>` (`src/main.tsx`), which double-invokes updater functions in dev. A past bug: calling `done()`/`advanceBeat()` inside `setActiveStory(prev => …)` fired the beat advance twice and skipped every other beat. Pattern to keep: mirror state into a ref, read the ref, then run `setState(...)` and the side effect **outside** the updater. Any React→Phaser bridge callback must follow this. (See `src/components/GameLayout.tsx`.)
- **Canvas sizing is driven from the scene's `update()` loop** (`syncCanvasToParent()` every RAF frame), NOT from React. Phaser `Scale.RESIZE`, `ResizeObserver`, and `setInterval` all proved unreliable in headless/embedded contexts. Keep `syncCanvasToParent()` running every frame. The React-side ResizeObserver in `GameLayout.tsx` is a redundant backup — leave it.
- **Do NOT call `cameras.main.setBounds(0,0,1000,1000)`.** Black bars on wide viewports were fixed with `setBackgroundColor(0x16331a)` + an oversized grass rect + scattered trees beyond bounds. The player is confined by physics world bounds + perimeter walls, not camera bounds. Re-adding camera bounds reintroduces the framing bug. *(Lint-enforced: `no-restricted-syntax`.)*
- **Phaser overlap/collider callbacks: never trust argument position.** Identify the intended object by group membership, e.g. `this.projectiles.contains(a) ? a : b`. A past boss bug destroyed the boss instead of the projectile because of positional assumption.
- **Route all `add.text` through the `label()` helper** (applies `resolution: max(2, dpr*2)`). Raw `add.text` renders blurry. *(Lint-enforced: `no-restricted-syntax`.)*
- **Player sprites are drawn facing right;** `update()` sets `setFlipX(vx < 0)` for horizontal travel, and boss combat overrides flip to face the aim target. That override is intentional — preserve it.
- **Scene Map Themes (`map.theme`) control procedural generation.** The `theme` property determines what procedural decorations render (e.g. `apartment` generates wooden floor planks, `highway_night` generates dust streaks). Never assign an indoor theme to an outdoor or void scene, or procedural geometry will draw over your intended backdrop.
- **Per-track audio mixing**: The global stage music crossfade applies a fixed target volume (usually 0.30). If a specific music track is mastered too quietly, handle it via an inline conditional in `AudioController.ts` (e.g. `newKey === 'music_ch6' ? 0.70 : 0.30`) rather than changing the global default.
- **Jumpscare audio syncing**: Some audio assets (like the Prowler sting) have a slow, quiet buildup. When playing them alongside a visual jumpscare flash, use the `seek` property (e.g., `sound.play('boss_sting', { volume: 1.2, seek: 0.7 })`) to skip the buildup and instantly hit the peak audio impact alongside the visual.
- **Any `scrollFactor(0)` HUD/UI object must compensate for camera zoom.** The main camera runs at a permanent zoom (`chapter.cameraZoom ?? 2.0`, set in `ChapterScene.ts`). `scrollFactor(0)` cancels camera *scroll* only, NOT *zoom* — Phaser still maps the object through `screenPos = camCenter + (objPos - camCenter) * zoom`, so anything not sitting exactly on `(cam.width/2, cam.height/2)` renders displaced/off-screen, and sizes/fonts render zoom-inflated. This has bitten `complicityReport`, `speakerHunt`, and `Atmosphere.setScreenTint` independently. **Fix: import `screenSpace()` from `src/game/modes/screenSpace.ts`** — run every screen coordinate through `zx()/zy()` and every size/font/stroke through `s()`. `_template/` demonstrates the pattern; do not hand-roll the math.
- **`add.rectangle(x, y, w, h, color, 0)` sets `fillAlpha` to 0 permanently** — the renderer multiplies `fillAlpha * alpha`, so tweening only `alpha` on a zero-fillAlpha rect never renders anything regardless of alpha value. For a fade in/out overlay, construct with `fillAlpha: 1` and tween the object's `alpha` 0↔target instead. Bit `complicityReport` and `Atmosphere.setScreenTint` (the latter silently no-op'd every `screenTint` chapter beat until fixed).
- **`window.__OMEGA_GAME__`** exposes the Phaser game in dev (guarded by `import.meta.env.DEV` in `postBoot`). Use it from the browser console to inspect live scene state.
- **Dev server caches Vite transforms.** After editing, a full restart of `npm run dev` (port 3324) is more reliable than hot reload; verify served code with `curl localhost:3324/src/... | grep <symbol>`.

## 5. Development Recipes
- **How to add a chapter**: Copy an existing chapter file inside `src/data/chapters/`, configure its map and narrative beats, and import/append it to the `CHAPTERS` list in `src/data/chapters/index.ts`.
- **How to add a minigame**: Follow the recipe in `docs/ADDING_A_MINIGAME.md` using the copyable template at `src/game/modes/_template/`.
