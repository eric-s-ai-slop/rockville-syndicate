> **ARCHIVED** — Historical planning/handoff doc. May not reflect current code; verify against the source before acting on any item.

# Rockville Syndicate Refactor Changes

This document details the complete architectural refactoring of the React 19 + Phaser 3.88 RPG, executed across multiple phases to make the codebase maintainable by AI agents and prepare it for modular minigame extensions.

---

## Phase 1: Split Chapter Data into Per-Chapter Config Files

Goal: Separate the monolithic `src/data/chapters.ts` file (~2,330 lines) into localized, chapter-specific files to reduce merge conflicts and memory limits during agent edits.

### Changes Made
- **Created `src/data/chapters/` Directory**:
  - Moved type definitions (`Speaker`, `MapTheme`, `MapRect`, `RoomLabel`, `MapConfig`, `ActorPlacement`, `ChoiceOption`, `Beat`, `ChapterConfig`) to [types.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/types.ts).
  - Moved the shared color palette constants to [palette.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/palette.ts).
  - Split all 9 chapters into individual config files:
    - [chapter1.spotify-insurgency.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter1.spotify-insurgency.ts)
    - [chapter2.operation-inertia.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter2.operation-inertia.ts)
    - [chapter3.red-pee-bladder-strike.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter3.red-pee-bladder-strike.ts)
    - [chapter4.jungle-gym-gambit.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter4.jungle-gym-gambit.ts)
    - [chapter5.florida-highway-duel.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter5.florida-highway-duel.ts)
    - [chapter6.ding-dong-ditch-ben.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter6.ding-dong-ditch-ben.ts)
    - [chapter7.spain-betrayal.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter7.spain-betrayal.ts)
    - [chapter8.the-cabin.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter8.the-cabin.ts)
    - [chapter9.pool-party.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/chapter9.pool-party.ts)
  - Created a barrel export file [index.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/index.ts) to preserve imports across consumers.
- **De-confused Namespace**:
  - Renamed `src/data.ts` to `src/data/entities.ts` to clear confusion between `src/data.ts` (entities) and the `src/data/` folder (chapters). Updated imports across all modules.

---

## Phase 2: Carve ChapterScene into Collaborators

Goal: Extract the major subsystems from the monolithic `src/game/ChapterScene.ts` (~3,900 lines) into independent collaborator classes, leaving the main scene class as a clean orchestrator.

### Changes Made
- **Extracted Systems to `src/game/scene/`**:
  - [MapBuilder.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/scene/MapBuilder.ts): Handles ground patterns, decor scattering, invisible walls, and prop placement.
  - [Actors.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/scene/Actors.ts): Handles actor sprite spawning, facing updates, and walking animations.
  - [AudioController.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/scene/AudioController.ts): Manages background and boss fight audio states.
  - [BeatEngine.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/scene/BeatEngine.ts): Dispatches and executes story beats (dialogue, choice, pans, etc.).
- **Updated `ChapterScene.ts`**:
  - Changed private engine fields to public.
  - Instantiated collaborator classes and delegated lifecycle hooks/method invocations to the respective subsystems.

---

## Phase 3: Define GameMode Contract + Minigame Beat

Goal: Build an extensibility seam inside the engine so new interactive segments (minigames) can be added cleanly as modular files without altering host scene code.

### Changes Made
- **Mode Specifications**:
  - Created [src/game/modes/types.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/modes/types.ts) defining:
    - `GameMode`: Interface implementing `preload`, `start`, `update`, and `teardown`.
    - `ModeContext`: Façade exposing strict scene API subsets to sandboxed modes.
  - Created [src/game/modes/index.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/modes/index.ts) barrel/registry containing registry maps, `registerMode`, and `getMode`.
- **Wired Beat Dispatcher**:
  - Added the `minigame` beat type to the `Beat` union.
  - Updated `BeatEngine.ts` to dispatch `minigame` beats, initialize the `ModeContext` façade, and forward per-frame scene updates.

---

## Phase 4: Port Boss Combat as the Reference Mode

Goal: Port the complex, inline boss combat code out of `ChapterScene.ts` to prove the `GameMode` contract design against a real-world scenario.

### Changes Made
- **Implemented `BossFightMode`**:
  - Created [src/game/modes/bossFight/index.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/modes/bossFight/index.ts) implementing `GameMode`.
  - Moved boss AI tick loops, projectile aiming, coin attacks, QTE pauses, boss music overrides, and custom HP bars into the modular class.
- **Cleaned Chapter Scene**:
  - Deleted all boss-specific fields (`bossHpBg`, `bossHpFill`, `bossShadow`, etc.) and attack functions (`unleashHeyAoE`, `teleportKidneyStrike`, `damageBoss`, etc.) from `ChapterScene.ts`.
  - Configured `BeatEngine.ts` to route the legacy `bossFight` beat type through the registered `bossFight` mode.

---

## Phase 5: De-hardcode the Pool Party & Remaining Special-Cases

Goal: Purge all hardcoded `this.chapter.id ===` checks from the scene and systems, representing chapter-specific quirks declaratively or via background modes.

### Changes Made
- **Introduced Declarative Chapter Settings**:
  - Extended `ChapterConfig` to support `cameraZoom`, `usePoolSheet`, `ambientSfx`, `chaseTextureSwaps`, and `poolNameplatesConfigs` parameters.
  - Set specific declarations in `chapter9.pool-party.ts` and `chapter6.ding-dong-ditch-ben.ts`.
  - Substituted ID checks in `ChapterScene.ts` and `MapBuilder.ts` with checks against these declarative configuration parameters.
- **Background Game Modes**:
  - Added support for a `background: true` minigame beat that starts a game mode concurrently without freezing the story progression.
  - Created [src/game/modes/poolParty/index.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/modes/poolParty/index.ts) implementing `PoolPartyMode` to handle the scripted dialogue and camera pan animations of Chapter 9 via modular hooks.
  - Cleaned up all pool party hardcoded barks and pans from `BeatEngine.ts` by delegating to active mode hooks.
  - Ensured active game modes are safely torn down on scene shutdown.

---

## Phase 6: Author the "Add a Minigame" Path & Safety Net

Goal: Make the future addition of minigames trivial, self-documenting, and statically verified against dangling database references.

### Changes Made
- **Template Mode**:
  - Created [src/game/modes/_template/index.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/modes/_template/index.ts) to serve as a copyable skeleton implementation.
- **Developer Guide**:
  - Created [docs/ADDING_A_MINIGAME.md](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/docs/ADDING_A_MINIGAME.md) as a complete tutorial on registering minigames, explaining the `ModeContext` API.
- **Characterization Tests**:
  - Overwrote [src/data/chapters.test.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters.test.ts) to include type-safety checks verifying that all chapters load, all `minigame` beats reference registered mode IDs, all `bossFight` beats reference valid entities, and choice `goto` paths resolve correctly. Mocked `phaser` in tests to ensure execution under standard Node JSDOM environments without requiring canvas dev libraries.
- **Project Guidelines**:
  - Created [CLAUDE.md](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/CLAUDE.md) at the root containing commands, layout directories, and permanent rules/gotchas.
  - Updated [ARCHITECTURE.md](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/ARCHITECTURE.md) to reflect the new modular project layout.
