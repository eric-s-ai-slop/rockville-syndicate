# Handoff: Restructure Project Omega for an Agent-Maintainable Minigame Architecture

> **This document is written for an AI coding agent (Gemini) executing cold, with no prior session context.** Read the whole thing before starting. Follow the Ground Rules at every step. Do the phases in order; each is an independently shippable PR that leaves the game fully playable.

---

## 0. Context — why this work exists

This repo (`project-omega_-the-rockville-syndicate`) is a web cozy-RPG: **React 19 + Phaser 3.88.2 (NOT Phaser 4) + Vite + TypeScript + Tailwind v4**. Gameplay is a linear sequence of story chapters; each chapter is a data-driven list of "beats" (dialogue, walk-to, boss fight, etc.) played by one Phaser scene.

**This repo will be maintained almost entirely by AI agents.** The goal is to make it *perfect for that future* and to enable a stream of new interactive **minigame** "game modes" inside chapters. Two things block that today:

1. **Two monster files no agent can safely edit within a read window:**
   - `src/game/ChapterScene.ts` — ~3,900 lines / 167 KB (everything: beat engine, boss combat, map building, prop rendering, audio, sprite handling).
   - `src/data/chapters.ts` — ~2,330 lines / 93 KB (all 9 chapters in one file).
2. **No extension seam for interactive content.** New interactive segments are bolted on as hardcoded `if (this.chapter.id === '...')` branches (there are **8** of them in ChapterScene, most for the pool party). Adding a minigame today means editing the giant scene *and* the closed `Beat` union — the opposite of localized.

**The encouraging part:** the design is already ~80% right. There is a clean data-driven beat dispatcher (`switch (beat.type)`) and `bossFight` is effectively an existing inline minigame. **This is an organizational refactor, not a rewrite.**

**Definition of "perfect for the future" (the bar to hit):** adding a new minigame becomes a *single-folder, localized* operation — implement a documented `GameMode` interface, register it in one index, reference it from a chapter's `beats` array — **with zero edits to the host scene**, type-checked, and guarded by a test that catches dangling references.

---

## 1. Ground Rules (apply to EVERY phase — do not skip)

### 1.1 Trust the repo, not this document's line numbers
Any line number or line range in this doc (e.g. "boss combat ≈ lines 2061–2900") was accurate when written but **will drift as you edit**. **Always re-locate code by `grep`/symbol search, never by trusting a line number here.** Verify with searches like:
```
grep -n "runBossFightBeat\|summonBossMatch\|handleBossAI\|fireWeapon" src/game/ChapterScene.ts
grep -n "switch (beat.type)\|case 'bossFight'" src/game/ChapterScene.ts
grep -n "this.chapter.id ===" src/game/ChapterScene.ts
```

### 1.2 Behavior must stay identical
Phases 0–2 are pure moves with **zero behavior change**. Phases 3–5 move behavior *behind a seam* but the player experience must be pixel-identical. If you can't prove equivalence, stop and leave a note rather than guessing.

### 1.3 Verify after every phase (Definition of Done, repeated per phase below)
- `npm run lint` → must be clean (this runs `tsc --noEmit`).
- `npm test` → vitest suite green (`progress.test.ts`, `SpritePreprocessor.test.ts`, `DialogueBox.test.tsx`, `chapters.test.ts`).
- `npm run e2e` → Playwright `e2e_tests/game.spec.ts` green.
- For phases that touch runtime behavior, **run the game** (`npm run dev`, port 3000) and play the affected slice. See §11 Verification.
- Commit each phase separately with a clear message. Branch off `main` first (do not commit straight to `main`).

### 1.4 Hard-won gotchas — violating these reintroduces real, already-fixed bugs
These are NOT documented in the code as comments; honor them during every extraction:

