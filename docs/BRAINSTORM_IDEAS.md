# Brainstorming: Future Improvements

Triaged 2026-07-04 against the actual codebase. Items below are grouped by verdict; do not act on 'Rejected' items.

## ✅ Implemented (2026-07-04)

### 2. Boss AI Finite State Machine (FSM)
**Done as:** `src/game/modes/fsm.ts` — generic `FSM<S>` class (enter/update/exit per state).
Adopted in `bossFight/index.ts` (`CHASE | QTE | DEFEATED`, replacing scattered `ctx.qteActive`
checks — the QTE state's enter/exit hooks still mirror `ctx.qteActive` since other
subsystems read that flag directly) and in `swarmSurvival/index.ts` (`CHASE | STUNNED` per
enemy — a landed non-lethal hit now genuinely freezes the enemy for `STUN_MS`, not just a
cosmetic tween).

### 3. Gamepad / Controller Support
**Done as:** `input: { gamepad: true }` in the `GameLayout.tsx` game config. Left
stick/D-pad drives movement and the A button dashes, wired through
`ChapterScene.update()` → `PlayerController.update()` (edge-detected via
`gamepadDashWasDown`, alongside the existing keyboard path). Dialogue advance/choice
selection polls the raw browser Gamepad API directly in `DialogueBox.tsx` (button 0 =
advance, buttons 1-4 = choices), since that's a React overlay outside the Phaser scene.

### 4. Hit Stop (Combat Polish)
**Done as:** `src/game/modes/hitStop.ts` — slows `physics.world.timeScale` +
`tweens.timeScale` (deliberately not `scene.time`, so delayedCall timers like tint-flash
clears stay on schedule) for ~70ms, restored via a raw `setTimeout`. Paired with the
existing heavy-hit shakes in `ChapterScene.damagePlayer` and `bossFight.damageBoss`.
`swarmSurvival`'s enemies move by hand (not Arcade physics), so they get a local
delta-scaling variant instead (`hitStopRemainingMs` in `update()`).

### 6. Per-speaker Voice Blips
**Done as:** `speakerBasePitch()` in `DialogueBox.tsx` — hashes `speakerName` (no
`speakerId` is threaded down to this component, but the name is already unique per
character) into a consistent 0.75x-1.25x base pitch, randomized ±6% per blip to avoid
fatigue. No new audio assets — reuses the existing 12-voice `DIALOG_BLIP_URL` pool.

## 🕗 Deferred — maybe later

### 7. CRT / Vignette Post-Processing Shaders
**The Problem:** The game uses standard pixel-art rendering, which looks great, but could use more atmosphere in dark or intense moments.
**The Solution:** Implement a post-processing pipeline using Phaser 3's WebGL shaders. Adding a subtle CRT scanline effect, color aberration, or a dark vignette edge (especially for horror-themed chapters like the *Cabin from Hell*) would make the aesthetic feel extremely premium.
**Status:** Scope to per-chapter vignette first; full CRT scanlines may conflict with DPR-scaled text rendering via `label()` helper. Revisit after shipping a prototype.

### 10. Telemetry & Analytics (The "Blind Spot" Fix)
**The Problem:** You don't know where players are struggling or rage-quitting (e.g., if a boss is too hard or a puzzle is confusing).
**The Solution:** Instrument lightweight, privacy-respecting telemetry (like PostHog or a custom backend endpoint). Track specific funnel events: `chapter_started`, `dialogue_skipped`, `boss_failed`, `minigame_won`. This data creates a dashboard showing exactly where your difficulty spikes are, allowing you to rebalance encounters based on actual player data rather than guessing.
**Status:** Only worth pursuing if the game has real external players. Requires a privacy/consent decision first.

### 5. Mobile Virtual Joystick
**The Problem:** The game requires a physical keyboard to play, completely locking out mobile and tablet users.
**The Solution:** Detect touch capabilities on boot and render a virtual D-Pad and action buttons over the Phaser canvas. Phaser's pointer events make mapping on-screen UI buttons to player velocity straightforward.
**Status:** The joystick component itself is straightforward. The real cost: touch UI across all 12+ minigames, mobile-responsive React dialogue, and comprehensive mobile canvas-sizing testing across devices.

## ❌ Rejected — do not implement

### 1. Lazy-Loading Chapters (Dynamic Imports)
**The Problem:** Currently, `src/data/chapters/index.ts` statically imports every single chapter file at boot (e.g. `import chapter11 from './chapter11.cabin-from-hell'`). As the game scales and more massive chapters are added, the initial Javascript bundle size will bloat significantly, leading to slower first-paint times.
**Reason:** All chapter source combined is ~190 KB, negligible vs. the Phaser runtime. Dynamic imports would complicate chapter loading without meaningful performance gain.

### 8. State-Management Driven Architecture (Zustand/Redux Bridge)
**The Problem:** Bridging React (UI) and Phaser (Engine) via `useEffect` refs and window object listeners is prone to race conditions and React StrictMode lifecycle double-fire bugs.
**Reason:** The React StrictMode double-fire bug cited here is already fixed and codified as the ref-mirroring pattern in `CLAUDE.md`. A full rewrite of a working, battle-tested bridge is not justified.

### 9. Entity Component System (ECS) for Minigames
**The Problem:** As you add more complex modes (`bossFight`, `swarmSurvival`), relying on massive `update()` loops and standard inheritance leads to monolithic "god classes" that are impossible to maintain.
**Reason:** Conflicts with the approved agent-maintainable template-based GameMode direction. An ECS is overkill for ~12 small, independent minigame modes; the template pattern achieves the same decoupling at a fraction of the complexity.
