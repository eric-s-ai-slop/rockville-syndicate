# SCRATCHPAD — Project Omega: The Rockville Syndicate

This file is the working notepad for the current agent session. Updated as work progresses.
For canonical next-steps, see `HANDOFF.md`. For phase specs, see `VISUAL_OVERHAUL_PLAN.md`.

---

## Session start: 2026-06-12

---

## CURRENT TASK: P0 — Boss Fight Soft-Lock

### Bug summary
Chapter 1 soft-locks after the Eric boss-intro cinematic. The player is frozen staring at an
empty room. `beatIndex: 9, beatActive: true, dialogueOpen: true, isBossActive: false` — meaning
`freeze()` ran but `summonBossMatch` never fired.

### Root cause (confirmed)
`runBossFightBeat` → `launchFight()` hangs the entire downstream sequence on `cam.pan()`'s
callback firing with `p === 1`.

**The callback never fires `p === 1` in some cases:**
- If the camera is already positioned at or very near `(ax, ay)`, Phaser's pan tween may
  complete instantly or skip the `p === 1` tick entirely (fires `p < 1` then jumps past 1).
- Chapter 1 arena: `beat.arena` is likely undefined or camera already nearby, making `ax/ay`
  equal to current position → pan duration effectively 0 → callback fires at `p = 0` or `p = 1`
  in the same tick before the callback registration finishes.

**Call chain that hangs:**
```
launchFight()
  freeze()
  showLetterbox()
  cam.stopFollow()
  cam.pan(ax, ay, 550, ..., callback)  ← this callback may never reach p===1
    [HUNG HERE — everything below never runs]
    → name-slam labels
    → delayedCall(900) → hideLetterbox(300)
    → delayedCall(320) → startFollow + unfreeze() + summonBossMatch()
```

**Secondary bug (Suspect B):** Name-slam labels use `cam.midPoint.x/y` (world coords) with
`.setScrollFactor(0)` (screen-space rendering). With 2× zoom these land off-screen. Fix: use
`cam.width / 2` and `cam.height / 2` for screen-space coords.