- **Never call a side effect inside a React `setState` updater.** The app is wrapped in `<StrictMode>` (`src/main.tsx`), which double-invokes updater functions in dev. A past bug: calling `done()`/`advanceBeat()` inside `setActiveStory(prev => …)` fired the beat advance twice and skipped every other beat. Pattern to keep: mirror state into a ref, read the ref, then run `setState(...)` and the side effect **outside** the updater. Any React→Phaser bridge callback must follow this. (See `src/components/GameLayout.tsx`.)
- **Canvas sizing is driven from the scene's `update()` loop** (`syncCanvasToParent()` every RAF frame), NOT from React. Phaser `Scale.RESIZE`, `ResizeObserver`, and `setInterval` all proved unreliable in headless/embedded contexts. Keep `syncCanvasToParent()` running every frame. The React-side ResizeObserver in `GameLayout.tsx` is a redundant backup — leave it.
- **Do NOT call `cameras.main.setBounds(0,0,1000,1000)`.** Black bars on wide viewports were fixed with `setBackgroundColor(0x16331a)` + an oversized grass rect + scattered trees beyond bounds. The player is confined by physics world bounds + perimeter walls, not camera bounds. Re-adding camera bounds reintroduces the framing bug.
- **Phaser overlap/collider callbacks: never trust argument position.** Identify the intended object by group membership, e.g. `this.projectiles.contains(a) ? a : b`. A past boss bug destroyed the boss instead of the projectile because of positional assumption.
- **Route all `add.text` through the `label()` helper** (applies `resolution: max(2, dpr*2)`). Raw `add.text` renders blurry.
- **Player sprites are drawn facing right;** `update()` sets `setFlipX(vx < 0)` for horizontal travel, and boss combat overrides flip to face the aim target. That override is intentional — preserve it.
- **`window.__OMEGA_GAME__`** exposes the Phaser game in dev (guarded by `import.meta.env.DEV` in `postBoot`). Use it from the browser console to inspect live scene state.
- **Dev server caches Vite transforms.** After editing, a full restart of `npm run dev` (port 3000) is more reliable than hot reload; verify served code with `curl localhost:3000/src/... | grep <symbol>`.

### 1.5 Preserve the public import surface
Do not break existing import specifiers. The exact surfaces to preserve are listed in §3 (Phase 1) and §4 (Phase 2). When you split a file, replace it with a barrel/`index.ts` at the **same module specifier** so consumers don't change.

---

## 2. Phase 0 — Repo hygiene & agent onboarding (fast, low risk, no behavior change)

Goal: a clean tree and a single authoritative guide so a cold agent orients in one read.

**0a. Untrack scratch/build artifacts** (keep files on disk, remove from git) and add to `.gitignore`:
- `tmp/` (scratch PNGs/JSON — currently tracked), `test-results/`, `test_preprocess.js`, `test_preprocess2.js`, `db_data/`, and `.DS_Store` everywhere.
- Use `git rm -r --cached <path>` so working-tree files survive. Confirm `dist/` is already ignored (verify with `git ls-files dist | head`).

**0b. Consolidate docs.** Today the root has overlapping planning docs: `ARCHITECTURE.md`, `HANDOFF.md`, `NEW_CHAPTER_FRAMEWORK.md`, `SCRATCHPAD.md`, `VISUAL_OVERHAUL_PLAN.md`, and `plans/sprint{1,2,3}/`. Reduce root clutter without losing content:
- Keep `README.md` (run/build/test).
- Refresh `ARCHITECTURE.md` to describe the **new** module layout produced by this refactor (do this at the END, after Phases 1–5 land, so it's accurate).
- Move `HANDOFF.md`, `NEW_CHAPTER_FRAMEWORK.md`, `VISUAL_OVERHAUL_PLAN.md`, `SCRATCHPAD.md`, and `plans/sprint*` into a `docs/history/` folder as reference. Do not delete the content.
- Move this file (`GEMINI_HANDOFF.md`) into `docs/history/` once the refactor is complete.

**0c. Create `CLAUDE.md` at the repo root** — the single highest-leverage artifact for an agent-run repo. It must contain:
- Stack + the rule "Phaser 3.88, NOT Phaser 4."
- The commands: `npm run dev` (port 3000), `npm run lint`, `npm test`, `npm run e2e`, `npm run build`.
- A "where things live" map (fill in after Phases 1–2 create the new layout).
- The complete §1.4 Gotchas list above (copy them verbatim — they must live in the repo permanently, not just in this handoff doc).
- Two pointers: **"How to add a chapter"** (→ `src/data/chapters/`, copy an existing chapter file, add to the index) and **"How to add a minigame"** (→ `docs/ADDING_A_MINIGAME.md`, created in Phase 6).

**Definition of Done (Phase 0):** `git status` shows the scratch files untracked; `npm run lint && npm test` still green; `CLAUDE.md` exists with the gotchas. No source code changed.

---

## 3. Phase 1 — Split the data into per-chapter files (no behavior change)

Goal: editing one chapter no longer requires opening a 2,330-line file.

**Convert `src/data/chapters.ts` → a `src/data/chapters/` directory:**
- `src/data/chapters/types.ts` — move the type/interface declarations: `Speaker`, `MapTheme`, `MapRect`, `RoomLabel`, `MapConfig`, `ActorPlacement`, `ChoiceOption`, `Beat`, `ChapterConfig`. Keep `resolveSpeaker` near `Speaker` (same file or a small `speakers.ts`).
- `src/data/chapters/palette.ts` — move the shared color palette const `C`.
- One file per chapter, named by id so an agent can find it by chapter name:
  - `chapter1.spotify-insurgency.ts`
  - `chapter2.operation-inertia.ts`
  - `chapter3.red-pee-bladder-strike.ts`
  - `chapter4.jungle-gym-gambit.ts`
  - `chapter5.florida-highway-duel.ts`
  - `chapter6.ding-dong-ditch-ben.ts`
  - `chapter7.spain-betrayal.ts`
  - `chapter8.the-cabin.ts`
  - `chapter9.pool-party.ts`
  > **Re-confirm chapter ids** by grepping the file (`grep -n "^  id:" src/data/chapters.ts`) — do not trust the list above blindly.
- `src/data/chapters/index.ts` — the **barrel**. Must export the **exact same public surface** the old file did so no consumer changes:
  - Re-export all types/interfaces from `./types` (and `resolveSpeaker`).
  - `export const CHAPTERS: ChapterConfig[] = [chapter1, chapter2, …, chapter9];` (preserve order — order drives the unlock sequence).
  - `export function getChapter(id: string): ChapterConfig | undefined`.
- The old import specifier `'../data/chapters'` resolves to the new `index.ts` automatically via Node/TypeScript directory resolution. **Do not change any consumer import.**

**Consumers that must keep working unchanged** (verify each still type-checks after the split):
- `src/components/ChapterSelect.tsx` — `import { CHAPTERS, ChapterConfig, MapTheme } from '../data/chapters'`
- `src/game/progress.ts` — `import { CHAPTERS } from '../data/chapters'`
- `src/game/progress.test.ts` — **`vi.mock('../data/chapters', …)`** ← mock path must still resolve
- `src/game/ChapterScene.ts` — `import { ChapterConfig, Beat, ActorPlacement, resolveSpeaker, MapConfig, CHAPTERS } from '../data/chapters'`
- `src/components/GameLayout.tsx` — `import { ChapterConfig } from '../data/chapters'`

**Note on import paths inside chapter files:** the current `src/data/chapters.ts` imports `CHARACTER_CLASSES, NPC_CHARACTERS` from `'../data'` (the root `src/data.ts`). From `src/data/chapters/chapterN.ts` that becomes `from '../../data'`. Verify this resolves correctly.

**Optional but recommended — de-confuse the data namespace:** the repo has BOTH `src/data.ts` (a file: characters, bosses, weapons, enemies, loot, lore) AND `src/data/` (a directory: chapters). This dual `data` name is confusing for agents. Consider renaming `src/data.ts` → `src/data/entities.ts`. Only **3** import sites reference it — update all three:
- `src/components/GameLayout.tsx`: `from '../data'` → `from '../data/entities'`
- `src/game/ChapterScene.ts`: `from '../data'` → `from '../data/entities'`
- Per-chapter files: `from '../../data'` → `from '../../data/entities'` (or `from '../entities'` if flat inside the dir)

After the rename: `grep -rn "from '.*['\"]data['\"]" src` must return nothing stale. If the rename feels risky, skip it — the architecture works either way.

**Definition of Done (Phase 1):** `npm run lint && npm test && npm run e2e` green; `CHAPTERS` still contains all chapters in order; chapter select screen and a chapter playthrough behave identically (§11).

---

## 4. Phase 2 — Carve `ChapterScene` into a host + systems (no behavior change)

Goal: the scene becomes a thin orchestrator; each subsystem is independently readable. **This is mechanical extraction — move code, keep behavior exactly.**

First, re-map the file (line numbers differ from when this was written — re-grep):
```
grep -nE "^\s*(private|public|protected) " src/game/ChapterScene.ts   # method inventory
grep -n "switch (beat.type)" src/game/ChapterScene.ts                 # the beat dispatcher
```

Create `src/game/scene/` and extract cohesive blocks into focused modules. Two viable extraction styles — pick whichever keeps `tsc` happiest with least churn:
- **(Preferred) Collaborator classes** constructed with a reference to the scene: `new MapBuilder(scene).build(map)`. The collaborator reaches scene services through the passed reference.
- **(Alternative) Free functions** taking the scene: `buildMapFromConfig(scene, map)`.

**Modules to extract** (group by responsibility — verify by reading, not by trusting these names):

- **`src/game/scene/MapBuilder.ts`** — `buildMapFromConfig`, `buildNeighborhoodMap`, `scatterNature`, `drawFloorLines`, `drawDecorativeRect`, prop/furniture placement, the large `switch` over prop types (`couch`/`tv`/`desk`/`counter`/`sink`/`fridge`/`door`/`car`/`tree`/`bed`/`bench`/`firepit`/`hottub`/`arcade`, …) and the theme `switch` (`apartment`/`hospital`/`highway_night`/`park`/`florida`/…).

- **`src/game/scene/Actors.ts`** — actor/sprite spawning, facing/flip (`setFlipX`) logic.

- **`src/game/scene/AudioController.ts`** — `loadChapterAudio`, `preloadNextChapterAudio`, `startBossMusic`/`startBossLoop`/`stopBossMusic`, `safeLoadAudio`. Compose the existing `src/game/audio.ts` and `src/game/uiSound.ts` rather than duplicating them.

- **`src/game/scene/BeatEngine.ts`** — **the seam Phase 3 plugs into.** Owns `runBeat`/`advanceBeat`/`gotoBeatId` and the simple beat handlers: `dialogue`, `choice`, `walkTo`, `cameraPan`, `wait`, `ledger`, `endChapter`. Keep the existing `switch (beat.type)` shape — extend it in Phase 3, don't rewrite it now.

- **`ChapterScene.ts` (what remains)** — `preload()` → `create()` (instantiate + wire the systems above) → `update()` (delegate to systems each frame, including `syncCanvasToParent()` and forwarding to any active mode). Target: well under ~800 lines.

**Public surface to preserve:** `ChapterScene` is the default export consumed by `src/components/GameLayout.tsx` as `import ChapterScene, { StoryDialoguePayload } from '../game/ChapterScene'`. Keep both the default export and the named `StoryDialoguePayload` export. The React↔Phaser bridge fields (`onTriggerQTE`, the dialogue payload callbacks, etc.) must keep the same shape.

**Watch items during extraction:**
- Anything reading `this.chapter.id ===` — leave these 8 branches WHERE THEY ARE for now; Phase 5 removes them. Do not conflate changes.
- `syncCanvasToParent()` must keep running every `update()` frame (§1.4 gotcha).
- Overlap callbacks keep their group-membership identification logic (§1.4 gotcha).

**Definition of Done (Phase 2):** `npm run lint && npm test && npm run e2e` green; `ChapterScene.ts` is dramatically smaller; play Ch1 dialogue + boss + Ch9 pool party and confirm identical behavior (§11).

---

## 5. Phase 3 — Define the `GameMode` contract + `minigame` beat (the core deliverable)

Goal: create the seam that makes minigames a single-folder operation. **Add the seam; don't use it yet — boss fight ports in Phase 4.**

Create `src/game/modes/`:

**`src/game/modes/types.ts`** — the interface every minigame implements:
```ts
export interface ModeResult { outcome?: 'win' | 'lose' | 'skip'; data?: unknown; }

export interface GameMode<Cfg = unknown> {
  id: string;
  /** Register assets needed by this mode (called during scene preload). */
  preload?(ctx: ModeContext): void;
  /** Begin the mode. Call onComplete exactly once when the mode resolves. */
  start(ctx: ModeContext, config: Cfg, onComplete: (result: ModeResult) => void): void;
  /** Per-frame tick while the mode is active (forwarded from scene update()). */
  update?(time: number, delta: number): void;
  /** Restore the scene to story state (remove sprites, listeners, UI). */
  teardown(): void;
}
```

**`ModeContext`** — the controlled façade. Exposes ONLY safe scene services so modes never reach into scene internals (this isolation is the whole point). Design it by listing what boss combat currently touches on `this` (grep boss methods for `this\.`) and exposing exactly those, nothing more. Minimum the boss fight will need: the player sprite, the camera, an arena/bounds rect, a `spawnSprite` helper, the physics group helpers, the `label()` text helper, the audio controller, and the dialogue/QTE bridge.

**`src/game/modes/index.ts`** — the **registry**, the one place a mode is registered:
```ts
import type { GameMode } from './types';
const registry = new Map<string, GameMode>();
export function registerMode(m: GameMode) { registry.set(m.id, m); }
export function getMode(id: string): GameMode | undefined { return registry.get(id); }
// register built-ins here (bossFight added in Phase 4, poolParty in Phase 5)
```

**Add one beat to the union** in `src/data/chapters/types.ts`:
```ts
| { type: 'minigame'; modeId: string; config?: unknown; introLines?: string[] }
```

**Wire `BeatEngine`** to dispatch it: on a `minigame` beat, look up `getMode(beat.modeId)`, build the `ModeContext`, call `mode.start(ctx, beat.config, (result) => { mode.teardown(); advanceBeat(); })`. Forward the scene's `update(time, delta)` to the active mode's `update`. Guard against an unknown `modeId` (log + advance beat, never hard-crash the chapter).

**Definition of Done (Phase 3):** `npm run lint && npm test` green; the seam compiles and is unused; no chapter references `minigame` yet so runtime is unchanged. (`npm run e2e` still green.)

---

## 6. Phase 4 — Port boss combat as the reference mode (behavior identical)

Goal: prove the contract against real, complex behavior and delete the single biggest inline block.

Re-locate boss combat by symbol (NOT line number):
```
grep -n "runBossFightBeat\|summonBossMatch\|handleBossAI\|fireWeapon\|fireBossCoinAttack\|startBossMusic\|updateBossHpBar\|bossBeatResolve\|isBossActive" src/game/ChapterScene.ts
```

Move all of it into `src/game/modes/bossFight/` (e.g. `index.ts` + helper files) implementing `GameMode`:
- `start()` ← body of `runBossFightBeat`/`summonBossMatch` (spawn boss, HP bar, arena constraint, intro bark).
- `update()` ← `handleBossAI` + projectile/aim logic.
- `teardown()` ← boss/HP-bar/music cleanup; restore story state.
- Move boss-specific state (`spawnedBoss`, `currentBossHp`, `bossData`, `projectiles`, HP-bar objects, boss music handles) onto the mode instance, accessed via `ModeContext` where scene services are needed.
- **Preserve the QTE bridge** (`onTriggerQTE`) and the rule that combat fully pauses while the React QTE modal is open.
- **Preserve the overlap/collider group-membership identification** (§1.4) and the aim-facing flip override (§1.4).

**Keep the existing `bossFight` beat working** so chapters need NO edits: in `BeatEngine`, treat `case 'bossFight':` as sugar that routes through the registry with the boss config mapped to the mode's `Cfg`. The `bossFight` beat type stays in the `Beat` union. Register the mode in `src/game/modes/index.ts`.

**Definition of Done (Phase 4):** `npm run lint && npm test && npm run e2e` green; **play Ch1's boss fight end-to-end** and confirm pixel-identical — HP bar, combat barks, QTE modal pause, music, projectile aim/flip, victory → next beat. This is the highest-risk phase; verify hardest (§11).

---

## 7. Phase 5 — De-hardcode the pool party & remaining special-cases

Goal: remove the branches that motivated this whole effort. **End state: zero `this.chapter.id ===` checks in the scene.**

Find every instance (re-grep, do not trust counts from this doc):
```
grep -n "this.chapter.id ===" src/game/ChapterScene.ts
```

Known cases at time of writing: ~6 for `suds_and_soles_pool_party` (camera zoom 1.35 vs default 2.0, swim zones, submerged idle/swim frames, pool-sheet handling) and ~2 for `ding_dong_ditch_ben` (door knock SFX). Classify each branch:

- **Rendering/config difference** (zoom, swim zones, submerged frames, knock SFX) → add a **declarative field** to `ChapterConfig` in `types.ts` and read it generically in the host scene. Examples: `camera?: { zoom?: number }`, `swimZones?: MapRect[]`, `ambientSfx?: { onDoor?: string }`. Set the field on the relevant chapter file; delete the `if`.
- **Interactive playable behavior** (pool-party mechanics that go beyond config) → a `poolParty` `GameMode` under `src/game/modes/poolParty/`, triggered by a `minigame` beat in `chapter9.pool-party.ts`. Register it in the modes index.

After this phase: `grep -n "this.chapter.id ===" src/game/ChapterScene.ts` must return **nothing**.

**Definition of Done (Phase 5):** zero `this.chapter.id ===` matches; `npm run lint && npm test && npm run e2e` green; **play Ch9 pool party** and confirm identical zoom/rendering/swim behavior; **play Ch6 ding dong ditch** and confirm the knock SFX still fires (§11).

---

## 8. Phase 6 — Author the "add a minigame" path + safety net

Goal: make the future-add trivial and self-checking for the next agent.

- **`src/game/modes/_template/`** — a minimal, copy-me `GameMode` (e.g. a trivial "press SPACE within 3s to win" mode) with thorough inline comments explaining each method. This is the canonical example new agents start from.

- **`docs/ADDING_A_MINIGAME.md`** — a cold-agent recipe:
  1. Copy `src/game/modes/_template/` to `src/game/modes/<yourMode>/`.
  2. Implement `id` + the 4 methods (`preload`, `start`, `update`, `teardown`).
  3. Call `registerMode(yourMode)` in `src/game/modes/index.ts`.
  4. Add a `{ type: 'minigame', modeId: '<yourMode>', config: {...} }` beat to the desired chapter in `src/data/chapters/`.
  5. Run `npm run lint && npm test`, then `npm run dev` and play it.
  Include the full `ModeContext` API available to modes. Link from `CLAUDE.md`.

- **Characterization test** — extend `src/data/chapters/chapters.test.ts` to assert, for every chapter and every beat:
  - `minigame` beats reference a `modeId` registered in the registry.
  - `bossFight` beats reference a `bossId` that exists in `BOSSES` (from `src/data/entities.ts` or `src/data.ts`).
  - Any `goto`/beat-id references resolve to a real beat `id` in that chapter.
  - The full `CHAPTERS` set loads without throwing.
  This catches the most common agent-introduced regression (dangling reference) without a full WebGL render.

- **Refresh `ARCHITECTURE.md` and the `CLAUDE.md` "where things live" map** to reflect the final layout.

**Definition of Done (Phase 6):** the characterization test fails when you deliberately point a beat at a non-existent `modeId` (prove it catches it), then passes once corrected; `_template` mode can be wired into a throwaway beat and run; docs updated; full `npm run lint && npm test && npm run e2e` green.

---

## 9. Target end-state layout

```
src/
  data/
    entities.ts                      # (renamed from src/data.ts — optional but recommended)
    chapters/
      index.ts                       # barrel: CHAPTERS, getChapter, re-exports all types
      types.ts                       # Beat (now incl. 'minigame'), ChapterConfig, MapConfig, …
      palette.ts                     # shared color palette const C
      chapter1.spotify-insurgency.ts
      chapter2.operation-inertia.ts
      … (one file per chapter)
      chapter9.pool-party.ts
  game/
    ChapterScene.ts                  # thin host: preload → create (wire systems) → update (delegate)
    scene/
      BeatEngine.ts                  # beat dispatch + simple beat handlers + minigame routing
      MapBuilder.ts
      Actors.ts
      AudioController.ts
    modes/
      types.ts                       # GameMode<Cfg>, ModeContext, ModeResult
      index.ts                       # registry: registerMode / getMode
      bossFight/                     # reference mode — ported boss combat
      poolParty/                     # replaces pool-party hardcoded branches
      _template/                     # copy-me example for new minigames
    SpritePreprocessor.ts            # unchanged
    PropExtractor.ts                 # unchanged
    furnitureCatalog.ts              # unchanged
    packSpriteAtlas.ts               # unchanged
    audio.ts                         # unchanged (composed by AudioController)
    uiSound.ts                       # unchanged (composed by AudioController)
    progress.ts                      # unchanged

CLAUDE.md          ← agent entry point (stack, commands, gotchas, how-to pointers)
ARCHITECTURE.md    ← refreshed at end of Phase 6
README.md          ← run/build/test (keep as-is)
docs/
  ADDING_A_MINIGAME.md
  history/         ← HANDOFF.md, SCRATCHPAD.md, VISUAL_OVERHAUL_PLAN.md, plans/, GEMINI_HANDOFF.md
```

---

## 10. Reuse — do NOT reinvent these

- The existing `switch (beat.type)` dispatcher is the model — **extend** it, don't replace it.
- `SpritePreprocessor.ts`, `PropExtractor.ts`, `furnitureCatalog.ts`, `packSpriteAtlas.ts` are already well-factored — leave them; expose what modes need via `ModeContext`.
- `progress.ts`, `audio.ts`, `uiSound.ts` stay; `AudioController` composes them.
- The `label()` text helper lives in ChapterScene — expose it via `ModeContext`; don't duplicate it.
- Existing vitest + Playwright tests are the regression gate — extend, don't rewrite.

---

## 11. Verification playbook

1. `npm run lint` (`tsc --noEmit`) — after every edit, not just at phase end.
2. `npm test` (vitest) — `progress.test.ts`, `SpritePreprocessor.test.ts`, `DialogueBox.test.tsx`, `chapters.test.ts`.
3. `npm run e2e` — Playwright `e2e_tests/game.spec.ts`.
4. **Manual play** (`npm run dev`, http://localhost:3000):
   - **Ch1** — dialogue flow + the boss fight (most important after Phase 4): HP bar, barks, QTE modal pause, music, projectile aim/flip, victory → next beat.
   - **Ch9 pool party** (after Phase 5) — camera zoom 1.35 unchanged, swim zones, submerged frames render correctly.
   - **Ch6 ding dong ditch** (after Phase 5) — door-knock SFX fires.
   - Take a screenshot at each checkpoint as before/after evidence.
5. Dev server caches Vite transforms — restart `npm run dev` after edits and confirm with `curl localhost:3000/src/... | grep <symbol>`. Use `window.__OMEGA_GAME__` in the browser console to inspect live scene state.

---

## 12. Sequencing & risk summary

| Phase | Risk | Notes |
|---|---|---|
| 0 — Hygiene + CLAUDE.md | Low | No source changes; fast win |
| 1 — Split chapters.ts | Low | Pure file moves; barrel preserves surface |
| 2 — Carve ChapterScene | Medium | Large mechanical move; verify with e2e + play |
| 3 — GameMode seam | Low | Adds unused seam; no runtime impact |
| 4 — Port boss combat | High | Real behavior moves; verify hardest in running game |
| 5 — De-hardcode branches | High | Real behavior moves; verify pool party + knock SFX |
| 6 — Template + tests | Low | Docs + safety net |

Each phase is its own PR/commit, branched off `main`, leaving the game fully playable. Never combine Phase 4 (boss port) or Phase 5 (pool-party de-hardcode) with unrelated cleanup — keep diffs reviewable.

Throughout: the §1.4 gotchas are non-negotiable. Re-locate all code by `grep`/symbol search — never trust line numbers in this document.