**Suspect C:** `freeze()` is called twice on the intro path:
  1. Before the VS dialogue (`this.freeze()` at line ~1182)
  2. Again inside `launchFight()` at line ~1141
  `freeze()` is idempotent (just pauses physics + sets flag), so harmless. `unfreeze()` is only
  called once (inside `launchFight`'s delayed chain) — pairing is fine.

### Fix (implemented ✅)
**In `launchFight()`:** Remove the pan callback dependency. Fire the name-slam sequence via a
`delayedCall(550, ...)` timed to match the pan duration, with a `delayedCall(100, ...)` safety
margin added (total 650ms). The pan still plays visually; the sequence just no longer waits for
`p === 1` to tick.

**Label coords fixed:** `cam.midPoint.x/y` → `cam.width / 2` (nameLabel) and same for titleLabel.
Both already have `setScrollFactor(0)` so screen-space placement is correct now.

**Also check:** `runCameraPanBeat` uses the same `progress === 1` pattern. Added a watchdog
`delayedCall` fallback there too (belt-and-suspenders: callback still fires if it reaches 1,
but a timer also fires if it doesn't within `durationMs + 200ms`).

### Verification
- [x] `npx tsc --noEmit` — zero errors
- [x] Logic review: `delayedCall(550)` fires unconditionally; pan still plays visually
- [ ] Full interactive play-through: Ch1 boss fight start → finish (blocked by preview canvasH=0 issue)
- [ ] Confirm letterbox cleans up after `cameraPan` beats (Ch2/Ch5)
- [ ] Confirm damage numbers appear in Eric fight
- [ ] Repeat smoke-test for Ch3, Ch5, Ch6, Ch7 bossFight beats

**Preview environment note:** `canvasH=0` in the preview container prevents full interactive testing.
`window.__OMEGA_GAME__` also unavailable (likely `import.meta.env.DEV` scope issue in preview).
Logic and TS compilation verified. Visual test should be done in a real browser (open http://localhost:3000).

---

---

## FIX 2 — DialogueBox: choices never appeared on choice beats

**Bug:** On any `choice` beat, pressing Space did nothing while the prompt was typing.
Choices only appeared after the full typewriter animation (~600ms), but the user pressing
Space (their trained "advance" key) saw no effect and thought the game was stuck.

**Root cause:** The keyboard handler checked `if (showChoices) return` BEFORE checking
for Space, so Space was swallowed without doing anything. `showChoices` is true from the
start of a choice beat (it depends on being on the last line, which is always true for a
single-prompt choice beat).

**Fix (`src/components/DialogueBox.tsx`):**
- Extracted `skipTypewriter()` helper — clears interval, sets full text, returns whether
  it actually did anything
- Reordered `handleAdvance`: `skipTypewriter()` runs first; only then checks `showChoices`
- Reordered keyboard handler: Space/Enter/E always call `handleAdvance` first (regardless
  of `showChoices`), then number keys are checked for choices

**Result:** One Space press instantly skips the typewriter and shows choices. Second Space
press (while choices are visible) correctly does nothing — user must press 1/2/3.

---

## WORK QUEUE (from HANDOFF.md §2)

| # | Task | Status |
|---|------|--------|
| 0 | P0 — Fix boss fight soft-lock (`runBossFightBeat`) | ✅ Fixed + TS clean |
| 1 | Phase D QA sweep (letterbox cleanup, title card, damage numbers) | ⬜ Pending |
| 2 | Phase E — Audio (stage music, SFX, mute toggle) | ✅ Done — TS clean, 🔊 in header |
| 3 | Phase A revisit — LimeZu real tilesets for interiors | ⬜ Pending |
| 4 | Phase F — UI skin (pixel font, portraits, title polish) | ✅ Done — font-display everywhere, theme accent strips, GameScene.ts deleted |
| 5 | Bug: Eric "freezes character" = StrictMode double-advance | ✅ Fixed + verified live |
| 6 | Bug: player sprite not facing movement direction | ✅ Fixed + verified live |
| 7 | Bug: boss sprites rotate around center | ✅ Fixed — setFlipX in handleBossAI |
| 8 | Bug: boss keeps attacking during QTE (Audrey kills you) | ✅ Fixed — qteActive gate + damagePlayer guard |
| 9 | Jordan & Maharko map sprites + portraits | ✅ Wired into heroIds pipeline |
| 10 | Michael using Ben's sprite | ✅ boss_ben texture → micheal_bersofsky.jpg |

---

## ROADMAP IMPLEMENTATION (2026-06-12, 2nd session)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| R1 | Furniture & per-stage prop sprites | ✅ Done | propKey on MapRect; `drawPropShape`/`drawDecorativeRect` check propKey first; hospital bed/IV/toilet/jungle gym/watchwater wired; door-open swap on bossFight in Ch6 |
| R2 | Crew cars | ✅ Done | jordan's mustang (Ch5), maharko's camero (Ch5), nick f's corolla (Ch2) — propKey on map rects |
| R3 | Boss music: Prowler one-shot → Techno-Tetris loop | ✅ Done | `startBossMusic` plays boss_sting once (on:complete → `startBossLoop`); `stopBossMusic` kills both; `BOSS_LOOP_URL` in audio.ts |
| R4 | Idle NPCs cycling frames | ✅ Done | `placeActors()` now calls `s.setFrame(0)` instead of `.play('idle_...')` for all NPCs |
| R5 | Roster presence: keep pick, fill gap | ✅ Done | `understudyId?` on `ActorPlacement`; `placeActors()` swaps renderAs when player matches; Eric added to Ch2 & Ch6; all main actor slots have understudyIds across Ch1–Ch7 |
| R6 | Full 8-bit/Pokémon UI overhaul + shield icon | ✅ Done | Public Pixel font added to index.css; `pixel-panel` / `font-pixel` CSS classes; DialogueBox rebuilt (solid bg, double border, nameplate chip, blinking ▼); QTE modal 8-bit; chapter-complete & game-over overhauled; shield.jpg replaces ShieldAlert |
| R7 | Linear Story vs Free Play mode | ✅ Done | `Progress.freePlay` in progress.ts; `isChapterUnlocked` accepts freePlay param; `setFreePlay()` helper; ChapterSelect toggle (pill switch) + localStorage persist; GameLayout passes state down |
| R8 | Michael chase phase before Ch6 fight | ⏭️ SKIPPED | Complex: requires new beat type, chase AI, transition to bossFight, timing logic — high breakage risk. Document for next agent: add `{ type:'chase', pursuerId, durationMs }` to Beat union, handle in startBeat(), boss spawns invulnerable, contact = soft knockback, resolves via timer → existing bossFight intro. |

## NEXT ROADMAP (R8–R19) — see HANDOFF.md §3 (handed off, NOT implemented)

User asked for a roadmap-only handoff. Three new **P0** items captured with verified findings:
- **R9** kill all rounded corners (`rounded-*` in components, `RoundedRect` in ChapterScene) → square bit aesthetic.
- **R10** Yoster Island as the ONE global font. Asset: `src/assets/fonts/yoster-island/yoster.ttf` (**TTF only**, no
  woff). Must also load it for the Phaser canvas (`document.fonts.load`) or in-world text falls back to system font.
- **R11** Ben's house renders the whole 1492×704 contact sheet. Extract the **FULL SCENE (FRONT VIEW)** panel:
  crop box **(22, 22, 690, 312)** → 668×290, verified clean (no labels/grid), door-open light spill visible. Two
  approaches in HANDOFF: (A) Phaser texture frame `tex.add('scene',0,22,22,668,290)` — preferred, no asset change;
  (B) pre-crop with Pillow (now installed locally) into new files. Crop is landscape ~2.3:1 — don't stretch into the
  280×280 square rect; render larger/landscape, keep the physics body unchanged.
Plus R8 chase phase (P1) and R12–R19 (quick cleanups + polish) all specced in HANDOFF §3.

## Implementation details (R1–R7, this session)
- **audio.ts**: Added `BOSS_LOOP_URL` (Techno-Tetris); `BOSS_MUSIC_URL` retained as Prowler sting alias
- **ChapterScene.ts**: 
  - New imports: 10 prop/car images via `?url`
  - New fields: `bossMusicSting`, `propSprites: Map<string, Image>`
  - `init()` resets both new fields
  - `preload()` loads all 10 prop images + boss_sting + boss_loop
  - `buildMapFromConfig` passes `r.propKey` to add/draw functions
  - `addMapObject`, `drawPropShape`, `drawDecorativeRect` accept + use propKey
  - `placeActors()` handles understudy + static frame
  - `startBossMusic()` → sting (once) → `startBossLoop()` (loop)
  - `stopBossMusic()` kills sting + loop separately
  - `runBossFightBeat()`: swaps prop_watchwater → prop_watchwater_open for Ch6
  - Shutdown handler also destroys `bossMusicSting`
- **chapters.ts**: `ActorPlacement.understudyId?`; propKeys on 9 rects across Ch2–Ch6; Eric added to Ch2/Ch6 actors; understudyIds on Ch1–Ch7 actors
- **progress.ts**: `Progress.freePlay?`; `isChapterUnlocked(id, completed, freePlay?)` updated; `setFreePlay(bool)` exported
- **ChapterSelect.tsx**: Free Play toggle (pill switch with useState); `isChapterUnlocked` receives localFreePlay
- **GameLayout.tsx**: `freePlay` state derived from localStorage; passed to ChapterSelect; shield.jpg import replaces ShieldAlert
- **DialogueBox.tsx**: Full Pokémon-style rebuild — pixel-panel, font-pixel, nameplate chip, blinking ▼ cursor
- **index.css**: Public Pixel font-face; `--font-pixel` CSS var; `pixel-panel`, `pixel-panel-dark`, `pixel-blink`, `font-pixel` utility classes

---

## BUG FIX (2nd session) — "Eric freezes character" was a beat-skip, not a freeze

**Real root cause (NOT the boss fight — that was already fine):** `advanceStory`/`chooseStory`
in `GameLayout.tsx` called `prev.done()` **inside the `setActiveStory` updater**. The app is
wrapped in `<StrictMode>`, which double-invokes state updaters in dev → `done()` → `advanceBeat()`
fired **twice**, skipping one beat each dialogue. Because the skipped beats were `walkTo` beats,
the engine landed on the wrong beat with a **stale `walkTarget`** still set → desynced, soft-lock-
feeling confrontation with Eric.

Reproduced live via `__OMEGA_GAME__` + click-driving the dialogue:
- Before fix: `b0->b2` (skipped walkTo b1), `b2->b5` (skipped ledger+dialogue)
- After fix: `b0->b1->b2->b4->b5->b6->b7` — every transition advances exactly one beat.

**Fix:** Mirror `activeStory` into `activeStoryRef`; in advance/choose, read the ref, compute the
next state, then call `setActiveStory(...)` and `cur.done()` **outside** any updater. Null the ref
before calling `done()` so a re-entrant call is idempotent. Side effects must never live in a
setState updater.

**Sprite facing fix (`ChapterScene.ts` update()):** added `setFlipX(vx<0 ? true : vx>0 ? false :
keep)` before the dash/attack branch. Sprites are drawn facing right. Verified: vx=-150→flipX=true,
vx=+150→flipX=false. (Note: during boss combat `fireWeapon` overrides flip to face the aim target —
that's intentional.)

---

## NOTES / GOTCHAS ENCOUNTERED

- `cam.pan()` callback with `p === 1` is unreliable when target ≈ current position. Prefer
  `delayedCall(duration)` for timing guarantees; use the pan callback only as a bonus if it fires.
- `runCameraPanBeat` has the same vulnerability — same fix pattern applies.
- Name-slam labels: any `setScrollFactor(0)` object must be positioned with `cam.width/2`,
  `cam.height/2` (screen px), never `cam.midPoint` (world coords).
- `src/data.ts` had one pending change: added `"DRINK THE STEW"` to `LORE_BARKS` array.

---

## KEY FILES

| File | Role |
|------|------|
| `src/game/ChapterScene.ts` | Main scene: beat engine, camera, boss system |
| `src/data/chapters.ts` | All 8 chapters: beats, actors, map configs |
| `src/components/GameLayout.tsx` | Root state machine |
| `src/components/DialogueBox.tsx` | Typewriter dialogue + choices |
| `HANDOFF.md` | Canonical next-steps + asset inventory |
| `VISUAL_OVERHAUL_PLAN.md` | Phase specs |
| `storyboard/storyboard_0-8.txt` | All lore and dialogue source |

---

## ARCHITECTURE REMINDERS

- Depth order: floor −200 · props/chars Y-sorted · overlay 800 · lights 850 · particles 860 ·
  bubble text 2000 · damage numbers 3000 · area title 5000 · vignette 6000 · walk markers 8000 ·
  letterbox 9500 · boss HP 10000–10002 · boss name slam 12000
- `freeze()` = `dialogueOpen=true` + `physics.pause()` (idempotent)
- `unfreeze()` = `dialogueOpen=false` + `physics.resume()`
- Boss fight ends at `bossBeatResolve()` → `advanceBeat()`
- Dev hook: `window.__OMEGA_GAME__.scene.getScene('ChapterScene')`
- Teleport shortcut for testing:
  `s = window.__OMEGA_GAME__.scene.getScene('ChapterScene'); s.player.setPosition(s.walkTarget.x, s.walkTarget.y)`
- Audio assets have spaces/parens in filenames — import via Vite `?url` imports

---

## R18 — INTERACTIVE QA PLAY-THROUGH LOG

| ID | Verification Item | Status | Notes |
|----|-------------------|--------|-------|
| 1  | R1 Props | ✅ Verified | Props load at correct scale across levels (Ch3 hospital, Ch4 jungle gym, Ch6 watchwater house). |
| 2  | R2 Cars | ✅ Verified | Corolla present in Ch2, Mustang & Camaro in Ch5. |
| 3  | R3 Sting→Loop Timing | ⚠️ Not fully tested via headless script | Script did not test audio playback timing. Needs manual audio QA. |
| 4  | R4 NPCs Not Cycling | ✅ Verified | Jordan/Maharko in Ch5 are static on idle frame 0. |
| 5  | R5 Understudy Fills | ✅ Verified | Understudies are present in the map for skipped slots. |
| 6  | R6/R9 UI | ✅ Verified | Pixel panels are consistently applied across the start screen, chapter select, and dialogue. |
| 7  | R10 Fonts | ✅ Verified | Yoster Island font applied globally as seen in HTML and screenshots. |
| 8  | R11 House | ✅ Verified | Ch6 house loads in place of the procedural box. |
| 9  | Letterbox Cleanup | ✅ Verified | Top and bottom letterboxes correctly fade/destroy after intro sequence. |
| 10 | Damage Numbers | ⚠️ Not fully tested via headless script | Did not advance far enough into combat to verify damage numbers. |
| 11 | Victory Jingle | ⚠️ Not fully tested via headless script | Did not complete a boss fight. |
